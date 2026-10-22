import { Component, OnInit } from '@angular/core';
import { DataService } from 'src/app/services/services/data.service';
import { Hipoteca } from 'src/app/Entities/Hipoteca';
import { Amortizacion } from 'src/app/Entities/Amortizacion';
import Swal from 'sweetalert2'
import { Router, ActivatedRoute } from '@angular/router';
import { Pagos } from 'src/app/Entities/Pagos';
import { TasaHipoteca } from 'src/app/Entities/TasaHipoteca';
import {
  calcularAmortizacion, ResultadoAmortizacion, Simulacion, MESES,
  esPagada, formatearMeses, textoVencimiento, diasHasta, aplicaSimulacion, redondear
} from 'src/app/services/amortizacion';

interface GrupoAno {
  ano: string;
  desde: Date;
  hasta: Date;
  filas: Amortizacion[];
  total: number;
  pagadas: number;
  extras: number;
}

@Component({
  selector: 'app-hipoteca-detalle',
  templateUrl: './hipoteca-detalle.component.html',
  styleUrls: ['./hipoteca-detalle.component.css']
})
export class HipotecaDetalleComponent implements OnInit {

  constructor(
    private _dataservice: DataService,
    private _activeRoute: ActivatedRoute,
    private _router: Router
  ) { }

  prestamo = new Hipoteca;
  loading = false;
  tab = 'resumen';
  tipo = 1; // 1 = el abono reduce el plazo, 2 = reduce la cuota

  real?: ResultadoAmortizacion;  // solo pagos reales
  sim?: ResultadoAmortizacion;   // pagos reales + abonos de prueba

  // Pestaña Cuotas
  filtro = 'todas';
  verSimuladas = false;
  grupos: GrupoAno[] = [];
  abiertos = new Set<string>();
  expandidas = new Set<number>();

  // Pestaña Simular (nada se guarda)
  meses = MESES;
  simulaciones: Simulacion[] = [];
  nuevaSim = { tipo: 'anual', fecha: '', mes: 11, cuotas: 1, monto: 0 };
  simTasa = { tasa: null as number | null, desdeCuota: null as number | null };

  // Utilidades para la plantilla
  esPagada = esPagada;
  formatearMeses = formatearMeses;
  textoVencimiento = textoVencimiento;

  // Al tocar un recordatorio push se abre con ?pagar=1 (o ?tasa=1): el diálogo aparece solo
  private pagarAlCargar = false;
  private tasaAlCargar = false;

  ngOnInit(): void {
    this._activeRoute.params.subscribe(params => {
      this.getHipotecaID(params['id']);
    });
    this._activeRoute.queryParamMap.subscribe(q => {
      this.pagarAlCargar = q.get('pagar') === '1';
      this.tasaAlCargar = q.get('tasa') === '1';
      this.abrirPagoPendiente();
    });
  }

  private abrirPagoPendiente() {
    if (!(this.pagarAlCargar || this.tasaAlCargar) || this.loading || !this.real?.proxima) return;
    const tasa = this.tasaAlCargar;
    this.pagarAlCargar = this.tasaAlCargar = false;
    this._router.navigate([], { relativeTo: this._activeRoute, queryParams: {}, replaceUrl: true });
    tasa ? this.registrarTasa() : this.pagar();
  }

