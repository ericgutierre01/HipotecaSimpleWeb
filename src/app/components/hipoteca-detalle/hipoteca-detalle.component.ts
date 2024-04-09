import { Component, OnInit } from '@angular/core';
import { DataService } from 'src/app/services/services/data.service';
import { Hipoteca } from 'src/app/Entities/Hipoteca';
import { Amortizacion } from 'src/app/Entities/Amortizacion';
import Swal from 'sweetalert2'
import { Router, ActivatedRoute } from '@angular/router';
import { Pagos } from 'src/app/Entities/Pagos';


@Component({
  selector: 'app-hipoteca-detalle',
  templateUrl: './hipoteca-detalle.component.html',
  styleUrls: ['./hipoteca-detalle.component.css']
})
export class HipotecaDetalleComponent implements OnInit {

  constructor(
    private _dataservice: DataService,
    private _activeRoute: ActivatedRoute
  ) { }

  prestamo = new Hipoteca;
  cuotasPagadas: any;
  loading = false;

  totalPagar = 0;
  interesesPagar = 0;
  cuotasRestantes = 0;
  interesAhorrado = 0;
  tiempoAhorrado = '';
  tipo = 1;
  newCuota = 0

  tablaAnortizacion = [new Amortizacion()];

  ngOnInit(): void {
    this._activeRoute.params.subscribe(params => {
      this.getHipotecaID(params['id']);
    });
  }

