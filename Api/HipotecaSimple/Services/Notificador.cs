using System.Globalization;
using System.Net;
using System.Text.Json;
using HipotecaSimple.Data;
using HipotecaSimple.Data.Entities;
using Microsoft.EntityFrameworkCore;
using WebPush;

namespace HipotecaSimple.Services
{
    public record AvisoPush(string titulo, string cuerpo, string url, string tag);

    public static class Notificador
    {
        static readonly CultureInfo Es = new CultureInfo("es-DO");

        // Sin seguir redirecciones: un servicio push nunca redirige, y así no se puede desviar el envío a otra dirección
        static readonly HttpClient Http = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false });

        // Solo los servicios push de los navegadores. Evita que alguien registre una URL cualquiera
        // y use el servidor para hacer peticiones a otros sitios o a la red interna (SSRF).
        static readonly string[] HostsExactos = { "fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com" };
        static readonly string[] SufijosHost = { ".push.apple.com", ".notify.windows.com" };

        public static bool EsEndpointValido(string endpoint)
        {
            if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps || !uri.IsDefaultPort)
                return false;
            var host = uri.Host.ToLowerInvariant().TrimEnd('.');
            return HostsExactos.Contains(host) || SufijosHost.Any(s => host.EndsWith(s));
        }

        // Hora de República Dominicana (UTC-4 todo el año, sin horario de verano)
        public static DateTime AhoraRD() => DateTime.UtcNow.AddHours(-4);

        // Mismo criterio que la web: la cuota #1 vence el mes de creación en el día de pago
        public static DateTime Vencimiento(Hipotecas h, int mes)
        {
            int dia = h.HipoDiaPago > 0 ? h.HipoDiaPago : h.HipoFecha.Day;
            // Igual que new Date(año, mes, día) en JS: un día 31 en un mes corto pasa al mes siguiente
            return new DateTime(h.HipoFecha.Year, h.HipoFecha.Month, 1).AddMonths(mes - 1).AddDays(dia - 1);
        }

        // Próxima cuota sin pagar, su vencimiento y su monto con seguros; null si el préstamo ya está saldado
        public static (int mes, DateTime vence, decimal monto)? ProximaCuota(Hipotecas h, List<Pagos> pagos, List<TasasHipoteca> tasas)
        {
            int mes = pagos.Count == 0 ? 1 : pagos.Max(p => p.PagoMesAnticipado) + 1;
            var cuota = Amortizacion.CuotaDelMes(h, pagos, tasas, mes);
            if (cuota == null) return null;
            return (mes, Vencimiento(h, mes), Math.Round((decimal)cuota.Value + h.HipoSeguros, 2));
        }

        public static AvisoPush Recordatorio(Hipotecas h, int mes, DateTime vence, decimal cuota, int dias)
        {
            string banco = Banco(h);
            string monto = cuota.ToString("N2", CultureInfo.InvariantCulture);
            string fecha = vence.ToString("d 'de' MMMM", Es);
            string titulo = dias switch
            {
                5 => "Tu cuota vence en 5 días",
                1 => "Mañana vence tu cuota",
                0 => "Hoy vence tu cuota",
                _ => "Tu cuota está vencida",
            };
            string cuerpo = dias >= 0
                ? $"{banco}: la cuota #{mes} de RD${monto} vence el {fecha}."
                : $"{banco}: la cuota #{mes} de RD${monto} venció el {fecha}. Págala para evitar mora.";
            return new AvisoPush(titulo, cuerpo, $"#/HipotecaDetalle/{h.HipoId}?pagar=1", $"cuota-{h.HipoId}-{mes}");
        }

        // Cuotas en las que el banco puede cambiar la tasa: la primera después del periodo fijo y, si la revisa
        // periódicamente, cada HipoMesesRevision cuotas a partir de ahí
        public static IEnumerable<int> CuotasRevision(Hipotecas h)
        {
            if (h.HipoMesesFijos is not int fijos) yield break;
            int plazo = h.HipoPlazo * 12;
            for (int mes = fijos + 1; mes <= plazo; mes += h.HipoMesesRevision ?? plazo)
                yield return mes;
        }

        // La revisión más reciente que ya está a 30 días o menos y sin tasa registrada desde esa cuota; null si no hay
        public static int? RevisionPendiente(Hipotecas h, List<Pagos> pagos, List<TasasHipoteca> tasas, DateTime hoy)
        {
            int? mes = CuotasRevision(h).Where(m => (Vencimiento(h, m).Date - hoy.Date).Days <= 30).Cast<int?>().LastOrDefault();
            if (mes == null || tasas.Any(t => t.TasaDesdeCuota >= mes)) return null;
            // Si los abonos ya saldaron el préstamo antes de esa cuota, no hay nada que revisar
            return Amortizacion.CuotaDelMes(h, pagos, tasas, mes.Value) == null ? null : mes;
        }

        // Cambio de tasa en la cuota #mes (fin del periodo fijo o revisión periódica). dias = días hasta su vencimiento.
        public static AvisoPush AvisoTasa(Hipotecas h, int mes, DateTime vence, int dias)
        {
            string fecha = vence.ToString("d 'de' MMMM", Es);
            bool primera = mes == h.HipoMesesFijos + 1;
            var (titulo, cuerpo) = (dias > 0, primera) switch
            {
                (true, true) => ("Tu tasa fija termina pronto", $"{Banco(h)}: desde la cuota #{mes} ({fecha}) el banco puede cambiar tu tasa. Cuando te avise la nueva, regístrala para ver tu cuota real."),
                (true, false) => ("Se acerca la revisión de tu tasa", $"{Banco(h)}: el banco revisa tu tasa para la cuota #{mes} ({fecha}). Cuando te avise, registra la nueva (o la misma si no cambió)."),
                (false, true) => ("Registra tu nueva tasa", $"{Banco(h)}: tu tasa fija terminó en la cuota #{mes - 1}. Registra la tasa nueva para que tu cuota y tu saldo cuadren con el banco."),
                (false, false) => ("Registra la tasa de la revisión", $"{Banco(h)}: el banco revisó tu tasa desde la cuota #{mes}. Regístrala (o la misma si no cambió) para que tus números cuadren."),
            };
            return new AvisoPush(titulo, cuerpo, $"#/HipotecaDetalle/{h.HipoId}?tasa=1", $"tasa-{h.HipoId}-{mes}");
        }

        static string Banco(Hipotecas h) => string.IsNullOrWhiteSpace(h.HipoBanco) ? "Tu hipoteca" : h.HipoBanco.Trim();

        // Guarda el aviso en el historial (campana) y lo manda por push a los dispositivos del usuario.
        // Devuelve a cuántos dispositivos llegó (0 si no tiene push activado: igual queda en la campana).
        public static async Task<int> Notificar(ApiContext db, IConfiguration cfg, int usuId, AvisoPush aviso)
        {
            var noti = new Notificaciones { UsuId = usuId, NotiTitulo = aviso.titulo, NotiCuerpo = aviso.cuerpo, NotiUrl = aviso.url, NotiFecha = DateTime.UtcNow };
            db.Notificaciones.Add(noti);
            await db.SaveChangesAsync();
            // En el push va el id, para marcarla como leída al abrirla desde el teléfono
            string url = aviso.url + (aviso.url.Contains('?') ? "&" : "?") + $"noti={noti.NotiId}";
            return await EnviarAUsuario(db, cfg, usuId, aviso with { url = url });
        }

        // Envía el aviso a todos los dispositivos del usuario. Devuelve a cuántos llegó.
        // Los dispositivos que ya no existen (la persona borró la app o quitó el permiso) se eliminan.
        public static async Task<int> EnviarAUsuario(ApiContext db, IConfiguration cfg, int usuId, AvisoPush aviso)
        {
            if (string.IsNullOrEmpty(cfg["Push:PrivateKey"])) return 0;
            var vapid = new VapidDetails(cfg["Push:Subject"], cfg["Push:PublicKey"], cfg["Push:PrivateKey"]);
            var cliente = new WebPushClient(Http);
            string payload = JsonSerializer.Serialize(aviso);
            int enviados = 0;

            var subs = await db.PushSuscripciones.Where(s => s.UsuId == usuId).ToListAsync();
            foreach (var s in subs)
            {
                if (!EsEndpointValido(s.PushEndpoint)) continue;

                try
                {
                    await cliente.SendNotificationAsync(new PushSubscription(s.PushEndpoint, s.PushP256dh, s.PushAuth), payload, vapid);
                    enviados++;
                }
                catch (WebPushException e) when (e.StatusCode == HttpStatusCode.Gone || e.StatusCode == HttpStatusCode.NotFound)
                {
                    db.PushSuscripciones.Remove(s);
                }
                catch (Exception)
                {
                    // Un dispositivo con error (red, servicio caído) no debe impedir avisar a los demás;
                    // como no se registra el envío, se reintenta en la próxima revisión
                }
            }
            await db.SaveChangesAsync();
            return enviados;
        }
    }
}
