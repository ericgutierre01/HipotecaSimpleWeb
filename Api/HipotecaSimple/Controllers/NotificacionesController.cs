using HipotecaSimple.Data;
using HipotecaSimple.Data.Entities;
using HipotecaSimple.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HipotecaSimple.Controllers
{
    public class SuscripcionModel
    {
        public string Endpoint { get; set; } = "";
        public string P256dh { get; set; } = "";
        public string Auth { get; set; } = "";
    }

    [Route("[controller]")]
    public class NotificacionesController : BaseController
    {
        private readonly ApiContext _db;
        private readonly IConfiguration _cfg;

        public NotificacionesController(ApiContext context, IConfiguration cfg)
        {
            _db = context;
            _cfg = cfg;
        }

        // Clave pública VAPID que el navegador necesita para suscribirse (no es secreta)
        [HttpGet("ClavePublica")]
        [AllowAnonymous]
        public ActionResult<string> ClavePublica()
        {
            var clave = _cfg["Push:PublicKey"];
            return string.IsNullOrEmpty(clave) ? BadRequest("Notificaciones no configuradas en el servidor") : Ok(clave);
        }

        [HttpPost("Suscribir")]
        public async Task<ActionResult<string>> Suscribir([FromBody] SuscripcionModel model)
        {
            if (!Notificador.EsEndpointValido(model.Endpoint)
                || string.IsNullOrWhiteSpace(model.P256dh) || string.IsNullOrWhiteSpace(model.Auth))
                return BadRequest("Suscripción inválida");

            // El mismo dispositivo puede volver a suscribirse (o cambiar de usuario): se actualiza
            var sub = await _db.PushSuscripciones.SingleOrDefaultAsync(s => s.PushEndpoint == model.Endpoint);
            if (sub == null)
            {
                sub = new PushSuscripciones { PushEndpoint = model.Endpoint };
                _db.PushSuscripciones.Add(sub);
            }
            sub.UsuId = UsuId;
            sub.PushP256dh = model.P256dh;
            sub.PushAuth = model.Auth;
            sub.PushFecha = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok("Notificaciones activadas");
        }

        [HttpPost("Desuscribir")]
        public async Task<ActionResult<string>> Desuscribir([FromBody] SuscripcionModel model)
        {
            var sub = await _db.PushSuscripciones.SingleOrDefaultAsync(s => s.PushEndpoint == model.Endpoint && s.UsuId == UsuId);
            if (sub != null)
            {
                _db.PushSuscripciones.Remove(sub);
                await _db.SaveChangesAsync();
            }
            return Ok("Notificaciones desactivadas");
        }

        // Envía un aviso de prueba a los dispositivos del usuario, con el botón "Pagar ahora" del primer préstamo
        [HttpPost("Prueba")]
        public async Task<ActionResult<string>> Prueba()
        {
            if (!await _db.PushSuscripciones.AnyAsync(s => s.UsuId == UsuId))
                return BadRequest("No hay dispositivos con notificaciones activadas");

            var hipoteca = await _db.Hipotecas.Where(h => h.UsuId == UsuId).OrderByDescending(h => h.HipoFecha).FirstOrDefaultAsync();
            var aviso = new AvisoPush(
                "¡Recordatorios activados!",
                "Te avisaremos 5 días antes, un día antes y el día que vence tu cuota.",
                hipoteca != null ? $"#/HipotecaDetalle/{hipoteca.HipoId}?pagar=1" : "#/",
                "prueba");
            int enviados = await Notificador.Notificar(_db, _cfg, UsuId, aviso);
            return enviados > 0 ? Ok($"Enviada a {enviados} dispositivo(s)") : BadRequest("No se pudo entregar a ningún dispositivo");
        }

        // ---------- Historial (campana) ----------

        [HttpGet("Lista")]
        public async Task<ActionResult> Lista()
        {
            var items = await _db.Notificaciones.Where(n => n.UsuId == UsuId)
                .OrderByDescending(n => n.NotiFecha).Take(50)
                .Select(n => new { id = n.NotiId, titulo = n.NotiTitulo, cuerpo = n.NotiCuerpo, url = n.NotiUrl, leida = n.NotiLeida, fecha = n.NotiFecha })
                .ToListAsync();
            int noLeidas = await _db.Notificaciones.CountAsync(n => n.UsuId == UsuId && !n.NotiLeida);
            return Ok(new { noLeidas, items });
        }

        [HttpPost("Leer/{id}")]
        public async Task<ActionResult<string>> Leer(int id)
        {
            var noti = await _db.Notificaciones.SingleOrDefaultAsync(n => n.NotiId == id && n.UsuId == UsuId);
            if (noti != null && !noti.NotiLeida)
            {
                noti.NotiLeida = true;
                await _db.SaveChangesAsync();
            }
            return Ok("Leída");
        }

        [HttpPost("LeerTodas")]
        public async Task<ActionResult<string>> LeerTodas()
        {
            var pendientes = await _db.Notificaciones.Where(n => n.UsuId == UsuId && !n.NotiLeida).ToListAsync();
            pendientes.ForEach(n => n.NotiLeida = true);
            await _db.SaveChangesAsync();
            return Ok("Todas leídas");
        }
    }
}
