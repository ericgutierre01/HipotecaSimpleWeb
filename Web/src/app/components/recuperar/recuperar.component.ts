import { Component } from '@angular/core';
import { DataService } from 'src/app/services/services/data.service';
import Swal from 'sweetalert2';

// Pide un enlace por correo para crear una nueva contraseña
@Component({
  selector: 'app-recuperar',
  templateUrl: './recuperar.component.html',
})
export class RecuperarComponent {

  email = '';
  loading = false;
  mensaje = '';

  constructor(private _dataservice: DataService) { }

  enviar() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email.trim())) {
      Swal.fire({ icon: 'warning', title: 'Escribe tu correo' });
      return;
    }
    this.loading = true;
    this._dataservice.postRecuperar(this.email).subscribe(
      (res) => {
        this.loading = false;
        this.mensaje = res;
      },
      (err) => {
        this.loading = false;
        Swal.fire({ icon: 'error', title: err.error || 'No se pudo enviar el correo' });
      }
    );
  }
}