  getHipotecaID(hipoId: any) {
    this.loading = true;
    this._dataservice.getHipotecaById(hipoId).subscribe(
      (res) => {
        this.loading = false;
        this.prestamo = res;
        this.generarTablaAmortizacion();
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

  pagorCuota() {

    var cuotaTotal = this.tipo == 1? this.prestamo.hipoCuotaTotal : (this.prestamo.hipoSeguros + this.newCuota)
    var mes = this.tablaAnortizacion.filter((ele:Amortizacion) => ele.fecha != '');
    
    var mesApagar = 1
    if(mes.length > 0){
      mesApagar = mes[mes.length-1].mes + 1   
    }

    Swal.fire({
      title: "Pagar cuota",
      html:
      `<div class="row">
        <div class="col-md-12">
            <label class="form-label">Monto:</label>
            <input id="montoPagar_ip" type="number" value="${cuotaTotal.toFixed(2)}" placeholder="Monto"class="form-control">
        </div>
        <div class="col-md-12 mt-2">
        </div>
        <div class="col-md-12 mt-2">
          <label class="form-label">Mes de la hipoteca a pagar:</label>
          <input id="mesPagar_ip"  type="number" value="${mesApagar}" placeholder="Monto"class="form-control">
        </div>
      </div>`,
      showCancelButton: true,
      confirmButtonText: "Siguiente",
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading()
    }).then((result) => {
      if (result.isConfirmed) {


        try {

          var montoPagar = (<HTMLOptionElement>document.getElementById('montoPagar_ip')).value
          var mesPagar = (<HTMLOptionElement>document.getElementById('mesPagar_ip')).value

          if(montoPagar == "" || mesPagar=="")
            throw new TypeError("Inserte el monto y el mes");

            Swal.fire({
              title: "Esta seguro que desea pagar RD$" + (<HTMLOptionElement>document.getElementById('montoPagar_ip')).value,
              showDenyButton: true,
              showCancelButton: false,
              confirmButtonText: "Pagar",
              denyButtonText: `Cancelar`
            }).then((resultConfirm) => {
              /* Read more about isConfirmed, isDenied below */
              if (resultConfirm.isConfirmed) {
                this.loading = true;

                var pago = new Pagos();
                pago.pagoMonto = Number(montoPagar);
                pago.pagoMesAnticipado = Number(mesPagar);
                pago.hipoId = this.prestamo.hipoId;

                this._dataservice.postPago(pago).subscribe(
                  (res) => {
                    this.loading = false;
                    Swal.fire({
                      position: 'top-end',
                      icon: 'success',
                      title: 'Cuota pagada correctamente!',
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
              else{

              }
            });

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
          console.log(TypeError);
        }
      }

    });
  }

  borrarCuota(id:any) {
    try {
        Swal.fire({
          title: "Esta seguro que desea borrar esta cuota?",
          showDenyButton: true,
          showCancelButton: false,
          confirmButtonText: "si borrar",
          denyButtonText: `Cancelar`
        }).then((resultConfirm) => {
          /* Read more about isConfirmed, isDenied below */
          if (resultConfirm.isConfirmed) {
            this.loading = true;
            this._dataservice.deletePago(id).subscribe(
              (res) => {
                this.loading = false;
                Swal.fire({
                  position: 'top-end',
                  icon: 'success',
                  title: 'Cuota borrada correctamente!',
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
          else{

          }
        });

    }
    catch (error) {
      this.loading = false;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error as string,
        showConfirmButton: true,
      });
      console.log(TypeError);
    }
  }

  calcularCuotaMensual(monto: any, tasa: any, plazo: any) {
    // Convertir la tasa de interés anual a mensual dividiéndola entre 12 y por 100 para pasarla a formato decimal
    const tasaInteresMensual = (tasa / 12) / 100;
    // Convertir el plazo de años a meses
    const plazoMeses = plazo * 12;

    // Calcular la cuota mensual
    const cuota = monto * tasaInteresMensual / (1 - Math.pow(1 + tasaInteresMensual, -plazoMeses));
    return cuota;
  }

  generarTablaAmortizacion() {

    this.totalPagar = this.prestamo.hipoCuota * (this.prestamo.hipoPlazo * 12);
    this.interesesPagar = this.totalPagar - this.prestamo.hipoMonto;
    this.tablaAnortizacion = [];

    let cuotaMensual = this.calcularCuotaMensual(this.prestamo.hipoMonto, this.prestamo.hipoInteres, this.prestamo.hipoPlazo);
    let saldo = this.prestamo.hipoMonto;
    this.interesAhorrado = 0;
    let plazoRestante = this.prestamo.hipoPlazo * 12;

    for (let mes = 1; mes <= plazoRestante; mes++) {
      let pagoAnticipado = this.prestamo.pagos.find(pago => pago.pagoMesAnticipado === mes);
      let montoPagoAnticipado = pagoAnticipado ? pagoAnticipado.pagoMontoAnticipado : 0;
      let fechaPagoAnticipado = pagoAnticipado ? pagoAnticipado.pagoFecha.toString() : '';
      let idPago = pagoAnticipado ? pagoAnticipado.pagoId : 0;

      let interesMensual = saldo * (this.prestamo.hipoInteres / 12 / 100);
      let capital = cuotaMensual - interesMensual;

      saldo -= capital; // Pagar el capital del mes actual

      // Aquí se debería ajustar el interesAhorrado si es necesario
      this.interesAhorrado += interesMensual;

      var item = new Amortizacion()
      item.ano = (((mes - 1) / 12) + 1).toString().split('.')[0];
      item.mes = mes;
      item.cuota = cuotaMensual;
      item.interes = interesMensual;
      item.fecha = fechaPagoAnticipado;
      item.capital = capital;
      item.pendiente = saldo;
      item.id =idPago;
      item.anticipado = montoPagoAnticipado > 0 ? montoPagoAnticipado : 0;

      this.tablaAnortizacion.push(item);


      if (montoPagoAnticipado > 0) {
        saldo -= montoPagoAnticipado; // Aplicar pago anticipado directamente al saldo

        if ((<HTMLOptionElement>document.getElementById('tipo_s')).value == '2') {
          // Reducir la cuota: Recalcular la cuota mensual con el saldo restante
          cuotaMensual = this.calcularCuotaMensual(saldo, this.prestamo.hipoInteres, (plazoRestante - mes) / 12);
          this.newCuota = cuotaMensual;
          this.tipo = 2;
        } else if ((<HTMLOptionElement>document.getElementById('tipo_s')).value == '1') {
          // Reducir el tiempo: mantener la cuota igual, pero se pagarán menos cuotas en total
          // No es necesario ajustar la cuota mensual aquí
          this.tipo = 1;
        }
      }


      // Verificar y ajustar el saldo para evitar saldo negativo
      if (saldo <= 0) {
        this.cuotasRestantes = this.tablaAnortizacion.length;
        this.interesAhorrado = this.interesesPagar - this.interesAhorrado;

        var tiempoRestante = (this.prestamo.hipoPlazo * 12) - this.tablaAnortizacion.length
        var anos = tiempoRestante / 12
        var meses = tiempoRestante % 12

        var anosString = anos < 1 ? '' : `${anos.toFixed(0)} años`;
        var mesesString = meses > 0 ? `${meses} meses` : '';
        var letra = meses > 0 && anosString != '' ? 'y' : '';
        this.tiempoAhorrado = `${anosString} ${letra} ${mesesString}`
        break;
      }
    }
  }
}
