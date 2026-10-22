import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DataService } from 'src/app/services/services/data.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.component.html',
  styleUrls: ['./perfil.component.css']
})
export class PerfilComponent implements OnInit {

  loading = true;
  guardando = false;
  usuario = '';
  datos = { nombre: '', email: '' };
  clave = { actual: '', nueva: '', confirmar: '' };
  verClave = false;

  constructor(private _dataservice: DataService, private _route: ActivatedRoute) { }

  ngOnInit(): void {
    this._dataservice.getPerfil().subscribe(
      (p) => {
        this.loading = false;
        this.usuario = p.usuSesion;
        this.datos = { nombre: p.usuNombre, email: p.usuEmail };
        // Desde la campana se llega con #notificaciones: se baja a esa sección cuando ya se dibujó
        const seccion = this._route.snapshot.fragment;
        if (seccion) setTimeout(() => document.getElementById(seccion)?.scrollIntoView({ behavior: 'smooth' }));
      },
      (err) => this.error(err, 'No se pudo cargar tu perfil')
    );
  }

  get iniciales(): string {
    return this.datos.nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0] || '').join('').toUpperCase() || '?';
  }

  guardarDatos() {
    const error =
      this.datos.nombre.trim().length < 2 ? 'Escribe tu nombre.' :
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.datos.email.trim()) ? 'Escribe un correo válido.' : '';
    if (error) {
      Swal.fire({ icon: 'warning', title: error });
      return;
    }
    this.guardando = true;
    this._dataservice.postPerfil(this.datos).subscribe(
      () => {
        this.guardando = false;
        localStorage.setItem('nombre', this.datos.nombre.trim());
        Swal.fire({ position: 'top-end', icon: 'success', title: 'Perfil actualizado', showConfirmButton: false, timer: 1500 });
      },
      (err) => this.error(err, 'No se pudo guardar')
    );
  }

  cambiarClave() {
    const c = this.clave;
    const error =
      !c.actual ? 'Escribe tu contraseña actual.' :
      c.nueva.length < 8 ? 'La nueva contraseña debe tener al menos 8 caracteres.' :
      c.nueva !== c.confirmar ? 'Las contraseñas nuevas no coinciden.' : '';
    if (error) {
      Swal.fire({ icon: 'warning', title: error });
      return;
    }
    this.guardando = true;
    this._dataservice.postCambiarClave(c.actual, c.nueva).subscribe(
      () => {
        this.guardando = false;
        this.clave = { actual: '', nueva: '', confirmar: '' };
        Swal.fire({ position: 'top-end', icon: 'success', title: 'Contraseña actualizada', showConfirmButton: false, timer: 1500 });
      },
      (err) => this.error(err, 'No se pudo cambiar la contraseña')
    );
  }

  cerrarSesion() {
    Swal.fire({
      title: '¿Cerrar sesión?',
      showDenyButton: true,
      confirmButtonText: 'Cerrar sesión',
      denyButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("token");
        localStorage.removeItem("lastUrl");
        window.location.reload();
      }
    });
  }

  private error(err: any, titulo: string) {
    this.loading = false;
    this.guardando = false;
    Swal.fire({ icon: 'error', title: titulo, text: typeof err.error === 'string' ? err.error : '' });
  }
}
