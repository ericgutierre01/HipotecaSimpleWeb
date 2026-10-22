using HipotecaSimple.Data;
using HipotecaSimple.Data.Entities;
using HipotecaSimple.Services;
using System.Globalization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

// For more information on enabling Web API for empty projects, visit https://go.microsoft.com/fwlink/?LinkID=397860

namespace HipotecaSimple.Controllers
{
    [Route("[controller]")]
    public class HipotecaController : BaseController
    {

        private readonly ApiContext _db;
        public HipotecaController(ApiContext context)
        {
            _db = context;
        }

        [HttpPost]
        public async Task<ActionResult<Hipotecas>> Post([FromBody] Hipotecas model)
        {
            try
            {

                if (model.HipoInteres <= 1)
                    throw new Exception("El interes debe ser mayor a 0");

                if (model.HipoPlazo < 1)
                    throw new Exception("El pazo debe ser mayor a un año");

                if (model.HipoMonto < 1)
                    throw new Exception("El prestamo debe ser mayor a 0");

                ValidarMesesFijos(model.HipoMesesFijos, model.HipoPlazo);
                ValidarSeguroYRevision(model);

                model.HipoCuota = calcularCuotaMensual(model.HipoMonto,model.HipoInteres, model.HipoPlazo);
                model.HipoCuotaTotal = model.HipoCuota + model.HipoSeguros;

                model.HipoFecha = DateTime.Now;
                model.UsuId = UsuId;

                _db.Hipotecas.Add(model);
                await _db.SaveChangesAsync();


                return Ok(model);
            }
            catch (Exception e)
            {
                return BadRequest(e.InnerException != null ? e.InnerException.Message : e.Message);
            }
        }

        [HttpPost("Delete")]
        public async Task<ActionResult<string>> Delete(int id)
        {
            try
            {
                await _db.Database.BeginTransactionAsync();
                var hipoteca = await _db.Hipotecas.SingleOrDefaultAsync(x=>x.HipoId == id && x.UsuId == UsuId);
                if (hipoteca == null)
                    throw new Exception("Hipoteca no encontrada");


                _db.Pagos.RemoveRange(_db.Pagos.Where(x=>x.HipoId == hipoteca.HipoId));
                _db.TasasHipoteca.RemoveRange(_db.TasasHipoteca.Where(x => x.HipoId == hipoteca.HipoId));
                await _db.SaveChangesAsync();

                _db.Hipotecas.Remove(hipoteca);
                await _db.SaveChangesAsync();

                _db.Database.CommitTransaction();
                return Ok("Hipoteca borrada!");
            }
            catch (Exception e)
            {
                _db.Database.RollbackTransaction();
                return BadRequest(e.InnerException != null ? e.InnerException.Message : e.Message);
            }

        }

