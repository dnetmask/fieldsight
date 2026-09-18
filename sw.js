const CACHE_NAME = 'fieldsight-cache-v5';

// Todo lo propio que la app necesita para arrancar sin red. Debe coincidir
// con los <script src="js/..."> de index.html -- si falta uno, la app abre
// sin conexión pero con una función indefinida.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/config.js',
  './js/storage.js',
  './js/state.js',
  './js/utils.js',
  './js/modal.js',
  './js/auth.js',
  './js/catalogos.js',
  './js/validacion.js',
  './js/navegacion.js',
  './js/gps.js',
  './js/fotos.js',
  './js/ocr.js',
  './js/activos.js',
  './js/implementaciones.js',
  './js/checklist.js',
  './js/firma.js',
  './js/borrador.js',
  './js/offline.js',
  './js/guardar.js',
  './js/historial.js',
  './js/detalle.js',
  './js/admin.js',
  './js/export-excel.js',
  './js/export-word.js',
  './js/export-zip.js',
  './js/visita-actions.js',
  './js/pwa.js',
  './js/init.js',
  './icons/favicon-64.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/Logo_Netmask_1500x300px.png'
];

// Librerías externas. supabase-js es imprescindible para arrancar (config.js
// la usa al cargar la página); las otras tres se cargan bajo demanda
// (exportar Word/Excel/ZIP, OCR). Se precachean "best-effort": si un CDN no
// responde durante la instalación, el service worker se instala igual y la
// librería queda en caché la primera vez que se use con red.
const CDN_LIBS = [
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js'
];
// Hosts de terceros cuyas respuestas sí se guardan en caché (Tesseract
// descarga su worker, el núcleo WASM y el idioma desde estos en tiempo de
// ejecución). Cualquier otro origen externo se deja pasar sin tocar.
const CDN_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'unpkg.com', 'tessdata.projectnaptha.com'];

// Rutas de la API de Supabase. En producción viven en el MISMO origen que la
// app (un solo gateway), así que sin esta lista el service worker las
// trataría como archivos estáticos: el historial mostraría datos viejos y
// cada foto descargada quedaría guardada para siempre en el teléfono.
const API_PREFIXES = ['/auth/', '/rest/', '/storage/', '/realtime/', '/graphql', '/functions/', '/mcp', '/sso'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // cache:'reload' salta la caché HTTP del navegador para no instalar una
    // copia vieja de un archivo que acaba de cambiar en el servidor.
    await cache.addAll(CORE_ASSETS.map((u) => new Request(u, { cache: 'reload' })));
    await Promise.allSettled(CDN_LIBS.map((u) =>
      fetch(new Request(u, { mode: 'no-cors' })).then((r) => cache.put(u, r))
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function esPeticionApi(req, url) {
  if (API_PREFIXES.some((p) => url.pathname.startsWith(p))) return true;
  // supabase-js siempre manda estas cabeceras; ningún archivo estático las trae.
  return req.headers.has('apikey') || req.headers.has('authorization');
}

function esCacheable(response) {
  if (!response) return false;
  // Scripts de CDN cargados sin CORS: el navegador oculta el status, así que
  // no se puede distinguir un 200 de un 404. Se acepta -- la siguiente carga
  // con red lo corrige, porque la caché se refresca en segundo plano.
  if (response.type === 'opaque') return true;
  return response.ok && (response.type === 'basic' || response.type === 'cors');
}

// Estrategia: responder desde caché al instante (para que la app abra rápido
// y sin señal) y, en paralelo, refrescar la caché desde la red si hay
// conexión. Si no hay nada en caché, se espera a la red.
async function responderConCache(event) {
  const req = event.request;
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });

  const network = fetch(req)
    .then((response) => {
      if (esCacheable(response)) cache.put(req, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  const fresh = await network;
  if (fresh) return fresh;
  if (req.mode === 'navigate') {
    const shell = await cache.match('./index.html');
    if (shell) return shell;
  }
  return new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (esPeticionApi(req, url)) return;
  const propio = url.origin === self.location.origin;
  if (!propio && !CDN_HOSTS.includes(url.hostname)) return;
  event.respondWith(responderConCache(event));
});
