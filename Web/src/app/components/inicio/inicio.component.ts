import { Component, OnInit } from '@angular/core';
import { Hipoteca } from 'src/app/Entities/Hipoteca';
import { DataService } from 'src/app/services/services/data.service';
import { calcularAmortizacion, ResultadoAmortizacion, textoVencimiento, diasHasta } from 'src/app/services/amortizacion';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2'

interface Tarjeta {
  prestamo: Hipoteca;
  r: ResultadoAmortizacion;
}

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css'],
})
export class InicioComponent implements OnInit {

  loading = false;
  tarjetas: Tarjeta[] = [];
  deudaTotal = 0;
  proximoPago?: { fecha: Date, monto: number, texto: string, vencido: boolean };

  constructor(private _dataservice: DataService) { }

  noLeidas = 0;

  ngOnInit(): void {
    this.getHipotecas();
    this._dataservice.getNotificaciones().subscribe(r => this.noLeidas = r.noLeidas, () => { });
  }

  // La lista no trae los pagos: se pide el detalle de cada préstamo para calcular saldo y progreso
  getHipotecas() {
    this.loading = true;
    this._dataservice.getMisHipotecas().subscribe(
      (lista: Hipoteca[]) => {
        if (!lista.length) {
          this.loading = false;
          this.tarjetas = [];
          return;
        }
        forkJoin(lista.map(h => this._dataservice.getHipotecaById(h.hipoId))).subscribe(
          (prestamos: Hipoteca[]) => {
            this.loading = false;
            this.tarjetas = prestamos.map(p => ({ prestamo: p, r: calcularAmortizacion(p, p.hipoReduceCuota ? 2 : 1) }));
            this.calcularResumen();
          },
          (err) => this.mostrarError(err)
        );
      },
      (err) => this.mostrarError(err)
    );
  }

  calcularResumen() {
    this.deudaTotal = this.tarjetas.reduce((t, c) => t + c.r.saldoActual, 0);
    const proximas = this.tarjetas
      .filter(c => c.r.proxima)
      .sort((a, b) => a.r.proxima!.fechaVencimiento.getTime() - b.r.proxima!.fechaVencimiento.getTime());
    const p = proximas[0];
    this.proximoPago = p ? {
      fecha: p.r.proxima!.fechaVencimiento,
      monto: p.r.cuotaTotalProxima,
      texto: textoVencimiento(p.r.proxima!.fechaVencimiento),
      vencido: diasHasta(p.r.proxima!.fechaVencimiento) < 0,
    } : undefined;
  }

  mostrarError(err: any) {
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
}
