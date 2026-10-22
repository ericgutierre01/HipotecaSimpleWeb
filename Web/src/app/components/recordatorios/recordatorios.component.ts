import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataService } from 'src/app/services/services/data.service';
import Swal from 'sweetalert2';

// Activa/desactiva los recordatorios de pago por notificación push en este dispositivo
@Component({
  selector: 'app-recordatorios',
  templateUrl: './recordatorios.component.html',
  styleUrls: ['./recordatorios.component.css']
})
export class RecordatoriosComponent implements OnInit {

  estado = 'cargando'; // cargando | no-soportado | instalar | bloqueado | apagado | activo
  ocupado = false;

  constructor(private _dataservice: DataService) { }

  async ngOnInit() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      // En iPhone el push solo existe dentro de la app instalada en la pantalla de inicio
      this.estado = this.esIOS() && !this.instalada() ? 'instalar' : 'no-soportado';
      return;
    }
    if (Notification.permission === 'denied') {
      this.estado = 'bloqueado';
      return;
    }
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    this.estado = sub && Notification.permission === 'granted' ? 'activo' : 'apagado';
    // Se reenvía al API por si este dispositivo se suscribió con otra cuenta o antes de existir la tabla
    if (sub && this.estado === 'activo') this.guardar(sub).catch(() => { });
  }

  async activar() {
    this.ocupado = true;
    try {
      // El permiso se pide primero, directo del toque del usuario (iOS lo exige así)
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        this.estado = permiso === 'denied' ? 'bloqueado' : 'apagado';
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.register('sw.js'));
      await navigator.serviceWorker.ready;
      const clave = await firstValueFrom(this._dataservice.getClavePush());
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.claveABytes(clave) });
      await this.guardar(sub);
      this.estado = 'activo';
      Swal.fire({ position: 'top-end', icon: 'success', title: 'Recordatorios activados', showConfirmButton: false, timer: 1600 });
    } catch (err: any) {
      console.error(err);
      Swal.fire({ icon: 'error', title: 'No se pudieron activar', text: err?.error || err?.message || '' });
    } finally {
      this.ocupado = false;
    }
  }

  async desactivar() {
    this.ocupado = true;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await firstValueFrom(this._dataservice.postDesuscribirPush(sub.endpoint)).catch(() => { });
        await sub.unsubscribe();
      }
      this.estado = 'apagado';
    } finally {
      this.ocupado = false;
    }
  }

  async probar() {
    this.ocupado = true;
    try {
      const r = await firstValueFrom(this._dataservice.postPruebaPush());
      Swal.fire({ position: 'top-end', icon: 'success', title: 'Notificación de prueba enviada', text: r, showConfirmButton: false, timer: 2000 });
    } catch (err: any) {
      Swal.fire({ icon: 'error', title: 'No se pudo enviar', text: err?.error || '' });
    } finally {
      this.ocupado = false;
    }
  }

  private guardar(sub: PushSubscription) {
    const json = sub.toJSON();
    return firstValueFrom(this._dataservice.postSuscribirPush({
      endpoint: sub.endpoint,
      p256dh: json.keys?.['p256dh'] || '',
      auth: json.keys?.['auth'] || '',
    }));
  }

  // La clave VAPID llega en base64url; el navegador la necesita en bytes
  private claveABytes(base64url: string): Uint8Array {
    const base64 = (base64url + '='.repeat((4 - base64url.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  }

  private esIOS(): boolean {
    const ua = navigator.userAgent;
    return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  }

  private instalada(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
  }
}
