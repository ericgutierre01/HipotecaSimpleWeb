export class Amortizacion {

  ano : string;
  mes: number;
  cuota : number;
  interes: number;
  capital: number;
  pendiente: number;
  anticipado: number;
  fecha: string;
  id:number;

  constructor() {
    this.ano = '';
    this.mes = 0;
    this.cuota = 0;
    this.interes = 0;
    this.fecha = '';
    this.capital = 0;
    this.pendiente = 0;
    this.anticipado = 0;
    this.id = 0;
  }
}

