/* ==========================================================================
   SW.JS — Service Worker
   Guarda en caché el "cascarón" de la app (HTML/CSS/JS propios) para que
   abra rápido y se pueda instalar como PWA. Los datos reales (catálogo,
   ventas, listas, cuentas) siempre necesitan conexión, porque viven en
   Firebase.

   Si editas archivos del proyecto, sube el número de CACHE_VERSION para
   que los celulares que ya instalaron la app descarguen la versión nueva.
   ========================================================================== */

const CACHE_VERSION = "sistema-v8";

const ARCHIVOS_DEL_CASCARON = [
  "./",
  "./index.html",
  "./ventas.html",
  "./inventario.html",
  "./cuentas.html",
  "./pedidos.html",
  "./ajustes.html",
  "./manifest.json",

  "./css/base.css",
  "./css/home.css",
  "./css/ventas.css",
  "./css/inventario.css",
  "./css/cuentas.css",
  "./css/pedidos.css",
  "./css/ajustes.css",

  "./js/config.js",
  "./js/state.js",
  "./js/iconos.js",
  "./js/pdf.js",
  "./js/audio.js",
  "./js/voz.js",
  "./js/ui.js",
  "./js/pin.js",
  "./js/escaner.js",
  "./js/catalogo.js",
  "./js/ventas.js",
  "./js/listas.js",
  "./js/boleta.js",
  "./js/inventario.js",
  "./js/cuentas.js",
  "./js/pedidos.js",
  "./js/resumen.js",
  "./js/mas.js",
  "./js/app.js",
  "./js/main-home.js",
  "./js/main-ventas.js",
  "./js/main-inventario.js",
  "./js/main-cuentas.js",
  "./js/main-pedidos.js",
  "./js/main-ajustes.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(ARCHIVOS_DEL_CASCARON)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const esMismoOrigen = url.origin === self.location.origin;
  const esGET = event.request.method === "GET";
  if (!esMismoOrigen || !esGET) return;

  event.respondWith(
    caches.match(event.request).then((respuestaCache) => {
      const enRed = fetch(event.request)
        .then((respuestaRed) => {
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, respuestaRed.clone()));
          return respuestaRed;
        })
        .catch(() => respuestaCache);
      return respuestaCache || enRed;
    })
  );
});
