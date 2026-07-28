using HipotecaSimple.Data;
using HipotecaSimple.Data.Entities;
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


                if (model.PagoMonto < hipoteca.HipoCuotaTotal)
                    throw new Exception("NO se puede pagar menmos que la cuota mensual");


                var extra = model.PagoMonto - hipoteca.HipoCuotaTotal;

                model.PagoFecha = DateTime.Now;

                if(extra > 0)
                {
                    model.PagoMontoAnticipado = extra;
                    if(model.PagoMesAnticipado == 0 )
                        throw new Exception("Seleccione el mes");

                    if(_db.Pagos.Any(x=>x.HipoId == model.HipoId && x.PagoMesAnticipado == model.PagoMesAnticipado))
                        throw new Exception("Este mes ya fue pago");
                } 

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