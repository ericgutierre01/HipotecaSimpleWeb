using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HipotecaSimple.Data.Entities
{
    public class Usuarios
    {
        [Key]
        public int UsuID { get; set; }
        public short UsuStatus { get; set; }
        public string UsuNombre { get; set; }
        public string UsuSesion { get; set; }
        public string UsuPass { get; set; }
        public string UsuPermisos { get; set; }
        public DateTime UsuFechaCreacion { get; set; }

        [NotMapped]
        public string Token { get; set; }
    }
}