  getHipotecaID(hipoId: any) {
    this.loading = true;
    this._dataservice.getHipotecaById(hipoId).subscribe(
      (res) => {
        this.loading = false;
        this.prestamo = res;
        this.tipo = res.hipoReduceCuota ? 2 : 1;
        this.recalcular();
        this.abrirPagoPendiente();
      },
      (err) => {
        this.loading = false;
        console.error(err.error);
        Swal.fire({
          position: 'center',
          icon: 'error',
          title: err.error,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    );
  }

  recalcular() {
    this.real = calcularAmortizacion(this.prestamo, this.tipo);
    this.sim = this.simulaciones.length ? calcularAmortizacion(this.prestamo, this.tipo, this.simulaciones) : undefined;
    if (!this.sim) this.verSimuladas = false;
    this.armarGrupos();
  }

  cambiarTipo(tipo: number) {
    if (this.tipo === tipo) return;
    const poner = (t: number) => {
      this.tipo = t;
      this.prestamo.hipoReduceCuota = t === 2;
      this.recalcular();
    };
    const antes = this.tipo;
    poner(tipo);
    this.guardarPreferencia(() => poner(antes));
  }

  irA(tab: string) {
    this.tab = tab;
    window.scrollTo({ top: 0 });
  }

  // ---------- Resumen ----------

  get vencida(): boolean {
    return !!this.real?.proxima && diasHasta(this.real.proxima.fechaVencimiento) < 0;
  }

  // Ancho (%) de cada parte de la próxima cuota: interés, capital y seguros
  get desglose() {
    const p = this.real!.proxima!;
    const total = p.cuota + this.prestamo.hipoSeguros;
    return {
      interes: p.interes / total * 100,
      capital: p.capital / total * 100,
      seguros: this.prestamo.hipoSeguros / total * 100,
      interesSinSeguros: p.interes / p.cuota * 100,
    };
  }

  // Cuota vigente con seguros: cambia con la tasa y, si los abonos reducen la cuota, con cada abono
  get cuotaAPagar(): number {
    return this.real!.cuotaTotalProxima;
  }

  // ---------- Tasa ----------

  aniosFijos = [1, 2, 3, 4, 5, 7, 10];

  // Opciones de "tasa fija por" dentro del plazo, más la guardada si no es un número de años de la lista
  get opcionesFijos(): number[] {
    const plazo = this.prestamo.hipoPlazo * 12;
    const meses = this.aniosFijos.map(a => a * 12).filter(m => m < plazo);
    const actual = this.prestamo.hipoMesesFijos;
    if (actual && !meses.includes(actual)) meses.push(actual);
    return meses.sort((a, b) => a - b);
  }

  textoFijos(meses: number): string {
    const anos = meses / 12;
    return Number.isInteger(anos) ? `${anos} ${anos === 1 ? 'año' : 'años'}` : `${meses} meses`;
  }

  // Cuota en la que normalmente empieza la tasa nueva
  get cuotaSugeridaTasa(): number {
    return Math.max(2, this.revisionPendiente?.mes ?? this.real!.cuotaActualMes);
  }

  get cuotaSugeridaSim(): number {
    return Math.max(this.real!.cuotaActualMes, this.cuotaSugeridaTasa);
  }

  // Primera cuota con tasa variable, si la tasa fija termina dentro del préstamo
  get primeraVariable(): Amortizacion | undefined {
    const fijos = this.prestamo.hipoMesesFijos;
    return fijos ? this.real?.filas[fijos] : undefined;
  }

  // Cuotas en las que el banco puede cambiar la tasa (mismo criterio que el API): la primera
  // después del periodo fijo y, si la revisa periódicamente, cada hipoMesesRevision cuotas
  get cuotasRevision(): number[] {
    const fijos = this.prestamo.hipoMesesFijos, plazo = this.prestamo.hipoPlazo * 12;
    const cuotas: number[] = [];
    if (fijos) for (let m = fijos + 1; m <= plazo; m += this.prestamo.hipoMesesRevision || plazo) cuotas.push(m);
    return cuotas.filter(m => this.real?.filas[m - 1]);
  }

  // Revisión que ya está a 30 días o menos (o pasó) y sin tasa registrada desde esa cuota
  get revisionPendiente(): Amortizacion | undefined {
    const mes = this.cuotasRevision.filter(m => diasHasta(this.real!.filas[m - 1].fechaVencimiento) <= 30).pop();
    return mes && !(this.prestamo.tasas || []).some(t => t.tasaDesdeCuota >= mes) ? this.real!.filas[mes - 1] : undefined;
  }

  // Siguiente revisión a más de 30 días, para mostrarla en la tarjeta
  get proximaRevision(): Amortizacion | undefined {
    const mes = this.cuotasRevision.find(m => diasHasta(this.real!.filas[m - 1].fechaVencimiento) > 30);
    return mes ? this.real!.filas[mes - 1] : undefined;
  }

  get esPrimeraRevision(): boolean {
    return this.revisionPendiente?.mes === this.primeraVariable?.mes;
  }

  get diasParaRevision(): number {
    return this.revisionPendiente ? diasHasta(this.revisionPendiente.fechaVencimiento) : 0;
  }

  // ¿La cuota actual ya está en el periodo variable?
  get enPeriodoVariable(): boolean {
    return !!this.primeraVariable && this.real!.cuotaActualMes >= this.primeraVariable.mes;
  }

  vencimientoCuota(mes: number): Date | undefined {
    return this.real?.filas[mes - 1]?.fechaVencimiento;
  }

  cambiarMesesRevision(meses: number | null) {
    const antes = this.prestamo.hipoMesesRevision;
    if (antes === meses) return;
    this.prestamo.hipoMesesRevision = meses;
    this.guardarPreferencia(() => this.prestamo.hipoMesesRevision = antes);
  }

  // El banco ajusta los seguros de vez en cuando: se cambian aquí y aplican de la próxima cuota en adelante
  editarSeguros() {
    Swal.fire({
      title: 'Seguros mensuales',
      html:
        `<div class="hs-field" style="text-align:left">
          <label class="hs-label" for="seguros_ip">Monto que te cobra el banco cada mes</label>
          <input id="seguros_ip" type="number" inputmode="decimal" min="0" step="0.01" value="${this.prestamo.hipoSeguros}" class="hs-input">
          <p class="hs-help">Lo ves como "Otros" o "Seguros" en el detalle de tu cuota. Aplica de la próxima cuota en adelante: tus pagos registrados no cambian.</p>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      didOpen: (popup) => (popup.querySelector('#seguros_ip') as HTMLInputElement).select(),
      preConfirm: () => {
        const v = Number((document.getElementById('seguros_ip') as HTMLInputElement).value);
        return v >= 0 ? redondear(v) : Swal.showValidationMessage('Escribe un monto válido');
      },
    }).then((r) => {
      if (!r.isConfirmed || r.value === this.prestamo.hipoSeguros) return;
      const antes = this.prestamo.hipoSeguros;
      this.prestamo.hipoSeguros = r.value;
      this.recalcular();
      this.guardarPreferencia(() => { this.prestamo.hipoSeguros = antes; this.recalcular(); });
    });
  }

  cambiarMesesFijos(meses: number | null) {
    const antes = this.prestamo.hipoMesesFijos;
    if (antes === meses) return;
    this.prestamo.hipoMesesFijos = meses;
    this.guardarPreferencia(() => this.prestamo.hipoMesesFijos = antes);
  }

  // Cuota (con seguros) que quedaría si desde la cuota "desde" se paga la tasa indicada
  private cuotaConTasa(tasa: number, desde: number): number | undefined {
    const r = calcularAmortizacion(this.prestamo, this.tipo, [{ tipo: 'tasa', fecha: '', mes: 0, cuotas: 0, monto: 0, tasa, desdeCuota: desde }]);
    const f = r.filas[desde - 1];
    return f ? redondear(f.cuota + this.prestamo.hipoSeguros) : undefined;
  }

  registrarTasa() {
    const plazo = this.prestamo.hipoPlazo * 12;
    const sugerida = this.cuotaSugeridaTasa;
    const rd = (n: number) => 'RD$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const leer = () => ({
      tasa: Number((document.getElementById('tasaNueva_ip') as HTMLInputElement).value),
      desde: Math.floor(Number((document.getElementById('tasaDesde_ip') as HTMLInputElement).value)),
    });

    Swal.fire({
      title: 'Registrar cambio de tasa',
      html:
        `<div class="hs-field" style="text-align:left">
          <label class="hs-label" for="tasaNueva_ip">Tasa nueva (% anual)</label>
          <input id="tasaNueva_ip" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Ej: ${this.real!.tasaActual}" class="hs-input">
          <p class="hs-help">Si en la revisión el banco la dejó igual, escribe la misma: así queda registrada.</p>
        </div>
        <div class="hs-field" style="text-align:left;margin-top:12px">
          <label class="hs-label" for="tasaDesde_ip">Desde la cuota #</label>
          <input id="tasaDesde_ip" type="number" inputmode="numeric" min="2" max="${plazo}" value="${sugerida}" class="hs-input">
          <p class="hs-help" id="tasaDesdeFecha"></p>
        </div>
        <p class="tasa-preview" id="tasaPreview" aria-live="polite"></p>`,
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      showLoaderOnConfirm: true,
      didOpen: (popup) => {
        const pintar = () => {
          const { tasa, desde } = leer();
          const vence = desde >= 1 ? this.vencimientoCuota(desde) : undefined;
          popup.querySelector('#tasaDesdeFecha')!.textContent = vence ? `Vence el ${vence.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}` : '';
          const antes = desde >= 1 ? this.real!.filas[desde - 1] : undefined;
          const nueva = tasa > 0 && tasa < 100 && desde >= 2 && desde <= plazo ? this.cuotaConTasa(tasa, desde) : undefined;
          popup.querySelector('#tasaPreview')!.textContent = antes && nueva != null
            ? `Tu cuota pasaría de ${rd(redondear(antes.cuota + this.prestamo.hipoSeguros))} a ${rd(nueva)}.`
            : '';
        };
        popup.querySelectorAll('input').forEach(i => i.addEventListener('input', pintar));
        pintar();
        (popup.querySelector('#tasaNueva_ip') as HTMLInputElement).focus();
      },
      preConfirm: () => {
        const { tasa, desde } = leer();
        if (!(tasa > 0 && tasa < 100)) return Swal.showValidationMessage('Escribe la tasa nueva (ej: 12.5)');
        if (!(desde >= 2 && desde <= plazo)) return Swal.showValidationMessage(`La cuota debe estar entre 2 y ${plazo}`);
        return new Promise(resolve =>
          this._dataservice.postTasa({ hipoId: this.prestamo.hipoId, tasaDesdeCuota: desde, tasaValor: tasa }).subscribe(
            () => resolve(true),
            (err) => { Swal.showValidationMessage(typeof err.error === 'string' ? err.error : 'No se pudo guardar'); resolve(false); }
          ));
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((r) => {
      if (!r.isConfirmed) return;
      Swal.fire({ position: 'top-end', icon: 'success', title: 'Tasa registrada', showConfirmButton: false, timer: 1200 });
      this.getHipotecaID(this.prestamo.hipoId);
    });
  }

  borrarTasa(t: TasaHipoteca) {
    Swal.fire({
      title: `¿Borrar la tasa de ${t.tasaValor}% desde la cuota #${t.tasaDesdeCuota}?`,
      text: 'Las cuotas siguientes se calcularán con la tasa anterior.',
      showDenyButton: true,
      confirmButtonText: 'Sí, borrar',
      denyButtonText: 'Cancelar'
    }).then((r) => {
      if (!r.isConfirmed) return;
      this._dataservice.deleteTasa(t.tasaId).subscribe(
        () => this.getHipotecaID(this.prestamo.hipoId),
        (err) => Swal.fire({ icon: 'error', title: 'No se pudo borrar', text: typeof err.error === 'string' ? err.error : '' })
      );
    });
  }

  // ---------- Cuotas ----------

  get tabla(): ResultadoAmortizacion {
    return this.verSimuladas && this.sim ? this.sim : this.real!;
  }

  cambiarFiltro(filtro: string) {
    this.filtro = filtro;
    this.armarGrupos();
  }

  verCuotasSimuladas() {
    this.verSimuladas = true;
    this.armarGrupos();
    this.irA('cuotas');
  }

  verCuotasReales() {
    this.verSimuladas = false;
    this.armarGrupos();
  }

  armarGrupos() {
    if (!this.real) return;
    const t = this.tabla;
    const pasa = (f: Amortizacion) =>
      this.filtro === 'pendientes' ? !esPagada(f) :
      this.filtro === 'pagadas' ? esPagada(f) :
      this.filtro === 'extra' ? f.anticipado > 0 : true;

    const anos = Array.from(new Set(t.filas.map(f => f.ano)));
    this.grupos = anos.map(ano => {
      const todas = t.filas.filter(f => f.ano === ano);
      return {
        ano,
        desde: todas[0].fechaVencimiento,
        hasta: todas[todas.length - 1].fechaVencimiento,
        filas: todas.filter(pasa),
        total: todas.length,
        pagadas: todas.filter(esPagada).length,
        extras: todas.filter(f => f.anticipado > 0).length,
      };
    }).filter(g => g.filas.length > 0);

    // Al abrir, se despliega el año de la cuota actual
    if (!this.abiertos.size && t.proxima) this.abiertos.add(t.proxima.ano);
  }

  toggleGrupo(ano: string) {
    this.abiertos.has(ano) ? this.abiertos.delete(ano) : this.abiertos.add(ano);
  }

  // La tasa de esta cuota es distinta a la de la anterior
  cambiaTasa(f: Amortizacion): boolean {
    return f.mes > 1 && this.tabla.filas[f.mes - 2]?.tasa !== f.tasa;
  }

  // Seguros de la cuota: en las pagadas, lo que se pagó aparte de la cuota y el abono; en las demás, los de hoy
  segurosDe(f: Amortizacion): number {
    return esPagada(f) ? Math.max(0, redondear(f.pagado - f.cuota - f.anticipado)) : this.prestamo.hipoSeguros;
  }

  // Total de la cuota: lo registrado si está pagada; si no, cuota + seguros + abono (real o de prueba)
  totalDe(f: Amortizacion): number {
    return esPagada(f) ? f.pagado : f.cuota + this.prestamo.hipoSeguros + f.anticipado;
  }

  // Saldo que queda después de la cuota y de su abono extra
  saldoDespues(f: Amortizacion): number {
    return Math.max(0, f.pendiente - f.anticipado);
  }

  toggleFila(mes: number) {
    this.expandidas.has(mes) ? this.expandidas.delete(mes) : this.expandidas.add(mes);
  }

  // ---------- Simular ----------

  get fechaFinContrato(): Date {
    const f = this.real!.filas[0].fechaVencimiento;
    return new Date(f.getFullYear(), f.getMonth() + this.prestamo.hipoPlazo * 12 - 1, f.getDate());
  }

  cuotasSim(delta: number) {
    this.nuevaSim.cuotas = Math.max(1, Math.min(99, (Number(this.nuevaSim.cuotas) || 1) + delta));
  }

  abs = Math.abs;

  get mesesAntes(): number {
    return this.sim ? Math.max(0, this.real!.filas.length - this.sim.filas.length) : 0;
  }

  // Interés que la simulación te ahorra frente a hoy (negativo = pagarías más, p. ej. si sube la tasa)
  get diferenciaIntereses(): number {
    return this.sim ? (this.real!.totalPagar - this.real!.interesAhorrado) - (this.sim.totalPagar - this.sim.interesAhorrado) : 0;
  }

  // Banco de cuotas completas: monto = cuotas × cuota vigente. Banco de monto libre: el monto que se escriba.
  // shortcut: usa la cuota vigente de hoy; si una tasa simulada la cambia después, el abono no se ajusta
  agregarSimulacion(): void {
    const s = this.nuevaSim;
    const libre = this.prestamo.hipoAbonoLibre;
    const cuotas = libre ? 0 : Math.floor(Number(s.cuotas));
    const monto = libre ? redondear(Number(s.monto)) : redondear(cuotas * this.cuotaAPagar);
    if (!(monto > 0) || (s.tipo === 'unica' && !/^\d{4}-\d{2}$/.test(s.fecha))) {
      const falta = libre ? 'Indica el monto del abono' : 'Indica las cuotas a abonar';
      Swal.fire({ icon: 'warning', title: falta + (s.tipo === 'unica' ? ' y el mes/año (AAAA-MM)' : ''), timer: 1800, showConfirmButton: false });
      return;
    }
    this.simulaciones.push({ ...s, cuotas, monto });
    this.recalcular();
  }

  // Tasa de prueba: solo para cuotas que aún no se pagan
  agregarTasaSimulada(): void {
    const tasa = Number(this.simTasa.tasa);
    const desde = Math.floor(Number(this.simTasa.desdeCuota) || this.cuotaSugeridaSim);
    const plazo = this.prestamo.hipoPlazo * 12;
    if (!(tasa > 0 && tasa < 100) || desde < this.real!.cuotaActualMes || desde > plazo) {
      Swal.fire({ icon: 'warning', title: `Indica la tasa y una cuota entre #${this.real!.cuotaActualMes} y #${plazo}`, timer: 2000, showConfirmButton: false });
      return;
    }
    this.simulaciones = this.simulaciones.filter(s => !(s.tipo === 'tasa' && s.desdeCuota === desde));
    this.simulaciones.push({ tipo: 'tasa', fecha: '', mes: 0, cuotas: 0, monto: 0, tasa, desdeCuota: desde });
    this.recalcular();
  }

  // Cuota (con seguros) que quedaría con esa tasa simulada
  cuotaSimulada(s: Simulacion): number | undefined {
    const f = this.sim?.filas[s.desdeCuota! - 1];
    return f ? f.cuota + this.prestamo.hipoSeguros : undefined;
  }

  quitarSimulacion(i: number): void {
    this.simulaciones.splice(i, 1);
    this.recalcular();
  }

  limpiarSimulaciones(): void {
    this.simulaciones = [];
    this.recalcular();
  }

  describirSimulacion(s: Simulacion): string {
    if (s.tipo === 'tasa') return `Tasa ${s.tasa}% desde la cuota #${s.desdeCuota}`;
    // Abonos por cuotas se describen en cuotas; los de monto libre (cuotas = 0) por su monto
    const cuotas = s.cuotas > 0
      ? `${s.cuotas} ${s.cuotas === 1 ? 'cuota' : 'cuotas'}`
      : 'RD$' + s.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (s.tipo === 'mensual') return `${cuotas} cada mes`;
    if (s.tipo === 'anual') return `${cuotas} cada ${this.meses[s.mes].toLowerCase()}`;
    const [ano, mes] = s.fecha.split('-');
    return `${cuotas} en ${this.meses[Number(mes) - 1].toLowerCase()} ${ano}`;
  }

  // Cuántas veces cae ese abono antes de saldar el préstamo
  vecesSimulacion(s: Simulacion): number {
    return this.sim ? this.sim.filas.filter(f => f.abonoSimulado > 0 && aplicaSimulacion(s, f.fechaVencimiento)).length : 0;
  }

  // ---------- Acciones ----------

  pagorCuota() {
    const cuotaTotal = this.cuotaAPagar;
    const mesApagar = this.real!.cuotaActualMes;
    const vence = this.real!.proxima?.fechaVencimiento;
    const venceTxt = vence ? ` · vence el ${vence.toLocaleDateString('es-DO', { day: 'numeric', month: 'long' })}` : '';

    Swal.fire({
      title: "Registrar pago",
      html:
      `<div class="hs-field" style="text-align:left">
          <label class="hs-label" for="montoPagar_ip">Monto pagado</label>
          <input id="montoPagar_ip" type="number" inputmode="decimal" value="${cuotaTotal.toFixed(2)}" class="hs-input">
          <p class="hs-help">Si pagas más de la cuota, la diferencia cuenta como abono extra.</p>
        </div>
        ${this.htmlAbono(true)}
        <div class="pago-cuota" id="cuotaInfo">
          <span>Para la cuota <strong>#${mesApagar}</strong>${venceTxt}</span>
          <button type="button" class="pago-cuota__cambiar" id="cuotaCambiar">Cambiar</button>
        </div>
        <div class="hs-field" id="cuotaCampo" style="text-align:left;margin-top:12px;display:none">
          <label class="hs-label" for="mesPagar_ip">Número de cuota</label>
          <input id="mesPagar_ip" type="number" inputmode="numeric" min="1" value="${mesApagar}" class="hs-input">
          <p class="hs-help">Solo si este pago corresponde a otra cuota.</p>
        </div>`,
      showCancelButton: true,
      confirmButtonText: "Siguiente",
      cancelButtonText: "Cancelar",
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      // El número de cuota casi nunca cambia: el campo se muestra solo si se pide
      didOpen: (popup) => {
        // Las opciones del abono solo aparecen si el monto pasa de la cuota
        const monto = popup.querySelector('#montoPagar_ip') as HTMLInputElement;
        monto.addEventListener('input', () =>
          (popup.querySelector('#abonoOpciones') as HTMLElement).style.display = Number(monto.value) > cuotaTotal + 0.01 ? '' : 'none');
        popup.querySelector('#cuotaCambiar')!.addEventListener('click', () => {
          (popup.querySelector('#cuotaInfo') as HTMLElement).style.display = 'none';
          (popup.querySelector('#cuotaCampo') as HTMLElement).style.display = '';
          (popup.querySelector('#mesPagar_ip') as HTMLInputElement).focus();
        });
      }
    }).then((result) => {
      if (result.isConfirmed) {
        try {
          var montoPagar = (<HTMLInputElement>document.getElementById('montoPagar_ip')).value
          var mesPagar = (<HTMLInputElement>document.getElementById('mesPagar_ip')).value

          if (montoPagar == "" || mesPagar == "")
            throw new TypeError("Inserte el monto y el mes");

          const extra = Number(montoPagar) - cuotaTotal;
          // El contrato pide que el abono a capital sea mayor a una cuota
          const aviso = extra > 0.01 && extra < cuotaTotal ? 'Ojo: tu contrato pide que el abono a capital sea mayor a una cuota.' : '';
          this.registrarPago(Number(montoPagar), Number(mesPagar), aviso, this.leerReduceCuota());
        }
        catch (error) {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error as string,
            showConfirmButton: true,
          }).then(() => {
            this.pagorCuota();
          });
        }
      }
    });
  }

  // Según el banco del préstamo: solo cuotas completas (selector de cuotas) o cualquier monto (monto libre)
  pagar() {
    this.prestamo.hipoAbonoLibre ? this.pagorCuota() : this.pagarPorCuotas();
  }

  cambiarAbono(libre: boolean) {
    if (this.prestamo.hipoAbonoLibre === libre) return;
    this.prestamo.hipoAbonoLibre = libre;
    this.guardarPreferencia(() => this.prestamo.hipoAbonoLibre = !libre);
  }

  // Guarda las preferencias del préstamo; si falla, deshace el cambio en pantalla
  private guardarPreferencia(deshacer: () => void) {
    this._dataservice.updateHipoteca(this.prestamo).subscribe(
      () => Swal.fire({ position: 'top-end', icon: 'success', title: 'Preferencia guardada', showConfirmButton: false, timer: 1200 }),
      (err) => {
        deshacer();
        Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: typeof err.error === 'string' ? err.error : '' });
      }
    );
  }

  // Pago en cuotas completas. La primera cubre la cuota del mes y el resto
  // el API lo registra como abono a capital (igual que pagar un monto mayor a mano).
  pagarPorCuotas() {
    const cuota = this.cuotaAPagar;
    const mes = this.real!.cuotaActualMes;
    const rd = (n: number) => 'RD$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const detalle = (n: number) => n === 1
      ? `Cubre la cuota #${mes}.`
      : `Cubre la cuota #${mes} y abona ${rd((n - 1) * cuota)} al capital.`;

    Swal.fire({
      title: 'Registrar pago',
      html:
        `<div class="hs-field" style="text-align:left">
          <span class="hs-label" id="cuotasLbl">Cuotas a pagar</span>
          <div class="pago-stepper" role="group" aria-labelledby="cuotasLbl">
            <button type="button" id="cuotasMenos" class="pago-stepper__btn" aria-label="Una cuota menos">−</button>
            <div class="pago-stepper__valor" aria-live="polite">
              <div id="cuotasN" class="pago-stepper__num">1</div>
              <div id="cuotasTotal" class="hs-eyebrow">${rd(cuota)}</div>
            </div>
            <button type="button" id="cuotasMas" class="pago-stepper__btn" aria-label="Una cuota más">+</button>
          </div>
          <p id="cuotasDetalle" class="hs-help">${detalle(1)}</p>
        </div>
        ${this.htmlAbono(true)}`,
      showCancelButton: true,
      confirmButtonText: 'Siguiente',
      cancelButtonText: 'Cancelar',
      didOpen: (popup) => {
        let n = 1;
        const el = (id: string) => popup.querySelector('#' + id) as HTMLElement;
        const pintar = () => {
          el('cuotasN').textContent = String(n);
          el('cuotasTotal').textContent = rd(n * cuota);
          el('cuotasDetalle').textContent = detalle(n);
          (el('cuotasMenos') as HTMLButtonElement).disabled = n <= 1;
          el('abonoOpciones').style.display = n > 1 ? '' : 'none';
        };
        el('cuotasMenos').addEventListener('click', () => { n = Math.max(1, n - 1); pintar(); });
        el('cuotasMas').addEventListener('click', () => { n = Math.min(99, n + 1); pintar(); });
        pintar();
      },
      preConfirm: () => ({ n: Number(document.getElementById('cuotasN')!.textContent), reduceCuota: this.leerReduceCuota() }),
    }).then((r) => {
      if (r.isConfirmed) this.registrarPago(redondear(r.value!.n * cuota), mes, detalle(r.value!.n), r.value!.reduceCuota);
    });
  }

  // Opciones del abono a capital en los diálogos de pago: por defecto, la preferencia del préstamo
  private htmlAbono(oculto: boolean): string {
    const cuota = this.prestamo.hipoReduceCuota;
    return `<div id="abonoOpciones" class="pago-abono" style="${oculto ? 'display:none' : ''}">
        <span class="hs-label" id="abonoLbl">El abono a capital…</span>
        <div class="pago-abono__opciones" role="radiogroup" aria-labelledby="abonoLbl">
          <label><input type="radio" name="abonoTipo" value="plazo" ${cuota ? '' : 'checked'}> Reduce el plazo</label>
          <label><input type="radio" name="abonoTipo" value="cuota" ${cuota ? 'checked' : ''}> Reduce la cuota</label>
        </div>
        <p class="hs-help">Los abonos a capital se hacen en sucursal. Si pagas de más por internet, el banco lo guarda como cuota adelantada y no baja el capital.</p>
      </div>`;
  }

  private leerReduceCuota(): boolean {
    return (document.querySelector('input[name=abonoTipo]:checked') as HTMLInputElement | null)?.value === 'cuota';
  }

  // Confirmación y registro del pago (lo usan el pago por cuotas y el pago con monto manual)
  private registrarPago(monto: number, mes: number, detalle = '', reduceCuota = false) {
    const extra = monto - this.cuotaAPagar > 0.01;
    Swal.fire({
      title: `¿Registrar un pago de RD$${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}?`,
      text: [detalle, extra ? `El abono ${reduceCuota ? 'reduce tu cuota' : 'reduce tu plazo'}.` : ''].filter(t => t).join(' '),
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: "Registrar",
      denyButtonText: `Cancelar`
    }).then((resultConfirm) => {
      if (!resultConfirm.isConfirmed) return;
      this.loading = true;

      var pago = new Pagos();
      pago.pagoMonto = monto;
      pago.pagoMesAnticipado = mes;
      pago.hipoId = this.prestamo.hipoId;
      pago.pagoReduceCuota = extra && reduceCuota;

      this._dataservice.postPago(pago).subscribe(
        () => {
          this.loading = false;
          Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: '¡Pago registrado!',
            showConfirmButton: false,
            timer: 1500
          }).then(() => {
            window.location.reload();
          });
        },
        (err) => {
          this.loading = false;
          console.error(err.error);
          Swal.fire({
            position: 'center',
            icon: 'error',
            title: err.error,
            showConfirmButton: false,
            timer: 1500,
          });
        }
      );
    });
  }

  borrarCuota(id: any) {
    Swal.fire({
      title: "¿Borrar este pago?",
      text: "La cuota volverá a quedar pendiente.",
      showDenyButton: true,
      confirmButtonText: "Sí, borrar",
      denyButtonText: `Cancelar`
    }).then((resultConfirm) => {
      if (resultConfirm.isConfirmed) {
        this.loading = true;
        this._dataservice.deletePago(id).subscribe(
          () => {
            this.loading = false;
            Swal.fire({
              position: 'top-end',
              icon: 'success',
              title: 'Pago borrado',
              showConfirmButton: false,
              timer: 1500
            }).then(() => {
              window.location.reload();
            });
          },
          (err) => {
            this.loading = false;
            console.error(err.error);
            Swal.fire({
              position: 'center',
              icon: 'error',
              title: err.error,
              showConfirmButton: false,
              timer: 1500,
            });
          }
        );
      }
    });
  }

  borrarHipoteca() {
    Swal.fire({
      title: "¿Eliminar esta hipoteca?",
      text: "Se borran también todos sus pagos. No se puede deshacer.",
      icon: 'warning',
      showDenyButton: true,
      confirmButtonText: "Sí, eliminar",
      denyButtonText: `Cancelar`
    }).then((resultConfirm) => {
      if (resultConfirm.isConfirmed) {
        this.loading = true;
        this._dataservice.deleteHipoteca(this.prestamo.hipoId).subscribe(
          () => {
            this.loading = false;
            Swal.fire({
              position: 'top-end',
              icon: 'success',
              title: 'Hipoteca eliminada',
              showConfirmButton: false,
              timer: 1500
            }).then(() => this._router.navigateByUrl('/'));
          },
          (err) => {
            this.loading = false;
            console.error(err.error);
            Swal.fire({
              position: 'center',
              icon: 'error',
              title: err.error,
              showConfirmButton: false,
              timer: 1500,
            });
          }
        );
      }
    });
  }
}
