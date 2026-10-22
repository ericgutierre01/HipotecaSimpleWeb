using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HipotecaSimple.Data.Entities
{
    public class Hipotecas
    {
        [Key]
        public int HipoId { get; set; }
        public decimal HipoInteres { get; set; }
        public int HipoPlazo { get; set; }
        public decimal HipoMonto { get; set; }
        public decimal HipoSeguros { get; set; }
        public decimal HipoCuota { get; set; }
        public decimal HipoCuotaTotal { get; set; }
        public int UsuId { get; set; }
        public DateTime HipoFecha { get; set; }
        public int HipoDiaPago { get; set; }
        public string HipoBanco { get; set; }
        // false = el banco solo acepta abonos en cuotas completas; true = acepta cualquier monto
        public bool HipoAbonoLibre { get; set; }
        // Meses de tasa fija desde el inicio (null = fija todo el plazo). Ej.: 36 = desde la cuota #37 la tasa es variable
        public int? HipoMesesFijos { get; set; }
        // Después del periodo fijo, cada cuántos meses revisa el banco la tasa (null = no se revisa). Ej.: 6 = cada semestre
        public int? HipoMesesRevision { get; set; }
        // false = los abonos reducen el plazo; true = reducen la cuota
        public bool HipoReduceCuota { get; set; }


        [NotMapped]
        public List<Pagos> Pagos { get; set; }
        [NotMapped]
        public List<TasasHipoteca> Tasas { get; set; }
    }

}

