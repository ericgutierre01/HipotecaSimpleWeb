import { Hipoteca } from 'src/app/Entities/Hipoteca';
import { Amortizacion } from 'src/app/Entities/Amortizacion';

// Abono o cambio de tasa de prueba del simulador: solo vive en pantalla, nunca se guarda
export interface Simulacion {
  tipo: string; // 'unica' | 'anual' | 'mensual' | 'tasa'
  fecha: string; // 'AAAA-MM' (solo 'unica')
  mes: number;   // 0-11 (solo 'anual')
  cuotas: number;
  monto: number;
  tasa?: number;       // % anual (solo 'tasa')
  desdeCuota?: number; // (solo 'tasa')
}

export interface ResultadoAmortizacion {
  filas: Amortizacion[];
  totalPagar: number;
  interesesPagar: number;
  interesAhorrado: number;
  mesesAhorrados: number;
  nuevaCuota: number;
  cuotaTotalProxima: number; // lo que toca pagar este mes: cuota vigente + seguros, redondeada
  tasaActual: number;
  cuotaActualMes: number;
  cuotasPagadas: number;
  cuotasRestantes: number;
  fechaFin: Date;
  saldoActual: number;
  progreso: number;
  proxima?: Amortizacion;
  pagadoCapital: number;
  pagadoInteres: number;
  abonosReales: number;
  totalAbonosReales: number;
  abonosSimulados: number;
  totalAbonosSimulados: number;
}

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export function calcularCuotaMensual(monto: number, tasa: number, plazoAnos: number): number {
  return pmt(monto, tasa, plazoAnos * 12);
}

export function pmt(saldo: number, tasaAnual: number, meses: number): number {
  const r = tasaAnual / 12 / 100;
  return r === 0 ? saldo / meses : saldo * r / (1 - Math.pow(1 + r, -meses));
}

// Cuotas que faltan para saldar ese saldo pagando esa cuota a esa tasa (la última puede ser menor)
export function mesesRestantes(saldo: number, tasaAnual: number, cuota: number, maximo: number): number {
  const r = tasaAnual / 12 / 100;
  const x = r === 0 ? saldo / cuota : -Math.log(1 - saldo * r / cuota) / Math.log(1 + r);
  return isFinite(x) ? Math.min(maximo, Math.max(1, Math.ceil(x - 1e-6))) : maximo;
}

export const redondear = (n: number) => Math.round(n * 100) / 100;

// Cambios de tasa {desde cuota → tasa}: los registrados y, encima, los simulados
function cambiosDeTasa(prestamo: Hipoteca, simulaciones: Simulacion[]): Map<number, number> {
  const cambios = new Map<number, number>();
  (prestamo.tasas || []).forEach(t => cambios.set(t.tasaDesdeCuota, t.tasaValor));
  simulaciones.filter(s => s.tipo === 'tasa').forEach(s => cambios.set(s.desdeCuota!, s.tasa!));
  return cambios;
}

export function esPagada(cuota: Amortizacion): boolean {
  return cuota.fecha != null && cuota.fecha !== '';
}

// "X años y Y meses": años completos (truncado, NO redondeado) y meses sobrantes
export function formatearMeses(total: number): string {
  const anos = Math.floor(total / 12);
  const meses = total % 12;
  const anosString = anos > 0 ? `${anos} ${anos === 1 ? 'año' : 'años'}` : '';
  const mesesString = meses > 0 ? `${meses} ${meses === 1 ? 'mes' : 'meses'}` : '';
  const letra = anosString !== '' && mesesString !== '' ? ' y ' : '';
  return `${anosString}${letra}${mesesString}` || '0 meses';
}

// ¿El abono simulado cae en la cuota que vence en esa fecha?
export function aplicaSimulacion(s: Simulacion, vence: Date): boolean {
  const fecha = `${vence.getFullYear()}-${String(vence.getMonth() + 1).padStart(2, '0')}`;
  return s.tipo === 'tasa' ? false : s.tipo === 'mensual' || (s.tipo === 'anual' && vence.getMonth() === s.mes) || (s.tipo === 'unica' && s.fecha === fecha);
}

function abonoSimulado(simulaciones: Simulacion[], vence: Date): number {
  return simulaciones.reduce((total, s) => aplicaSimulacion(s, vence) ? total + s.monto : total, 0);
}

