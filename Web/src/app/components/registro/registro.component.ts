import { Component } from '@angular/core';
import { DataService } from 'src/app/services/services/data.service';
import Swal from 'sweetalert2';

// Solicitud de cuenta: queda pendiente hasta que el administrador la aprueba desde su correo
@Component({
  selector: 'app-registro',
  templateUrl: './registro.component.html',
})
export class RegistroComponent {

  form = { nombre: '', usuario: '', email: '', password: '', confirmar: '' };
  verClave = false;
  loading = false;
  enviado = false;

  constructor(private _dataservice: DataService) { }

  enviar() {
    const f = this.form;
    // Mismas reglas que valida el API; aquí solo para avisar antes de enviar
    const error =
      f.nombre.trim().length < 2 ? 'Escribe tu nombre.' :
      !/^[A-Za-z0-9._-]{3,50}$/.test(f.usuario.trim()) ? 'El usuario debe tener de 3 a 50 caracteres: letras, números, punto, guion o guion bajo.' :
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim()) ? 'Escribe un correo válido.' :
      f.password.length < 8 ? 'La contraseña debe tener al menos 8 caracteres.' :
      f.password !== f.confirmar ? 'Las contraseñas no coinciden.' : '';
    if (error) {
      Swal.fire({ icon: 'warning', title: error });
      return;
    }

    this.loading = true;
    this._dataservice.postRegistro({ nombre: f.nombre, usuario: f.usuario, email: f.email, password: f.password }).subscribe(
      () => {
        this.loading = false;
        this.enviado = true;
      },
      (err) => {
        this.loading = false;
        Swal.fire({ icon: 'error', title: err.error || 'No se pudo enviar la solicitud' });
      }
    );
  }
}
