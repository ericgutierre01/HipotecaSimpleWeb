using System.ComponentModel.DataAnnotations;

namespace HipotecaSimple.Data.Entities
{
    // Enlace de un solo uso enviado por correo ('reset' o 'aprobar'). Solo se guarda su hash.
    public class UsuarioTokens
    {
        [Key]
        public int TokId { get; set; }
        public int UsuId { get; set; }
        public string TokHash { get; set; } = "";
        public string TokTipo { get; set; } = "";
        public DateTime TokExpira { get; set; }
        public bool TokUsado { get; set; }
        public DateTime TokFecha { get; set; }
    }
}
