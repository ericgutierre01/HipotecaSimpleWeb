using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.Net.Mail;
using System.Text.Encodings.Web;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using HipotecaSimple.Data;
using HipotecaSimple.Data.Entities;
using HipotecaSimple.Services;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace HipotecaSimple.Controllers
{
    [Route("[controller]")]
    public class UsuariosController : BaseController
    {
        // Estados de UsuStatus
        const short Activo = 1, Pendiente = 2;

        private readonly ApiContext _db;
        private readonly IConfiguration _cfg;
        private readonly Correo _correo;
        public UsuariosController(ApiContext context, IConfiguration cfg, Correo correo)
        {
            _db = context;
            _cfg = cfg;
            _correo = correo;
        }

        private static string HashClave(string clave) => Claves.Hash(clave);

        [HttpPost("Login")]
        [AllowAnonymous]
        public ActionResult Login([FromBody] LoginViewModel args)
        {
            var usuario = _db.Usuarios.FirstOrDefault(x => x.UsuSesion.Equals(args.User));
            if (usuario == null || !Claves.Verificar(usuario.UsuPass, args.Password ?? "")) return BadRequest("Usuario o contraseña incorrecta!.");

            // Contraseña antigua (MD5): se reemplaza por PBKDF2 ahora que la conocemos
            if (Claves.EsAntigua(usuario.UsuPass))
            {
                usuario.UsuPass = Claves.Hash(args.Password!);
                _db.SaveChanges();
            }

            if (usuario.UsuStatus == Pendiente) return BadRequest("Tu cuenta aún no ha sido aprobada. Te avisaremos por correo.");
            if (usuario.UsuStatus != Activo) return BadRequest("Este usuario no esta activo!.");

            usuario.UsuPass = "";
            usuario.Token = GenerateToken(usuario);

            return Ok(usuario);
        }

        private string GenerateToken(Usuarios args)
        {
            //Generar Token 
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes("Rb2_R1hOETT3GJtkXmHHipotecaSimplesLD5NtIqVxpUjFz_i0x_gSPXrD");
            var tokenExpires = DateTime.UtcNow.AddMonths(1);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new Claim[] {
                    new Claim(ClaimTypes.NameIdentifier, args.UsuID.ToString())

                }),
                Expires = tokenExpires,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);

            return tokenHandler.WriteToken(token);

        }

        [HttpGet("IsLoging")]
        public ActionResult<string> IsLoging()
        {
            try
            {
                return Ok("Logueado");
            }
            catch (Exception e)
            {
                return BadRequest(e.InnerException != null ? e.InnerException.Message : e.Message);
            }

        }




        // ================= Registro con aprobación por correo =================

        public class RegistroModel
        {
            public string Nombre { get; set; } = "";
            public string Usuario { get; set; } = "";
            public string Email { get; set; } = "";
            public string Password { get; set; } = "";
        }

        [HttpPost("Registro")]
        [AllowAnonymous]
        public async Task<ActionResult<string>> Registro([FromBody] RegistroModel m)
        {
            string nombre = m.Nombre.Trim(), usuario = m.Usuario.Trim(), email = m.Email.Trim().ToLowerInvariant();
            string? error =
                nombre.Length < 2 || nombre.Length > 100 ? "Escribe tu nombre." :
                !Regex.IsMatch(usuario, "^[A-Za-z0-9._-]{3,50}$") ? "El usuario debe tener de 3 a 50 caracteres: letras, números, punto, guion o guion bajo." :
                !EmailValido(email) ? "Escribe un correo válido." :
                m.Password.Length < 8 ? "La contraseña debe tener al menos 8 caracteres." : null;
            if (error != null) return BadRequest(error);

            if (await _db.Usuarios.AnyAsync(u => u.UsuSesion == usuario)) return BadRequest("Ese usuario ya existe. Elige otro.");
            if (await _db.Usuarios.AnyAsync(u => u.UsuEmail == email)) return BadRequest("Ya hay una cuenta con ese correo. Si es tuya, recupera tu contraseña.");

            var nuevo = new Usuarios
            {
                UsuNombre = nombre,
                UsuSesion = usuario,
                UsuEmail = email,
                UsuPass = HashClave(m.Password),
                UsuStatus = Pendiente,
                UsuPermisos = "1",
                UsuFechaCreacion = DateTime.Now,
            };
            _db.Usuarios.Add(nuevo);
            await _db.SaveChangesAsync();

            var token = await CrearToken(nuevo.UsuID, "aprobar", TimeSpan.FromDays(7));
            string revisar = $"{_cfg["App:ApiUrl"]}/Usuarios/Aprobar?token={token}";
            await _correo.Enviar(_cfg["App:AdminEmail"]!, $"Nueva solicitud de acceso: {nombre}", Correo.Plantilla(
                "Nueva solicitud de acceso",
                new[] { $"Nombre: {nombre}", $"Usuario: {usuario}", $"Correo: {email}", "Revisa la solicitud para aprobarla o rechazarla. El enlace vence en 7 días." },
                "Revisar solicitud", revisar));
            await _correo.Enviar(email, "Recibimos tu solicitud", Correo.Plantilla(
                $"Hola, {nombre}",
                new[] { "Recibimos tu solicitud para usar Hipoteca Simple.", "Te avisaremos por este correo en cuanto sea aprobada." }));

            return Ok("Solicitud enviada");
        }

        // Página de confirmación: un GET no aprueba nada (los antivirus de correo abren los enlaces solos)
        [HttpGet("Aprobar")]
        [AllowAnonymous]
        public async Task<ContentResult> AprobarPagina(string token)
        {
            var (tok, usuario) = await BuscarToken(token, "aprobar");
            if (tok == null || usuario == null || usuario.UsuStatus != Pendiente)
                return Pagina("Enlace no válido", "Esta solicitud ya fue atendida o el enlace venció.");

            var h = HtmlEncoder.Default;
            return Pagina("Solicitud de acceso", $@"
<p><strong>{h.Encode(usuario.UsuNombre)}</strong> ({h.Encode(usuario.UsuSesion)}) — {h.Encode(usuario.UsuEmail ?? "")}</p>
<p>Solicitó el {usuario.UsuFechaCreacion:dd/MM/yyyy HH:mm}.</p>
<form method=""post"" action=""Aprobar"" style=""display:flex;gap:10px;margin-top:20px"">
  <input type=""hidden"" name=""token"" value=""{h.Encode(token)}"">
  <button name=""accion"" value=""aprobar"" style=""flex:1;padding:14px;border:0;border-radius:12px;background:#1B75BC;color:#fff;font-weight:700;font-size:15px"">Aprobar acceso</button>
  <button name=""accion"" value=""rechazar"" style=""flex:1;padding:14px;border:1px solid #D5DDE8;border-radius:12px;background:#fff;color:#B42318;font-weight:700;font-size:15px"">Rechazar</button>
</form>", html: true);
        }

        [HttpPost("Aprobar")]
        [AllowAnonymous]
        public async Task<ContentResult> Aprobar([FromForm] string token, [FromForm] string accion)
        {
            var (tok, usuario) = await BuscarToken(token, "aprobar");
            if (tok == null || usuario == null || usuario.UsuStatus != Pendiente)
                return Pagina("Enlace no válido", "Esta solicitud ya fue atendida o el enlace venció.");

            tok.TokUsado = true;
            if (accion == "rechazar")
            {
                // Solicitud rechazada: se borra la cuenta pendiente (nunca tuvo datos) para liberar el usuario y el correo
                _db.UsuarioTokens.RemoveRange(_db.UsuarioTokens.Where(t => t.UsuId == usuario.UsuID));
                _db.Usuarios.Remove(usuario);
                await _db.SaveChangesAsync();
                return Pagina("Solicitud rechazada", $"La cuenta de {usuario.UsuNombre} no fue creada.");
            }

            usuario.UsuStatus = Activo;
            await _db.SaveChangesAsync();
            if (!string.IsNullOrEmpty(usuario.UsuEmail))
                await _correo.Enviar(usuario.UsuEmail, "Tu cuenta fue aprobada", Correo.Plantilla(
                    $"¡Bienvenido, {usuario.UsuNombre}!",
                    new[] { "Tu cuenta de Hipoteca Simple ya está activa.", $"Entra con tu usuario: {usuario.UsuSesion}" },
                    "Iniciar sesión", $"{_cfg["App:WebUrl"]}#/Login"));
            return Pagina("Acceso aprobado", $"{usuario.UsuNombre} ya puede iniciar sesión. Le avisamos por correo.");
        }

        // ================= Recuperar contraseña =================

        public class RecuperarModel { public string Email { get; set; } = ""; }

        [HttpPost("Recuperar")]
        [AllowAnonymous]
        public async Task<ActionResult<string>> Recuperar([FromBody] RecuperarModel m)
        {
            // Siempre la misma respuesta: no se revela si un correo está registrado
            const string respuesta = "Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña.";
            string email = m.Email.Trim().ToLowerInvariant();
            var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.UsuEmail == email && u.UsuStatus == Activo);
            if (usuario == null) return Ok(respuesta);

            // Un enlace cada 2 minutos como máximo, para que no se pueda llenar el correo de alguien
            var hace2min = DateTime.UtcNow.AddMinutes(-2);
            if (await _db.UsuarioTokens.AnyAsync(t => t.UsuId == usuario.UsuID && t.TokTipo == "reset" && t.TokFecha > hace2min))
                return Ok(respuesta);

            var token = await CrearToken(usuario.UsuID, "reset", TimeSpan.FromHours(1));
            await _correo.Enviar(email, "Restablece tu contraseña", Correo.Plantilla(
                "Restablece tu contraseña",
                new[] { $"Hola, {usuario.UsuNombre}. Pediste crear una nueva contraseña para tu usuario {usuario.UsuSesion}.", "El enlace vence en 1 hora. Si no fuiste tú, ignora este correo." },
                "Crear nueva contraseña", $"{_cfg["App:WebUrl"]}#/Restablecer?token={token}"));
            return Ok(respuesta);
        }

        public class RestablecerModel
        {
            public string Token { get; set; } = "";
            public string Password { get; set; } = "";
        }

        [HttpPost("Restablecer")]
        [AllowAnonymous]
        public async Task<ActionResult<string>> Restablecer([FromBody] RestablecerModel m)
        {
            if (m.Password.Length < 8) return BadRequest("La contraseña debe tener al menos 8 caracteres.");
            var (tok, usuario) = await BuscarToken(m.Token, "reset");
            if (tok == null || usuario == null || usuario.UsuStatus != Activo)
                return BadRequest("El enlace venció o ya se usó. Pide uno nuevo.");

            usuario.UsuPass = HashClave(m.Password);
            // Usar un enlace invalida también los demás enlaces de recuperación pendientes
            foreach (var t in _db.UsuarioTokens.Where(t => t.UsuId == usuario.UsuID && t.TokTipo == "reset" && !t.TokUsado)) t.TokUsado = true;
            tok.TokUsado = true;
            await _db.SaveChangesAsync();
            return Ok("Contraseña actualizada");
        }

        // ================= Perfil (requiere sesión) =================

        public class PerfilModel
        {
            public string Nombre { get; set; } = "";
            public string Email { get; set; } = "";
        }

        [HttpGet("Perfil")]
        public async Task<ActionResult> Perfil()
        {
            var u = await _db.Usuarios.FindAsync(UsuId);
            if (u == null) return NotFound();
            return Ok(new { usuNombre = u.UsuNombre, usuSesion = u.UsuSesion, usuEmail = u.UsuEmail ?? "" });
        }

        [HttpPost("Perfil")]
        public async Task<ActionResult<string>> GuardarPerfil([FromBody] PerfilModel m)
        {
            string nombre = m.Nombre.Trim(), email = m.Email.Trim().ToLowerInvariant();
            if (nombre.Length < 2 || nombre.Length > 100) return BadRequest("Escribe tu nombre.");
            if (!EmailValido(email)) return BadRequest("Escribe un correo válido.");
            if (await _db.Usuarios.AnyAsync(u => u.UsuEmail == email && u.UsuID != UsuId)) return BadRequest("Ese correo ya lo usa otra cuenta.");

            var usuario = await _db.Usuarios.FindAsync(UsuId);
            if (usuario == null) return NotFound();
            usuario.UsuNombre = nombre;
            usuario.UsuEmail = email;
            await _db.SaveChangesAsync();
            return Ok("Perfil actualizado");
        }

        public class CambiarClaveModel
        {
            public string Actual { get; set; } = "";
            public string Nueva { get; set; } = "";
        }

        [HttpPost("CambiarClave")]
        public async Task<ActionResult<string>> CambiarClave([FromBody] CambiarClaveModel m)
        {
            var usuario = await _db.Usuarios.FindAsync(UsuId);
            if (usuario == null) return NotFound();
            if (!Claves.Verificar(usuario.UsuPass, m.Actual)) return BadRequest("La contraseña actual no es correcta.");
            if (m.Nueva.Length < 8) return BadRequest("La nueva contraseña debe tener al menos 8 caracteres.");
            usuario.UsuPass = HashClave(m.Nueva);
            await _db.SaveChangesAsync();
            return Ok("Contraseña actualizada");
        }

        // ================= Utilidades =================

        private static bool EmailValido(string email) =>
            email.Length <= 200 && MailAddress.TryCreate(email, out var a) && a.Address == email && email.Contains('.');

        private static string HashToken(string token) =>
            Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

        // Crea un enlace aleatorio de un solo uso y devuelve el valor que va en el correo
        private async Task<string> CrearToken(int usuId, string tipo, TimeSpan vigencia)
        {
            string token = Base64UrlEncoder.Encode(RandomNumberGenerator.GetBytes(32));
            _db.UsuarioTokens.Add(new UsuarioTokens
            {
                UsuId = usuId,
                TokHash = HashToken(token),
                TokTipo = tipo,
                TokExpira = DateTime.UtcNow.Add(vigencia),
                TokFecha = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            return token;
        }

        private async Task<(UsuarioTokens?, Usuarios?)> BuscarToken(string token, string tipo)
        {
            if (string.IsNullOrEmpty(token)) return (null, null);
            string hash = HashToken(token);
            var tok = await _db.UsuarioTokens.FirstOrDefaultAsync(t => t.TokHash == hash && t.TokTipo == tipo && !t.TokUsado && t.TokExpira > DateTime.UtcNow);
            if (tok == null) return (null, null);
            return (tok, await _db.Usuarios.FindAsync(tok.UsuId));
        }

        private static ContentResult Pagina(string titulo, string contenido, bool html = false)
        {
            var h = HtmlEncoder.Default;
            string cuerpo = html ? contenido : $"<p>{h.Encode(contenido)}</p>";
            return new ContentResult
            {
                ContentType = "text/html; charset=utf-8",
                Content = $@"<!doctype html><html lang=""es""><head><meta charset=""utf-8""><meta name=""viewport"" content=""width=device-width,initial-scale=1""><title>{h.Encode(titulo)}</title></head>
<body style=""margin:0;background:#F3F5F9;font-family:Helvetica,Arial,sans-serif;color:#0F1B2D"">
<div style=""max-width:460px;margin:48px auto;background:#fff;border:1px solid #E3E8F0;border-radius:20px;padding:28px"">
<div style=""font-size:13px;font-weight:700;color:#1B75BC"">Hipoteca Simple</div>
<h1 style=""font-size:22px;margin:8px 0 16px"">{h.Encode(titulo)}</h1>{cuerpo}</div></body></html>",
            };
        }

    }
}

