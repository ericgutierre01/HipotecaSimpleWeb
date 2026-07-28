using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using HipotecaSimple.Data;
using HipotecaSimple.Data.Entities;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace HipotecaSimple.Controllers
{
    [Route("[controller]")]
    public class UsuariosController : BaseController
    {
        private readonly ApiContext _db;
        public UsuariosController(ApiContext context)
        {
            _db = context;
        }

        [HttpPost("Login")]
        [AllowAnonymous]
        public ActionResult Login([FromBody] LoginViewModel args)
        {
            string Hash = BitConverter.ToString(MD5.Create().ComputeHash(Encoding.UTF8.GetBytes(args.Password)));
            //Hash = Hash.ToString().Replace("-", "");

            var usuario = _db.Usuarios.SingleOrDefault(x => x.UsuSesion.Equals(args.User) &&
            x.UsuPass.Equals(Hash));

            if (usuario == null) return BadRequest("Usuario o contraseña incorrecta!.");

            if (usuario.UsuStatus != 1) return BadRequest("Este usuario no esta activo!.");

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




        [HttpGet("Encryp")]
        [AllowAnonymous]
        public string Encryp(string data)
        {
            return BitConverter.ToString(MD5.Create().ComputeHash(Encoding.UTF8.GetBytes(data)));
        }

    }
}

