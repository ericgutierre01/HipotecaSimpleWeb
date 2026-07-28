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

  // Mes de la "cuota actual" (la próxima a pagar) para resaltar y hacer scroll
  cuotaActualMes = 0;
  // Meses de cuotas pagadas que el usuario expandió manualmente (en móvil)
  expandidas = new Set<number>();

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
        // Al abrir la hipoteca, saltar directo a la cuota actual (evita scroll manual)
        setTimeout(() => this.irACuotaActual(), 350);
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

  // ¿La cuota está pagada? (tiene fecha registrada)
  esPagada(cuota: Amortizacion): boolean {
    return cuota.fecha != null && cuota.fecha !== '';
  }

  // ¿Se muestra compacta? (pagada y no expandida manualmente) — solo afecta en móvil vía CSS
  esColapsada(cuota: Amortizacion): boolean {
    return this.esPagada(cuota) && !this.expandidas.has(cuota.mes);
  }

  // ¿Es la cuota actual (próxima a pagar)?
  esCuotaActual(cuota: Amortizacion): boolean {
    return cuota.mes === this.cuotaActualMes && !this.esPagada(cuota);
  }

  // Expandir/compactar una cuota pagada al tocarla (móvil)
  toggleCuota(cuota: Amortizacion): void {
    if (!this.esPagada(cuota)) { return; }
    if (this.expandidas.has(cuota.mes)) {
      this.expandidas.delete(cuota.mes);
    } else {
      this.expandidas.add(cuota.mes);
    }
  }

  // Hacer scroll suave hasta la cuota actual, centrándola en pantalla
  irACuotaActual(): void {
    const el = document.getElementById('cuota-actual');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    // Base para calcular la fecha de vencimiento de cada cuota
    const fechaCreacion = new Date(this.prestamo.hipoFecha);
    const diaPago = Number(this.prestamo.hipoDiaPago) || fechaCreacion.getDate();

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
      // Vencimiento: la primera cuota vence el mismo mes de creación, y las siguientes un mes por cuota
      item.fechaVencimiento = new Date(fechaCreacion.getFullYear(), fechaCreacion.getMonth() + (mes - 1), diaPago);
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
        // Años completos (truncado, NO redondeado) y meses sobrantes
        var anos = Math.floor(tiempoRestante / 12)
        var meses = tiempoRestante % 12

        var anosString = anos > 0 ? `${anos} ${anos === 1 ? 'año' : 'años'}` : '';
        var mesesString = meses > 0 ? `${meses} ${meses === 1 ? 'mes' : 'meses'}` : '';
        var letra = anosString !== '' && mesesString !== '' ? ' y ' : '';
        this.tiempoAhorrado = `${anosString}${letra}${mesesString}`.trim() || '0 meses';
        break;
      }
    }

    // La cuota actual es la que sigue al último mes ya pagado (o la primera si no hay pagos)
    const pagadas = this.tablaAnortizacion.filter(e => this.esPagada(e));
    this.cuotaActualMes = pagadas.length > 0
      ? Math.max(...pagadas.map(p => p.mes)) + 1
      : 1;
  }
}
