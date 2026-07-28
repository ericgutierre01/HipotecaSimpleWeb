export class Usuarios {
  usuID: number;
  usuStatus: number;
  usuNombre: string;
  usuSesion: string;
  usuPass: string;
  empId: number;
  usuFechaCreacion: Date;
  token: string | null;

  constructor() {
      this.usuID = 0;
      this.usuStatus = 0;
      this.usuNombre = '';
      this.usuSesion = '';
      this.usuPass = '';
      this.empId = 0;
      this.usuFechaCreacion = new Date();
      this.token = null;
  }
}

export class LoginViewModel {
  user: string;
  password: string;

  constructor() {
      this.user = '';
      this.password = '';
  }
}