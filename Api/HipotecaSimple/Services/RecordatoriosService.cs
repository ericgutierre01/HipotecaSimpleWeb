using HipotecaSimple.Data;
using HipotecaSimple.Data.Entities;
using Microsoft.EntityFrameworkCore;

namespace HipotecaSimple.Services
{
    // Cada 15 minutos revisa las cuotas por vencer y crea los recordatorios (de 9:00 a 21:00, hora RD):
    // quedan en la campana de la app y, si el usuario activó el push, llegan también al teléfono.
    // Cada aviso (préstamo + cuota + tipo) se envía una sola vez gracias a NotificacionesEnviadas.
    public class RecordatoriosService : BackgroundService
    {
        static readonly int[] DiasAviso = { 5, 1, 0, -1 };
        // NotiTipo de los avisos de cambio de tasa (los de cuota usan los días: 5, 1, 0, -1)
        const int TasaPorTerminar = 130, TasaTerminada = 100;

        private readonly IServiceScopeFactory _scopes;
        private readonly IConfiguration _cfg;
        private readonly ILogger<RecordatoriosService> _log;

        public RecordatoriosService(IServiceScopeFactory scopes, IConfiguration cfg, ILogger<RecordatoriosService> log)
        {
            _scopes = scopes;
            _cfg = cfg;
            _log = log;
        }

        protected override async Task ExecuteAsync(CancellationToken stop)
        {
            if (string.IsNullOrEmpty(_cfg["Push:PrivateKey"]))
                _log.LogWarning("Sin claves Push en appsettings.json: los recordatorios solo se guardan en la campana");

            using var timer = new PeriodicTimer(TimeSpan.FromMinutes(15));
            do
            {
                try { await Revisar(); }
                catch (Exception e) { _log.LogError(e, "Error enviando recordatorios"); }
            } while (await timer.WaitForNextTickAsync(stop));
        }

        public async Task Revisar()
        {
            var ahora = Notificador.AhoraRD();
            if (ahora.Hour < 9 || ahora.Hour >= 21) return;

            using var scope = _scopes.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApiContext>();

            // Todos los préstamos: el aviso queda en la campana aunque el usuario no haya activado el push
            var hipotecas = await db.Hipotecas.ToListAsync();

            foreach (var h in hipotecas)
            {
                var pagos = await db.Pagos.Where(p => p.HipoId == h.HipoId).ToListAsync();
                var tasas = await db.TasasHipoteca.Where(t => t.HipoId == h.HipoId).ToListAsync();
                var proxima = Notificador.ProximaCuota(h, pagos, tasas);
                if (proxima == null) continue;

                var (mes, vence, cuota) = proxima.Value;
                int dias = (vence.Date - ahora.Date).Days;
                if (DiasAviso.Contains(dias))
                    await Avisar(db, h, mes, dias, Notificador.Recordatorio(h, mes, vence, cuota, dias));

                // Fin de la tasa fija y cada revisión: se avisa una vez dentro de los 30 días previos (el banco
                // notifica el cambio con 30 días) y otra al llegar, mientras no se registre la tasa desde esa cuota
                if (Notificador.RevisionPendiente(h, pagos, tasas, ahora) is int revision)
                {
                    var venceRevision = Notificador.Vencimiento(h, revision);
                    int faltan = (venceRevision.Date - ahora.Date).Days;
                    await Avisar(db, h, revision, faltan > 0 ? TasaPorTerminar : TasaTerminada, Notificador.AvisoTasa(h, revision, venceRevision, faltan));
                }
            }
        }

        // Cada aviso (préstamo + cuota + tipo) sale una sola vez
        async Task Avisar(ApiContext db, Hipotecas h, int mes, int tipo, AvisoPush aviso)
        {
            if (await db.NotificacionesEnviadas.AnyAsync(n => n.HipoId == h.HipoId && n.NotiMes == mes && n.NotiTipo == tipo)) return;

            // El control de duplicados se guarda junto con el aviso (Notificar guarda los dos a la vez)
            db.NotificacionesEnviadas.Add(new NotificacionesEnviadas { HipoId = h.HipoId, NotiMes = mes, NotiTipo = tipo, NotiFecha = DateTime.UtcNow });
            int enviados = await Notificador.Notificar(db, _cfg, h.UsuId, aviso);
            _log.LogInformation("Aviso: hipoteca {HipoId}, cuota {Mes}, tipo {Tipo}, push a {Enviados} dispositivo(s)", h.HipoId, mes, tipo, enviados);
        }
    }
}
