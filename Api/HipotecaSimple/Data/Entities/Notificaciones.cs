using System.ComponentModel.DataAnnotations;

namespace HipotecaSimple.Data.Entities
{
    // Historial de notificaciones que el usuario ve en la campana (existan o no dispositivos con push)
    public class Notificaciones
    {
        [Key]
        public int NotiId { get; set; }
        public int UsuId { get; set; }
        public string NotiTitulo { get; set; } = "";
        public string NotiCuerpo { get; set; } = "";
        public string NotiUrl { get; set; } = "";
        public bool NotiLeida { get; set; }
        public DateTime NotiFecha { get; set; }
    }
}
