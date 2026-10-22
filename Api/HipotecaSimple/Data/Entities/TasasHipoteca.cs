using System.ComponentModel.DataAnnotations;

namespace HipotecaSimple.Data.Entities
{
    // Cambio de tasa: desde la cuota TasaDesdeCuota el préstamo paga TasaValor (% anual)
    public class TasasHipoteca
    {
        [Key]
        public int TasaId { get; set; }
        public int HipoId { get; set; }
        public int TasaDesdeCuota { get; set; }
        public decimal TasaValor { get; set; }
        public DateTime TasaFecha { get; set; }
    }
}
