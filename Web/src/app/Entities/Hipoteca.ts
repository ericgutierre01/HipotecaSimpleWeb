import { Pagos } from 'src/app/Entities/Pagos';
import { TasaHipoteca } from 'src/app/Entities/TasaHipoteca';
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
  hipoAbonoLibre: boolean; // false = el banco solo acepta cuotas completas
  hipoMesesFijos: number | null; // meses de tasa fija desde el inicio; null = fija todo el plazo
  hipoMesesRevision: number | null; // después del periodo fijo, cada cuántos meses se revisa la tasa
  hipoReduceCuota: boolean; // false = los abonos reducen el plazo; true = reducen la cuota
  pagos: Pagos[]; 
  tasas: TasaHipoteca[];

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
      this.hipoAbonoLibre = false;
      this.hipoMesesFijos = null;
      this.hipoMesesRevision = null;
      this.hipoReduceCuota = false;
      this.tasas = [];
      this.hipoDiaPago = 0;
      this.hipoFecha = new Date();
      this.pagos = [new Pagos()];
  }
}
