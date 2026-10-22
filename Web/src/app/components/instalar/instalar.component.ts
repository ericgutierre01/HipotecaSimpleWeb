import { Component, OnDestroy, OnInit } from '@angular/core';

// Aviso para instalar la app: botón nativo en Android/Chrome, instrucciones en iOS (que no tiene instalador)
@Component({
  selector: 'app-instalar',
  templateUrl: './instalar.component.html',
  styleUrls: ['./instalar.component.css']
})
export class InstalarComponent implements OnInit, OnDestroy {

  modo = ''; // '' | 'android' | 'ios'

  private alAviso = (e: Event) => {
    e.preventDefault();
    (window as any).avisoInstalar = e;
    if (!this.oculto()) this.modo = 'android';
  };
  private alInstalar = () => { this.modo = ''; };

  ngOnInit(): void {
    const instalada = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
    if (instalada) return;

    window.addEventListener('beforeinstallprompt', this.alAviso);
    window.addEventListener('appinstalled', this.alInstalar);

    if (this.oculto()) return;
    if ((window as any).avisoInstalar) this.modo = 'android';
    else if (this.esIOS()) this.modo = 'ios';
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeinstallprompt', this.alAviso);
    window.removeEventListener('appinstalled', this.alInstalar);
  }

  // iPadOS se presenta como Mac: se distingue porque tiene pantalla táctil
  private esIOS(): boolean {
    const ua = navigator.userAgent;
    return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  }

  async instalar() {
    const aviso = (window as any).avisoInstalar;
    if (!aviso) return;
    aviso.prompt();
    const { outcome } = await aviso.userChoice;
    (window as any).avisoInstalar = null; // el aviso nativo solo se puede usar una vez
    if (outcome === 'accepted') this.modo = '';
  }

  cerrar() {
    this.modo = '';
    try { localStorage.setItem('instalarOculto', '1'); } catch { }
  }

  private oculto(): boolean {
    try { return localStorage.getItem('instalarOculto') === '1'; } catch { return false; }
  }
}
