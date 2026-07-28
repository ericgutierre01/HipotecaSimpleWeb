import { Pagos } from 'src/app/Entities/Pagos';
export class Hipoteca {
  hipoId: number;
  hipoInteres: number;        
  hipoPlazo: number;   
  hipoMonto: number;   
  hipoSeguros: number;   
  hipoCuota: number;   
  hipoCuotaTotal: number;   
  usuId: number; 
  hipoFecha: Date;
  hipoDiaPago: number;
  hipoBanco: string;
  pagos: Pagos[]; 

  constructor() {
      this.hipoId = 0;
      this.hipoInteres = 0;
      this.hipoPlazo = 0;
      this.hipoMonto = 0;
      this.hipoSeguros = 0;
      this.hipoCuota = 0;
      this.hipoCuotaTotal = 0;
      this.usuId = 0;
      this.hipoBanco = "";
      this.hipoDiaPago = 0;
      this.hipoFecha = new Date();
      this.pagos = [new Pagos()];
  }
}
