import { Component, OnInit } from '@angular/core';
import { DataService } from 'src/app/services/services/data.service';
import { Hipoteca } from 'src/app/Entities/Hipoteca';
import Swal from 'sweetalert2'
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-hipoteca-crear',
  templateUrl: './hipoteca-crear.component.html',
  styleUrls: ['./hipoteca-crear.component.css']
})
export class HipotecaCrearComponent implements OnInit {

  loading = false;
  hipoteca = new Hipoteca;

  constructor(
    private _dataservice: DataService,
    private _router: Router,
    private location: Location,
    private _activeRoute: ActivatedRoute
  ) { }

  ngOnInit(): void {
  }


  Submit() {
    try {
      this.loading = true;

      if ((<HTMLOptionElement>document.getElementById('montoHipo_ip')).value == "")
        throw new TypeError("El monto es necesario");

      if ((<HTMLOptionElement>document.getElementById('interes_ip')).value == "")
        throw new TypeError("El interes es necesario");

      if ((<HTMLOptionElement>document.getElementById('plazo_ip')).value == "")
        throw new TypeError("El plazo es necesario");

      this.hipoteca.hipoMonto = Number((<HTMLOptionElement>document.getElementById('montoHipo_ip')).value.replace(/ /g, '').replace(/,/g, ''));
      this.hipoteca.hipoInteres = Number((<HTMLOptionElement>document.getElementById('interes_ip')).value.replace(/ /g, ''));
      this.hipoteca.hipoPlazo = Number((<HTMLOptionElement>document.getElementById('plazo_ip')).value.replace(/ /g, ''));
      this.hipoteca.hipoSeguros = Number((<HTMLOptionElement>document.getElementById('montoSeguro_ip')).value.replace(/ /g, '').replace(/,/g, ''));

      this.hipoteca.hipoBanco = (<HTMLOptionElement>document.getElementById('banco_ip')).value;
      this.hipoteca.hipoDiaPago = Number((<HTMLOptionElement>document.getElementById('diaPago_ip')).value);

      this.loading = true;
      this._dataservice.postHipoteca(this.hipoteca).subscribe(
        res => {
          Swal.fire({
            position: 'top-end',
            icon: 'success',
            title: 'Hipoteca Agregada',
            showConfirmButton: true,
          }).then(() => {
            try {
              let prevUrl = document.referrer;
              if (prevUrl.indexOf(window.location.host) !== -1)
                this.location.back();
              else
                this._router.navigateByUrl('/');
            } catch (error) {
              this._router.navigateByUrl('/');
            }

          })
        },

        error => {
          this.loading = false;
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: error.error,
            timer: 1500
          })
          console.log(error)

        }
      )

    } catch (TypeError) {
      this.loading = false;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: TypeError as string,
        showConfirmButton: true,
      });
      console.log(TypeError);
    }
  }

  Cancelar() {
    try {
      let prevUrl = document.referrer;
      if (prevUrl.indexOf(window.location.host) !== -1)
        this.location.back();
      else
        this._router.navigateByUrl('/');
    } catch (error) {
      this._router.navigateByUrl('/');
    }
  }


  calcularCuotaMensual() {

    console.log("asdasda")
    var monto =  Number((<HTMLOptionElement>document.getElementById('montoHipo_ip')).value.replace(/ /g, '').replace(/,/g, ''))
    var tasa = Number((<HTMLOptionElement>document.getElementById('interes_ip')).value.replace(/ /g, ''))
    var plazo = Number((<HTMLOptionElement>document.getElementById('plazo_ip')).value.replace(/ /g, ''))
    var seguro = Number((<HTMLOptionElement>document.getElementById('montoSeguro_ip')).value.replace(/ /g, '').replace(/,/g, ''))
    

    if(monto > 0 && tasa > 0 && plazo > 0){
        // Convertir la tasa de interés anual a mensual dividiéndola entre 12 y por 100 para pasarla a formato decimal
      const tasaInteresMensual = (tasa / 12) / 100;
      // Convertir el plazo de años a meses
      const plazoMeses = plazo * 12;

      // Calcular la cuota mensual
      var cuota = (monto * tasaInteresMensual / (1 - Math.pow(1 + tasaInteresMensual, -plazoMeses))) + seguro;

      var peso = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    });
      (<HTMLOptionElement>document.getElementById('cuotaTotal_ip')).value =   "RD" +  peso.format(cuota); 
    }

  }

}
