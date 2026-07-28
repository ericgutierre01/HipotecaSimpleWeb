using System;
using System.ComponentModel.DataAnnotations;

namespace HipotecaSimple.Data.Entities
{
    public class Pagos
    {
        [Key]
        public int PagoId { get; set; }
        public int HipoId { get; set; }
        public DateTime PagoFecha { get; set; }
        public decimal PagoMonto { get; set; }
        public decimal PagoMontoAnticipado { get; set; }
        public int PagoMesAnticipado { get; set; }
    }

}

