import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataService } from 'src/app/services/services/data.service';
import Swal from 'sweetalert2';

// Se abre desde el enlace del correo (#/Restablecer?token=...) para crear la nueva contraseña
@Component({
  selector: 'app-restablecer',
  templateUrl: './restablecer.component.html',
})
export class RestablecerComponent {

  token: string;
  password = '';
  confirmar = '';
  verClave = false;
  loading = false;
  listo = false;

  constructor(private _dataservice: DataService, route: ActivatedRoute) {
    this.token = route.snapshot.queryParamMap.get('token') || '';
  }

  guardar() {
    const error =
      this.password.length < 8 ? 'La contraseña debe tener al menos 8 caracteres.' :
      this.password !== this.confirmar ? 'Las contraseñas no coinciden.' : '';
    if (error) {
      Swal.fire({ icon: 'warning', title: error });
      return;
    }
    this.loading = true;
    this._dataservice.postRestablecer(this.token, this.password).subscribe(
      () => {
        this.loading = false;
        this.listo = true;
      },
      (err) => {
        this.loading = false;
        Swal.fire({ icon: 'error', title: err.error || 'No se pudo cambiar la contraseña' });
      }
    );
  }
}
