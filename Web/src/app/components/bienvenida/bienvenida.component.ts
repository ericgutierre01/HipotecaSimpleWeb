import { Component, OnInit } from '@angular/core';
import { Hipoteca } from 'src/app/Entities/Hipoteca';
import { Amortizacion } from 'src/app/Entities/Amortizacion';
import {
  calcularAmortizacion, calcularCuotaMensual, formatearMeses, redondear, ResultadoAmortizacion, Simulacion
} from 'src/app/services/amortizacion';

interface Barra {
  ano: number;      // año calendario
  capital: number;  // % de la altura máxima
  abono: number;
  interes: number;
  fuera: boolean;   // año que ya no pagarías gracias a los abonos
  total: number;
}

interface Calculo {
  cuota: number;
  cuotaTotal: number;
  totalBanco: number;
  intereses: number;
  pctIntereses: number;
  baseFin: Date;
  fin: Date;
  mesesMenos: number;
  difIntereses: number; // > 0 te ahorras, < 0 pagas de más
  abonoMonto: number;
  barras: Barra[];
  plazo: { fin: Date; ahorro: number };
  cuotaBaja: { cuota: number; ahorro: number };
}

// Página pública: explica la app y deja probar la calculadora sin crear nada
@Component({
  selector: 'app-bienvenida',
  templateUrl: './bienvenida.component.html',
  styleUrls: ['./bienvenida.component.css']
})
export class BienvenidaComponent implements OnInit {

  plazos = [10, 15, 20, 25, 30];
  subidas = [0, 1, 2, 3];
  form = { monto: 2500000 as any, tasa: 13 as any, plazo: 20 as any, seguros: '' as any };
  abonoCuotas = 0;
  subeTasa = 0;
  c?: Calculo;
  conSesion = false;
  formatearMeses = formatearMeses;

  ngOnInit(): void {
    try { this.conSesion = !!localStorage.getItem('token'); } catch { }
    this.calcular();
  }

  // ngx-mask devuelve el número sin separadores; vacío = 0
  private num(v: any): number {
    return Number(String(v ?? '').replace(/,/g, '')) || 0;
  }

  get puedeSubirTasa(): boolean {
    return this.num(this.form.plazo) * 12 > 36;
  }

  cambiarAbono(delta: number) {
    this.abonoCuotas = Math.max(0, Math.min(6, this.abonoCuotas + delta));
    this.calcular();
  }

  elegirPlazo(p: number) {
    this.form.plazo = p;
    this.calcular();
  }

  elegirSubida(s: number) {
    this.subeTasa = s;
    this.calcular();
  }

  calcular() {
    const monto = this.num(this.form.monto), tasa = this.num(this.form.tasa);
    const plazo = Math.floor(this.num(this.form.plazo)), seguros = this.num(this.form.seguros);
    if (!(monto > 0 && tasa > 0 && tasa < 100 && plazo >= 1 && plazo <= 40)) {
      this.c = undefined;
      return;
    }

    const hoy = new Date();
    const h = new Hipoteca();
    h.hipoMonto = monto;
    h.hipoInteres = tasa;
    h.hipoPlazo = plazo;
    h.hipoSeguros = seguros;
    h.hipoCuota = calcularCuotaMensual(monto, tasa, plazo);
    h.hipoCuotaTotal = h.hipoCuota + seguros;
    h.hipoFecha = hoy;
    h.hipoDiaPago = hoy.getDate();
    h.pagos = [];
    h.tasas = [];

    const cuotaTotal = redondear(h.hipoCuotaTotal);
    // Como en la app: el banco recibe abonos en cuotas completas, aquí cada diciembre
    const abono = (n: number): Simulacion => ({ tipo: 'anual', fecha: '', mes: 11, cuotas: n, monto: redondear(n * cuotaTotal) });
    const sims: Simulacion[] = [];
    if (this.abonoCuotas) sims.push(abono(this.abonoCuotas));
    if (this.subeTasa && this.puedeSubirTasa)
      sims.push({ tipo: 'tasa', fecha: '', mes: 0, cuotas: 0, monto: 0, tasa: tasa + this.subeTasa, desdeCuota: 37 });

    const base = calcularAmortizacion(h, 1);
    const esc = sims.length ? calcularAmortizacion(h, 1, sims) : base;
    const conPlazo = calcularAmortizacion(h, 1, [abono(1)]);
    const conCuota = calcularAmortizacion(h, 2, [abono(1)]);
    // Interés que de verdad se paga en cada escenario (capital + intereses − monto)
    const interes = (r: ResultadoAmortizacion) => r.totalPagar - r.interesAhorrado - monto;
    const primerAbono = conCuota.filas.findIndex(f => f.anticipado > 0);

    this.c = {
      cuota: h.hipoCuota,
      cuotaTotal,
      totalBanco: base.totalPagar,
      intereses: base.interesesPagar,
      pctIntereses: base.interesesPagar / base.totalPagar * 100,
      baseFin: base.fechaFin,
      fin: esc.fechaFin,
      mesesMenos: base.filas.length - esc.filas.length,
      difIntereses: base.interesesPagar - interes(esc),
      abonoMonto: redondear(this.abonoCuotas * cuotaTotal),
      barras: this.barras(base, esc, hoy.getFullYear()),
      plazo: { fin: conPlazo.fechaFin, ahorro: base.interesesPagar - interes(conPlazo) },
      cuotaBaja: {
        cuota: (conCuota.filas[primerAbono + 1]?.cuota ?? h.hipoCuota) + seguros,
        ahorro: base.interesesPagar - interes(conCuota),
      },
    };
  }

  // Lo pagado en cada año del contrato. Los años que el escenario ya no paga quedan como barra fantasma.
  private barras(base: ResultadoAmortizacion, esc: ResultadoAmortizacion, anoInicio: number): Barra[] {
    const porAno = (filas: Amortizacion[], ano: number) => filas.filter(f => f.ano === String(ano));
    // La última cuota puede pasarse del saldo: solo cuenta lo que faltaba por pagar
    const capital = (f: Amortizacion) => f.capital + Math.min(0, f.pendiente);
    const abono = (f: Amortizacion) => Math.min(f.anticipado, Math.max(0, f.pendiente));
    const suma = (fs: Amortizacion[], v: (f: Amortizacion) => number) => fs.reduce((t, f) => t + v(f), 0);

    const anos = Math.ceil(base.filas.length / 12);
    const crudas = Array.from({ length: anos }, (_, i) => {
      const e = porAno(esc.filas, i + 1);
      const fs = e.length ? e : porAno(base.filas, i + 1);
      return { ano: anoInicio + i, fuera: !e.length, capital: suma(fs, capital), abono: e.length ? suma(fs, abono) : 0, interes: suma(fs, f => f.interes) };
    });
    const max = Math.max(...crudas.map(b => b.capital + b.abono + b.interes));
    return crudas.map(b => ({
      ...b,
      total: b.capital + b.abono + b.interes,
      capital: b.capital / max * 100,
      abono: b.abono / max * 100,
      interes: b.interes / max * 100,
    }));
  }

  get resumenGrafica(): string {
    if (!this.c) return '';
    const fin = this.c.fin.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    return `Gráfica de pagos por año. Terminas de pagar en ${fin}.`;
  }

  abs = Math.abs;
}
