export class Pagos {

  pagoId : number;
  hipoId: number;
  pagoFecha : Date;
  pagoMonto: number;
  pagoMontoAnticipado: number;
  pagoMesAnticipado: number;
  pagoReduceCuota: boolean; // el abono a capital reduce la cuota (false = reduce el plazo)

  constructor() {
    this.pagoId = 0;
    this.hipoId = 0;
    this.pagoMonto = 0;
    this.pagoMontoAnticipado = 0;
    this.pagoFecha = new Date();
    this.pagoMesAnticipado = 0;
    this.pagoReduceCuota = false;
  }
}

