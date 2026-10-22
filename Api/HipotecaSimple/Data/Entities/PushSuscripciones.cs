using System.ComponentModel.DataAnnotations;

namespace HipotecaSimple.Data.Entities
{
    // Un dispositivo (teléfono/navegador) que aceptó recibir notificaciones push
    public class PushSuscripciones
    {
        [Key]
        public int PushId { get; set; }
        public int UsuId { get; set; }
        public string PushEndpoint { get; set; } = "";
        public string PushP256dh { get; set; } = "";
        public string PushAuth { get; set; } = "";
        public DateTime PushFecha { get; set; }
    }
}
