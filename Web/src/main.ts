import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { cargarConfig } from './app/services/config';

if (environment.production) {
  enableProdMode();
}

// Android/Chrome avisa una sola vez que la app se puede instalar, a veces antes de que Angular
// arranque: se guarda el aviso para que el botón "Instalar" lo use cuando aparezca
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).avisoInstalar = e;
});


// Service worker: requisito para instalar la app y abrirla sin conexión. Solo en producción, para que el
// servidor de desarrollo no sirva archivos viejos. Se registra con la app ya arrancada, y si hay una versión
// nueva esperando se activa ahora: así nunca cambia a mitad de la carga (en iOS eso trababa el arranque).
function registrarServiceWorker() {
  if (!environment.production || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    const activar = (sw: ServiceWorker | null) => sw?.postMessage('activar');
    activar(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo?.addEventListener('statechange', () => { if (nuevo.state === 'installed') activar(nuevo); });
    });
  }).catch((err) => console.error('Service worker', err));
}

// Las hojas de los CDN no bloquean el primer pintado (así se ve la pantalla de carga de index.html):
// se esperan aquí para que la app no aparezca sin estilos. Con red lenta o caída se sigue tras 6 s.
function hojasExternas(): Promise<unknown> {
  const pendientes = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel=stylesheet][media=print]'))
    .map(l => new Promise(listo => { l.addEventListener('load', listo); l.addEventListener('error', listo); }));
  return Promise.race([Promise.all(pendientes), new Promise(listo => setTimeout(listo, 6000))]);
}

// Primero la dirección del API (config.json); sin ella la app no puede hablar con el servidor
Promise.all([cargarConfig(), hojasExternas()])
  .then(() => platformBrowserDynamic().bootstrapModule(AppModule))
  .then(() => {
    try { sessionStorage.removeItem('hs-reintento'); } catch { }
    registrarServiceWorker();
  })
  .catch(err => {
    console.error(err);
    document.body.innerHTML = `<p style="font-family:system-ui;padding:24px;max-width:480px">No se pudo iniciar Hipoteca Simple: ${String(err.message ?? err).replace(/</g, '&lt;')}</p>`;
  });