// Tabla de amortización con los pagos reales, los cambios de tasa y, opcionalmente, abonos y tasas simulados.
// tipo = qué hacen los abonos simulados (1 = reducen el plazo, 2 = reducen la cuota); cada pago real guarda lo suyo.
// Al cambiar la tasa la cuota se recalcula con el saldo y las cuotas que faltan (mismo cálculo que el API).
export function calcularAmortizacion(prestamo: Hipoteca, tipo: number, simulaciones: Simulacion[] = []): ResultadoAmortizacion {
  const tasas = cambiosDeTasa(prestamo, simulaciones);
  // Sin abonos y con las mismas tasas: contra esto se mide lo ahorrado
  const base = tabla(prestamo, tipo, tasas, [], false);
  const totalPagar = base.filas.reduce((t, f) => t + f.cuota, 0);
  const interesesPagar = totalPagar - prestamo.hipoMonto;
  const { filas, interesPagado, nuevaCuota } = tabla(prestamo, tipo, tasas, simulaciones, true);

  const pagadas = filas.filter(esPagada);
  const cuotaActualMes = pagadas.length > 0 ? Math.max(...pagadas.map(p => p.mes)) + 1 : 1;
  const yaPagadas = filas.slice(0, cuotaActualMes - 1);
  const ultima = yaPagadas[yaPagadas.length - 1];
  const reales = filas.filter(f => f.anticipado - f.abonoSimulado > 0);
  const simuladas = filas.filter(f => f.abonoSimulado > 0);
  const proxima = filas[cuotaActualMes - 1];

  return {
    filas,
    totalPagar,
    interesesPagar,
    interesAhorrado: interesesPagar - interesPagado,
    mesesAhorrados: base.filas.length - filas.length,
    nuevaCuota,
    cuotaTotalProxima: proxima ? redondear(proxima.cuota + prestamo.hipoSeguros) : 0,
    tasaActual: (proxima || filas[filas.length - 1]).tasa,
    cuotaActualMes,
    cuotasPagadas: cuotaActualMes - 1,
    cuotasRestantes: filas.length - (cuotaActualMes - 1),
    fechaFin: filas[filas.length - 1].fechaVencimiento,
    saldoActual: ultima ? Math.max(0, ultima.pendiente - ultima.anticipado) : prestamo.hipoMonto,
    progreso: filas.length ? (cuotaActualMes - 1) / filas.length * 100 : 0,
    proxima,
    pagadoCapital: yaPagadas.reduce((t, f) => t + f.capital + f.anticipado, 0),
    pagadoInteres: yaPagadas.reduce((t, f) => t + f.interes, 0),
    abonosReales: reales.length,
    totalAbonosReales: reales.reduce((t, f) => t + f.anticipado - f.abonoSimulado, 0),
    abonosSimulados: simuladas.length,
    totalAbonosSimulados: simuladas.reduce((t, f) => t + f.abonoSimulado, 0),
  };
}

function tabla(prestamo: Hipoteca, tipo: number, tasas: Map<number, number>, simulaciones: Simulacion[], conAbonos: boolean) {
  const plazoMeses = prestamo.hipoPlazo * 12;
  const filas: Amortizacion[] = [];

  let tasa = prestamo.hipoInteres;
  let cuotaMensual = calcularCuotaMensual(prestamo.hipoMonto, tasa, prestamo.hipoPlazo);
  let nuevaCuota = cuotaMensual;
  let saldo = prestamo.hipoMonto;
  let interesPagado = 0;

  // Base para la fecha de vencimiento: la primera cuota vence el mismo mes de creación
  const fechaCreacion = new Date(prestamo.hipoFecha);
  const diaPago = Number(prestamo.hipoDiaPago) || fechaCreacion.getDate();
  // Los abonos simulados solo se aplican a cuotas que aún no se han pagado
  const ultimoPagado = Math.max(0, ...prestamo.pagos.map(p => p.pagoMesAnticipado));

  for (let mes = 1; mes <= plazoMeses; mes++) {
    const pago = prestamo.pagos.find(p => p.pagoMesAnticipado === mes);
    const nueva = tasas.get(mes);
    if (nueva != null && nueva !== tasa) {
      cuotaMensual = pmt(saldo, nueva, mesesRestantes(saldo, tasa, cuotaMensual, plazoMeses - mes + 1));
      tasa = nueva;
      nuevaCuota = cuotaMensual;
    }
    const interes = saldo * (tasa / 12 / 100);
    const capital = cuotaMensual - interes;
    saldo -= capital;
    interesPagado += interes;

    const item = new Amortizacion();
    item.ano = String(Math.floor((mes - 1) / 12) + 1);
    item.mes = mes;
    item.cuota = cuotaMensual;
    item.tasa = tasa;
    item.interes = interes;
    item.capital = capital;
    item.pendiente = saldo;
    item.fecha = pago ? pago.pagoFecha.toString() : '';
    item.id = pago ? pago.pagoId : 0;
    item.pagado = pago ? pago.pagoMonto : 0;
    item.fechaVencimiento = new Date(fechaCreacion.getFullYear(), fechaCreacion.getMonth() + (mes - 1), diaPago);
    item.abonoSimulado = conAbonos && mes > ultimoPagado ? abonoSimulado(simulaciones, item.fechaVencimiento) : 0;
    item.anticipado = (conAbonos && pago && pago.pagoMontoAnticipado > 0 ? pago.pagoMontoAnticipado : 0) + item.abonoSimulado;
    filas.push(item);

    if (item.anticipado > 0) {
      // Reducir la cuota: misma fecha final (las cuotas que quedaban antes del abono), cuota recalculada
      const quedan = mes < plazoMeses ? mesesRestantes(saldo, tasa, cuotaMensual, plazoMeses - mes) : 0;
      item.reduceCuota = pago && pago.pagoMontoAnticipado > 0 ? pago.pagoReduceCuota : tipo === 2;
      saldo -= item.anticipado;
      if (item.reduceCuota && saldo > 0 && quedan > 0) {
        cuotaMensual = pmt(saldo, tasa, quedan);
        nuevaCuota = cuotaMensual;
      }
    }

    // Menos de un centavo = saldado (igual que el API); evita una cuota casi vacía por redondeo
    if (saldo < 0.01) break;
  }

  return { filas, interesPagado, nuevaCuota };
}

// Días desde hoy hasta la fecha (negativo = ya pasó)
export function diasHasta(fecha: Date): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fecha);
  f.setHours(0, 0, 0, 0);
  return Math.round((f.getTime() - hoy.getTime()) / 86400000);
}

export function textoVencimiento(fecha: Date): string {
  const d = diasHasta(fecha);
  if (d === 0) return 'Vence hoy';
  if (d === 1) return 'Mañana';
  if (d > 1) return `En ${d} días`;
  return d === -1 ? 'Venció ayer' : `Vencida hace ${-d} días`;
}
