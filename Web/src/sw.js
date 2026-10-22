// Service worker mínimo: hace la app instalable y permite abrirla sin conexión.
// Solo toca la página y los archivos de la app; el API (aunque viva en el mismo dominio) va siempre directo
// a la red: sus respuestas son datos de cada usuario y nunca se guardan aquí.
// v2: borra la caché v1, que llegó a guardar respuestas del API cuando éste pasó al mismo dominio.
const CACHE = 'hipoteca-simple-v2';

// La versión nueva espera a que la página la active (main.ts lo hace cuando la app ya arrancó). Cambiar de
// service worker a mitad de la carga dejaba en iOS descargas colgadas y la app trabada en la pantalla de carga.
self.addEventListener('message', (event) => {
  if (event.data === 'activar') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Notificación push enviada por el API: { titulo, cuerpo, url, tag }
self.addEventListener('push', (event) => {
  const d = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(d.titulo || 'Hipoteca Simple', {
      body: d.cuerpo || '',
      icon: 'assets/icons/icon-192.png',
      tag: d.tag,          // un aviso nuevo de la misma cuota reemplaza al anterior
      renotify: !!d.tag,
      data: { url: d.url || '#/' },
      actions: d.url && d.url.includes('pagar=1') ? [{ action: 'pagar', title: 'Pagar ahora' }] : [],
    })
  );
});

// Tocar la notificación (o "Pagar ahora") abre la app en el préstamo, con el pago listo
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data.url, self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      const abierta = ventanas.find((v) => v.url.startsWith(self.registration.scope));
      if (abierta) return abierta.focus().then((v) => v.navigate(url)).catch(() => self.clients.openWindow(url));
      return self.clients.openWindow(url);
    })
  );
});

// Guarda en caché cada respuesta buena para poder abrir sin conexión
function traer(req) {
  return fetch(req).then((res) => {
    if (res.ok) {
      const copia = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copia));
    }
    return res;
  });
}

// Red primero; si tarda más de `ms` o no hay conexión, la copia guardada (o `respaldo` si no hay copia)
function redOCopia(req, ms, respaldo) {
  const red = traer(req);
  red.catch(() => {}); // si ganó la copia y la red falla después, que no quede un error suelto
  const espera = new Promise((listo) => setTimeout(listo, ms)).then(() => caches.match(req));
  return Promise.race([red, espera])
    .then((r) => r || red)
    .catch(() => caches.match(req).then((r) => r || respaldo()));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;
  // Solo la página de la app (usa rutas con #, así que es siempre la raíz) y sus archivos con extensión.
  // El API no tiene extensión ni es la raíz, incluidas sus páginas (p. ej. el enlace para aprobar cuentas).
  const ruta = new URL(req.url).pathname;
  const raiz = new URL(self.registration.scope).pathname;
  const esPagina = req.mode === 'navigate' && (ruta === raiz || ruta === raiz + 'index.html');
  if (!esPagina && !/\.(js|css|json|png|svg|ico|webmanifest|woff2?)$/.test(ruta)) return;

  // La página siempre de la red, para que sea la versión publicada: de ella lee iOS las imágenes de arranque
  // al "Agregar a inicio", y una copia vieja lo dejaría con la pantalla blanca. Con red lenta (más de 2.5 s)
  // o sin conexión, la copia guardada; mientras tanto iOS/Android muestran su imagen de arranque.
  if (esPagina) {
    event.respondWith(redOCopia(req, 2500, () => caches.match(self.registration.scope).then((r) => r || Response.error())));
    return;
  }

  // Archivos con huella en el nombre (main.3f9a….js): nunca cambian, así que la copia guardada vale
  if (/\.[0-9a-f]{16,}\.(js|css)$/.test(new URL(req.url).pathname)) {
    event.respondWith(caches.match(req).then((r) => r || traer(req)));
    return;
  }

  // Lo demás (config.json, íconos…): red primero; si tarda más de 3 s o no hay conexión, la copia guardada
  event.respondWith(redOCopia(req, 3000, () => Response.error()));
});
