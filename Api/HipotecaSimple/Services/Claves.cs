using System.Security.Cryptography;
using System.Text;
using HipotecaSimple.Data.Entities;
using Microsoft.AspNetCore.Identity;

namespace HipotecaSimple.Services
{
    // Contraseñas: las nuevas se guardan con PBKDF2 con sal (PasswordHasher de ASP.NET Core).
    // Las antiguas (MD5 con guiones, 47 caracteres) se siguen aceptando y se convierten al iniciar sesión.
    public static class Claves
    {
        static readonly PasswordHasher<Usuarios> Hasher = new();

        public static string Hash(string clave) => Hasher.HashPassword(null!, clave);

        public static bool EsAntigua(string guardada) =>
            guardada.Length == 47 && guardada[2] == '-' && guardada.Replace("-", "").All(Uri.IsHexDigit);

        public static bool Verificar(string guardada, string clave)
        {
            if (string.IsNullOrEmpty(guardada)) return false;
            if (EsAntigua(guardada))
            {
                var md5 = BitConverter.ToString(MD5.HashData(Encoding.UTF8.GetBytes(clave)));
                return CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(md5), Encoding.ASCII.GetBytes(guardada));
            }
            try { return Hasher.VerifyHashedPassword(null!, guardada, clave) != PasswordVerificationResult.Failed; }
            catch (FormatException) { return false; }
        }
    }
}
