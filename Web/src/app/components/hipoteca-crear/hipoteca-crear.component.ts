import { Component } from '@angular/core';
import { DataService } from 'src/app/services/services/data.service';
import { Hipoteca } from 'src/app/Entities/Hipoteca';
import { calcularCuotaMensual } from 'src/app/services/amortizacion';
import Swal from 'sweetalert2'
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-hipoteca-crear',
  templateUrl: './hipoteca-crear.component.html',
  styleUrls: ['./hipoteca-crear.component.css']
})
export class HipotecaCrearComponent {

  loading = false;
  plazos = [10, 15, 20, 25, 30];
  form = { banco: '', monto: '', tasa: '', plazo: 20 as number | null, seguros: '', dia: '', abonoLibre: false, mesesFijos: null as number | null, mesesRevision: 6 as number | null };
  // Años de tasa fija más comunes; null = fija todo el plazo
  aniosFijos = [1, 2, 3, 5];

  constructor(
    private _dataservice: DataService,
    private _router: Router,
    private location: Location
  ) { }

  // ngx-mask devuelve el número sin separadores; vacío = 0
  private num(v: any): number {
    return Number(String(v ?? '').replace(/,/g, '')) || 0;
  }

  get monto() { return this.num(this.form.monto); }
  get tasa() { return this.num(this.form.tasa); }
  get plazo() { return this.num(this.form.plazo); }
  get seguros() { return this.num(this.form.seguros); }

  get listo(): boolean {
    return this.monto > 0 && this.tasa > 0 && this.plazo > 0;
  }

  get cuota(): number {
    return this.listo ? calcularCuotaMensual(this.monto, this.tasa, this.plazo) : 0;
  }

  get totalPagar(): number {
    return this.cuota * this.plazo * 12;
  }

  // El API registra la hipoteca con la fecha de hoy: la primera cuota vence este mes
  get primeraCuota(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), this.num(this.form.dia) || hoy.getDate());
  }

  get ultimaCuota(): Date {
    const p = this.primeraCuota;
    return new Date(p.getFullYear(), p.getMonth() + this.plazo * 12 - 1, p.getDate());
  }

  Submit() {
    const dia = this.num(this.form.dia);
    const error =
      !(this.monto > 0) ? 'Indica el monto del préstamo' :
      !(this.tasa > 0) ? 'Indica la tasa de interés' :
      !(this.plazo > 0) ? 'Indica el plazo en años' :
      (dia < 0 || dia > 31) ? 'El día de pago debe estar entre 1 y 31' : '';
    if (error) {
      Swal.fire({ icon: 'warning', title: error, showConfirmButton: true });
      return;
    }

    const hipoteca = new Hipoteca();
    hipoteca.hipoBanco = this.form.banco.trim();
    hipoteca.hipoMonto = this.monto;
    hipoteca.hipoInteres = this.tasa;
    hipoteca.hipoPlazo = this.plazo;
    hipoteca.hipoSeguros = this.seguros;
    hipoteca.hipoDiaPago = dia;
    hipoteca.hipoAbonoLibre = this.form.abonoLibre;
    hipoteca.hipoMesesFijos = this.form.mesesFijos && this.form.mesesFijos < this.plazo * 12 ? this.form.mesesFijos : null;
    hipoteca.hipoMesesRevision = hipoteca.hipoMesesFijos ? this.form.mesesRevision : null;

    this.loading = true;
    this._dataservice.postHipoteca(hipoteca).subscribe(
      () => {
        this.loading = false;
        Swal.fire({
          position: 'top-end',
          icon: 'success',
          title: 'Hipoteca agregada',
          showConfirmButton: false,
          timer: 1500
        }).then(() => this._router.navigateByUrl('/'));
      },
      error => {
        this.loading = false;
        Swal.fire({ icon: 'error', title: 'Oops...', text: error.error, timer: 2500 });
        console.log(error);
      }
    );
  }

  Cancelar() {
    if (document.referrer.indexOf(window.location.host) !== -1)
      this.location.back();
    else
      this._router.navigateByUrl('/');
  }
}
