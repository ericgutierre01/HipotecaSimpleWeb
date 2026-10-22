using HipotecaSimple.Data.Entities;

namespace HipotecaSimple.Services
{
    // Mismo cálculo que la web (Web/src/app/services/amortizacion.ts), solo la parte que necesita el API:
    // cuánto es la cuota de un mes, con los cambios de tasa y los abonos a capital ya registrados.
    public static class Amortizacion
    {
        public static double Pmt(double saldo, double tasaAnual, int meses)
        {
            double r = tasaAnual / 12 / 100;
            return r == 0 ? saldo / meses : saldo * r / (1 - Math.Pow(1 + r, -meses));
        }

        // Cuotas que faltan para saldar ese saldo pagando esa cuota a esa tasa (la última puede ser menor)
        public static int MesesRestantes(double saldo, double tasaAnual, double cuota, int maximo)
        {
            double r = tasaAnual / 12 / 100;
            double x = r == 0 ? saldo / cuota : -Math.Log(1 - saldo * r / cuota) / Math.Log(1 + r);
            if (double.IsNaN(x) || double.IsInfinity(x)) return maximo;
            return Math.Clamp((int)Math.Ceiling(x - 1e-6), 1, maximo);
        }

        // Tasa de la cuota mes: la del último cambio desde esa cuota o antes; si no hay, la del contrato
        public static double TasaDelMes(Hipotecas h, List<TasasHipoteca> tasas, int mes) =>
            (double)(tasas.Where(t => t.TasaDesdeCuota <= mes).OrderBy(t => t.TasaDesdeCuota).LastOrDefault()?.TasaValor ?? h.HipoInteres);

        // Cuota (sin seguros) del mes indicado; null si el préstamo queda saldado antes o el mes está fuera del plazo.
        // Al cambiar la tasa la cuota se recalcula con el saldo y las cuotas que faltan (si los abonos ya acortaron
        // el plazo, se respeta el plazo acortado). Un abono que reduce la cuota la recalcula para terminar en la misma fecha.
        public static double? CuotaDelMes(Hipotecas h, List<Pagos> pagos, List<TasasHipoteca> tasas, int mesObjetivo)
        {
            int plazo = h.HipoPlazo * 12;
            double saldo = (double)h.HipoMonto;
            double tasa = (double)h.HipoInteres;
            double cuota = Pmt(saldo, tasa, plazo);

            for (int mes = 1; mes <= plazo && mes <= mesObjetivo; mes++)
            {
                double nueva = TasaDelMes(h, tasas, mes);
                if (nueva != tasa)
                {
                    cuota = Pmt(saldo, nueva, MesesRestantes(saldo, tasa, cuota, plazo - mes + 1));
                    tasa = nueva;
                }
                if (mes == mesObjetivo) return cuota;

                saldo -= cuota - saldo * tasa / 1200;
                var abonos = pagos.Where(p => p.PagoMesAnticipado == mes && p.PagoMontoAnticipado > 0).ToList();
                double extra = abonos.Sum(p => (double)p.PagoMontoAnticipado);
                if (extra > 0)
                {
                    // Cuotas que quedaban antes del abono: reducir la cuota mantiene esa fecha final
                    int quedan = mes < plazo ? MesesRestantes(saldo, tasa, cuota, plazo - mes) : 0;
                    saldo -= extra;
                    if (abonos.Any(p => p.PagoReduceCuota) && saldo > 0 && quedan > 0) cuota = Pmt(saldo, tasa, quedan);
                }
                if (saldo <= 0.01) return null;
            }
            return null;
        }
    }
}
