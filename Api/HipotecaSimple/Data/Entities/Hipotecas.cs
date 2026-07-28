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


        [NotMapped]
        public List<Pagos> Pagos { get; set; }
    }

}

