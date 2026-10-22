import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from 'src/app/services/services/data.service';

interface Notificacion {
  id: number;
  titulo: string;
  cuerpo: string;
  url: string;
  leida: boolean;
  fecha: string;
}

// Historial de la campana: recordatorios de pago y avisos de prueba
@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.component.html',
  styleUrls: ['./notificaciones.component.css']
})
export class NotificacionesComponent implements OnInit {

  loading = true;
  items: Notificacion[] = [];
  noLeidas = 0;

  constructor(private _dataservice: DataService, private _router: Router) { }

  ngOnInit(): void {
    this._dataservice.getNotificaciones().subscribe(
      (r) => {
        this.loading = false;
        this.items = r.items;
        this.noLeidas = r.noLeidas;
      },
      () => this.loading = false
    );
  }

  abrir(n: Notificacion) {
    if (!n.leida) {
      n.leida = true;
      this.noLeidas = Math.max(0, this.noLeidas - 1);
      this._dataservice.postLeerNotificacion(n.id).subscribe();
    }
    // La url se guarda como en el push ("#/HipotecaDetalle/6?pagar=1"); el router la quiere sin "#"
    if (n.url && n.url !== '#/') this._router.navigateByUrl(n.url.replace(/^#/, ''));
  }

  leerTodas() {
    this.items.forEach(n => n.leida = true);
    this.noLeidas = 0;
    this._dataservice.postLeerTodas().subscribe();
  }

  icono(n: Notificacion): string {
    const t = n.titulo.toLowerCase();
    return t.includes('vencida') ? 'fa-triangle-exclamation' : t.includes('hoy') ? 'fa-calendar-day' : t.includes('activad') ? 'fa-bell' : 'fa-calendar';
  }

  urgente(n: Notificacion): boolean {
    return /vencida|hoy/i.test(n.titulo);
  }

  // "hace 5 min", "hace 3 h", "ayer", "12 oct". El API guarda la fecha en UTC sin zona: se le agrega la Z
  cuando(fecha: string): string {
    const f = new Date(/[zZ+]/.test(fecha.slice(-6)) ? fecha : fecha + 'Z');
    const min = Math.round((Date.now() - f.getTime()) / 60000);
    if (min < 1) return 'ahora';
    if (min < 60) return `hace ${min} min`;
    if (min < 24 * 60) return `hace ${Math.round(min / 60)} h`;
    if (min < 48 * 60) return 'ayer';
    return f.toLocaleDateString('es-DO', { day: 'numeric', month: 'short' });
  }
}
