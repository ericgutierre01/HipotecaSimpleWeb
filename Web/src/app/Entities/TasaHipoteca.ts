// Cambio de tasa: desde la cuota tasaDesdeCuota el préstamo paga tasaValor (% anual)
export interface TasaHipoteca {
  tasaId: number;
  hipoId: number;
  tasaDesdeCuota: number;
  tasaValor: number;
  tasaFecha?: string;
}
