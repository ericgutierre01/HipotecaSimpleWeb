using System.ComponentModel.DataAnnotations;

namespace HipotecaSimple.Data.Entities
{
    // Registro de recordatorios ya enviados, para no repetir el mismo aviso de la misma cuota
    public class NotificacionesEnviadas
    {
        [Key]
        public int NotiId { get; set; }
        public int HipoId { get; set; }
        public int NotiMes { get; set; }   // número de cuota
        public int NotiTipo { get; set; }  // días que faltaban: 5, 1, 0 o -1 (vencida); 130/100 = fin de tasa fija (por terminar/terminada)
        public DateTime NotiFecha { get; set; }
    }
}
