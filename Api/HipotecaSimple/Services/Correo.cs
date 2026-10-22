using System.Net;
using System.Net.Mail;
using System.Text.Encodings.Web;

namespace HipotecaSimple.Services
{
    // Envío de correos por SMTP (Gmail). Sin contraseña configurada, el correo se escribe en el log
    // para poder probar en local sin enviar nada.
    public class Correo
    {
        private readonly IConfiguration _cfg;
        private readonly ILogger<Correo> _log;

        public Correo(IConfiguration cfg, ILogger<Correo> log)
        {
            _cfg = cfg;
            _log = log;
        }

        // Devuelve false si no se pudo enviar (el error queda en el log)
        public async Task<bool> Enviar(string para, string asunto, string html)
        {
            if (string.IsNullOrEmpty(_cfg["Smtp:Password"]))
            {
                _log.LogWarning("SMTP sin contraseña: correo NO enviado.\nPara: {Para}\nAsunto: {Asunto}\n{Html}", para, asunto, html);
                return false;
            }
            try
            {
                using var smtp = new SmtpClient(_cfg["Smtp:Host"], int.Parse(_cfg["Smtp:Port"] ?? "587"))
                {
                    EnableSsl = true,
                    Credentials = new NetworkCredential(_cfg["Smtp:User"], _cfg["Smtp:Password"]),
                };
                using var msg = new MailMessage(new MailAddress(_cfg["Smtp:From"]!, _cfg["Smtp:FromName"]), new MailAddress(para))
                {
                    Subject = asunto,
                    Body = html,
                    IsBodyHtml = true,
                };
                await smtp.SendMailAsync(msg);
                return true;
            }
            catch (Exception e)
            {
                _log.LogError(e, "No se pudo enviar el correo a {Para}", para);
                return false;
            }
        }

        // Plantilla HTML simple con los colores de la app. Los textos se escapan aquí (vienen de usuarios).
        public static string Plantilla(string titulo, IEnumerable<string> parrafos, string? boton = null, string? url = null)
        {
            var h = HtmlEncoder.Default;
            var cuerpo = string.Concat(parrafos.Select(p =>
                $"<p style=\"margin:0 0 14px;font-size:15px;line-height:1.55;color:#3C4B61\">{h.Encode(p)}</p>"));
            var cta = boton != null && url != null
                ? $"<a href=\"{h.Encode(url)}\" style=\"display:inline-block;margin-top:8px;background:#1B75BC;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 22px;border-radius:12px\">{h.Encode(boton)}</a>"
                : "";
            return $@"<div style=""background:#F3F5F9;padding:32px 16px;font-family:Helvetica,Arial,sans-serif"">
  <div style=""max-width:480px;margin:0 auto;background:#fff;border-radius:20px;padding:28px;border:1px solid #E3E8F0"">
    <div style=""font-size:13px;font-weight:700;color:#1B75BC;margin-bottom:8px"">Hipoteca Simple</div>
    <h1 style=""margin:0 0 16px;font-size:22px;color:#0F1B2D"">{h.Encode(titulo)}</h1>
    {cuerpo}{cta}
  </div>
</div>";
        }
    }
}