        [HttpPost("Update")]
        public async Task<ActionResult<string>> Update([FromBody] Hipotecas model)
        {
            try
            {
                var hipoteca = await _db.Hipotecas.SingleOrDefaultAsync(x => x.HipoId == model.HipoId && x.UsuId == UsuId);
                if (hipoteca == null)
                    throw new Exception("Hipoteca no encontrada");


                hipoteca.HipoInteres = model.HipoInteres;
                hipoteca.HipoPlazo = model.HipoPlazo;
                hipoteca.HipoMonto = model.HipoMonto;
                hipoteca.HipoSeguros = model.HipoSeguros;
                hipoteca.HipoBanco = model.HipoBanco;
                hipoteca.HipoDiaPago = model.HipoDiaPago;
                hipoteca.HipoAbonoLibre = model.HipoAbonoLibre;
                ValidarMesesFijos(model.HipoMesesFijos, model.HipoPlazo);
                ValidarSeguroYRevision(model);
                hipoteca.HipoMesesFijos = model.HipoMesesFijos;
                hipoteca.HipoMesesRevision = model.HipoMesesRevision;
                hipoteca.HipoReduceCuota = model.HipoReduceCuota;

                hipoteca.HipoCuota = calcularCuotaMensual(model.HipoMonto, model.HipoInteres, model.HipoPlazo);
                hipoteca.HipoCuotaTotal = hipoteca.HipoCuota + model.HipoSeguros;

                _db.Hipotecas.Update(hipoteca);
                await _db.SaveChangesAsync();

                return Ok("Hipoteca Actualizada!");
            }
            catch (Exception e)
            {
                return BadRequest(e.InnerException != null ? e.InnerException.Message : e.Message);
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Hipotecas>> GetByid(int id)
        {
            try
            {
                var hipoteca = await _db.Hipotecas.SingleOrDefaultAsync(x => x.HipoId == id && x.UsuId == UsuId);

                if (hipoteca == null)
                    return BadRequest("Hipoteca no encontrado.");


                hipoteca.Pagos = await _db.Pagos.Where(x => x.HipoId == hipoteca.HipoId).ToListAsync();
                hipoteca.Tasas = await _db.TasasHipoteca.Where(x => x.HipoId == hipoteca.HipoId).OrderBy(x => x.TasaDesdeCuota).ToListAsync();
                return Ok(hipoteca);
            }
            catch (Exception e)
            {
                return BadRequest(e.InnerException != null ? e.InnerException.Message : e.Message);
            }

        }

        [HttpGet]
        public async Task<ActionResult<List<Hipotecas>>> Get()
        {
            try
            {
                var hipotecas = await _db.Hipotecas.Where(x => x.UsuId == UsuId).ToListAsync();
                return Ok(hipotecas.OrderByDescending(x => x.HipoFecha));
            }
            catch (Exception e)
            {
                return BadRequest(e.InnerException != null ? e.InnerException.Message : e.Message);
            }
        }

        [HttpPost("PostPagarCuota")]
        public async Task<ActionResult<string>> PostPagarCuota([FromBody] Pagos model)
        {
            try
            {

                var hipoteca = await _db.Hipotecas.SingleOrDefaultAsync(x => x.HipoId == model.HipoId && x.UsuId == UsuId);
                if (hipoteca == null)
                    throw new Exception("Hipoteca no encontrada");


                // La cuota del mes cambia con la tasa vigente y, si los abonos reducen la cuota, con cada abono
                var pagos = await _db.Pagos.Where(x => x.HipoId == hipoteca.HipoId).ToListAsync();
                var tasas = await _db.TasasHipoteca.Where(x => x.HipoId == hipoteca.HipoId).ToListAsync();
                int mes = model.PagoMesAnticipado > 0 ? model.PagoMesAnticipado : (pagos.Count == 0 ? 1 : pagos.Max(p => p.PagoMesAnticipado) + 1);
                var cuota = Amortizacion.CuotaDelMes(hipoteca, pagos.Where(p => p.PagoMesAnticipado < mes).ToList(), tasas, mes);
                if (cuota == null)
                    throw new Exception("Esa cuota no existe: el préstamo ya quedaría saldado");
                var cuotaMes = Math.Round((decimal)cuota.Value + hipoteca.HipoSeguros, 2);

                if (model.PagoMonto < cuotaMes - 0.01m)
                    throw new Exception($"No se puede pagar menos que la cuota del mes (RD${cuotaMes.ToString("N2", CultureInfo.InvariantCulture)})");


                var extra = model.PagoMonto - cuotaMes;
                if (extra < 0.01m) extra = 0;

                model.PagoFecha = DateTime.Now;
                model.PagoMontoAnticipado = extra;
                if (extra == 0) model.PagoReduceCuota = false;

                if(extra > 0)
                {
                    if(model.PagoMesAnticipado == 0 )
                        throw new Exception("Seleccione el mes");

                }

                if (model.PagoMesAnticipado > 0 && pagos.Any(p => p.PagoMesAnticipado == model.PagoMesAnticipado))
                    throw new Exception("Este mes ya fue pago");

                _db.Pagos.Add(model);
                await _db.SaveChangesAsync();


                return Ok("Pago Pagado");
            }
            catch (Exception e)
            {
                return BadRequest(e.InnerException != null ? e.InnerException.Message : e.Message);
            }
        }

        [HttpPost("DeletePagosCuota")]
        public async Task<ActionResult<string>> DeletePagosCuota(int id)
        {
            try
            {
                var pago = await _db.Pagos.SingleOrDefaultAsync(x => x.PagoId == id);
                if (pago == null)
                    throw new Exception("Pago no encontrada");

                var hipoteca = await _db.Hipotecas.SingleOrDefaultAsync(x => x.HipoId == pago.HipoId && x.UsuId == UsuId);
                if (hipoteca == null)
                    throw new Exception("Hipoteca no encontrada");

                _db.Pagos.Remove(pago);
                await _db.SaveChangesAsync();

                return Ok("Pago borrado!");
            }
            catch (Exception e)
            {
                return BadRequest(e.InnerException != null ? e.InnerException.Message : e.Message);
            }

        }


        [HttpPost("Tasa")]
        public async Task<ActionResult<TasasHipoteca>> PostTasa([FromBody] TasasHipoteca model)
        {
            try
            {
                var hipoteca = await _db.Hipotecas.SingleOrDefaultAsync(x => x.HipoId == model.HipoId && x.UsuId == UsuId);
                if (hipoteca == null)
                    throw new Exception("Hipoteca no encontrada");

                // La cuota #1 siempre usa la tasa del contrato
                if (model.TasaDesdeCuota < 2 || model.TasaDesdeCuota > hipoteca.HipoPlazo * 12)
                    throw new Exception($"La cuota debe estar entre 2 y {hipoteca.HipoPlazo * 12}");
                if (model.TasaValor <= 0 || model.TasaValor >= 100)
                    throw new Exception("La tasa debe ser mayor a 0 y menor a 100");

                // Un cambio por cuota: si ya había uno en esa cuota, se corrige
                var tasa = await _db.TasasHipoteca.SingleOrDefaultAsync(x => x.HipoId == hipoteca.HipoId && x.TasaDesdeCuota == model.TasaDesdeCuota);
                if (tasa == null)
                {
                    tasa = new TasasHipoteca { HipoId = hipoteca.HipoId, TasaDesdeCuota = model.TasaDesdeCuota };
                    _db.TasasHipoteca.Add(tasa);
                }
                tasa.TasaValor = Math.Round(model.TasaValor, 4);
                tasa.TasaFecha = DateTime.Now;
                await _db.SaveChangesAsync();

                return Ok(tasa);
            }
            catch (Exception e)
            {
                return BadRequest(e.InnerException != null ? e.InnerException.Message : e.Message);
            }
        }

        [HttpPost("Tasa/Delete")]
        public async Task<ActionResult<string>> DeleteTasa(int id)
        {
            try
            {
                var tasa = await _db.TasasHipoteca.SingleOrDefaultAsync(x => x.TasaId == id);
                if (tasa == null || !await _db.Hipotecas.AnyAsync(x => x.HipoId == tasa.HipoId && x.UsuId == UsuId))
                    throw new Exception("Cambio de tasa no encontrado");

                _db.TasasHipoteca.Remove(tasa);
                await _db.SaveChangesAsync();

                return Ok("Cambio de tasa borrado");
            }
            catch (Exception e)
            {
                return BadRequest(e.InnerException != null ? e.InnerException.Message : e.Message);
            }
        }

        static void ValidarSeguroYRevision(Hipotecas model)
        {
            if (model.HipoSeguros < 0)
                throw new Exception("Los seguros no pueden ser negativos");
            if (model.HipoMesesRevision != null && (model.HipoMesesRevision < 1 || model.HipoMesesRevision > 120))
                throw new Exception("La revisión de tasa debe ser entre 1 y 120 meses");
        }

        static void ValidarMesesFijos(int? mesesFijos, int plazoAnios)
        {
            if (mesesFijos != null && (mesesFijos < 1 || mesesFijos > plazoAnios * 12))
                throw new Exception("Los meses de tasa fija deben estar dentro del plazo");
        }

        decimal calcularCuotaMensual(decimal montoPrestamo,decimal tasaInteresAnual, int plazoAnios)
        {

            // Convertir la tasa de interés anual a mensual dividiéndola entre 12 y por 100 para pasarla a formato decimal
            var tasaInteresMensual = (tasaInteresAnual / 12) / 100;

            // Convertir el plazo de años a meses
            var plazoMeses = plazoAnios * 12;

            var calculo = 1 - Math.Pow(1 + Decimal.ToDouble(tasaInteresMensual), -plazoMeses);

            return montoPrestamo * tasaInteresMensual / Convert.ToDecimal(calculo);
        }

    }
}