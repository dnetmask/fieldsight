// Simula el ciclo de vida del service worker (install / activate / fetch) con
// dobles de caches, fetch y Request. Lo que se verifica es la lógica de
// enrutamiento: qué se precachea, qué se sirve desde caché, y qué NUNCA se
// intercepta (la API de Supabase vive en el mismo origen que la app).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { RAIZ } = require('../helpers/sandbox');

const BASE = 'https://app.test/';

class FakeRequest {
  constructor(input, init = {}) {
    const src = typeof input === 'string' ? null : input;
    this.url = typeof input === 'string' ? new URL(input, BASE).href : src.url;
    this.method = init.method || (src && src.method) || 'GET';
    this.mode = init.mode || (src && src.mode) || 'cors';
    this.headers = new Headers(init.headers || (src && src.headers) || {});
    this.cache = init.cache;
  }
}
const opaca = (url) => ({ type: 'opaque', status: 0, ok: false, url, clone() { return this; } });
const basica = (body) => { const r = new Response(body, { status: 200 }); Object.defineProperty(r, 'type', { value: 'basic' }); return r; };

function montar() {
  const estado = { offline: false, versionConfig: 'v1', fetchLog: [] };
  const fetchStub = async (input) => {
    const url = typeof input === 'string' ? input : input.url;
    estado.fetchLog.push(url);
    if (estado.offline) throw new TypeError('Failed to fetch');
    const u = new URL(url);
    if (u.origin === 'https://app.test') {
      if (u.pathname === '/js/nuevo.js') return new Response('nope', { status: 404 });
      return basica(u.pathname === '/js/config.js' ? 'config-' + estado.versionConfig : 'core:' + u.pathname);
    }
    return opaca(url);
  };
  class FakeCache {
    constructor() { this.m = new Map(); }
    keyOf(req) { return typeof req === 'string' ? new URL(req, BASE).href : req.url; }
    async addAll(reqs) { for (const r of reqs) { const res = await fetchStub(r); if (!res.ok) throw new TypeError('addAll failed ' + this.keyOf(r)); this.m.set(this.keyOf(r), res); } }
    async put(req, res) { this.m.set(this.keyOf(req), res); }
    async match(req, opts = {}) {
      const k = this.keyOf(req);
      const copia = (r) => (r && r.clone ? r.clone() : r); // como el navegador: cada match entrega una copia
      if (this.m.has(k)) return copia(this.m.get(k));
      if (opts.ignoreSearch) { const sin = k.split('?')[0]; for (const [key, v] of this.m) if (key.split('?')[0] === sin) return copia(v); }
      return undefined;
    }
    async keys() { return [...this.m.keys()].map((u) => ({ url: u })); }
  }
  const store = new Map();
  const caches = {
    open: async (n) => { if (!store.has(n)) store.set(n, new FakeCache()); return store.get(n); },
    keys: async () => [...store.keys()],
    delete: async (n) => store.delete(n),
  };
  const handlers = {};
  const self_ = { addEventListener: (t, fn) => { handlers[t] = fn; }, skipWaiting: async () => {}, clients: { claim: async () => {} }, location: { origin: 'https://app.test' } };
  const sb = { self: self_, caches, fetch: fetchStub, Request: FakeRequest, Response, URL, Headers, console };
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8'), sb, { filename: 'sw.js' });
  const nombreCache = vm.runInContext('CACHE_NAME', sb);

  const simular = (url, init = {}) => { const e = { request: new FakeRequest(url, init), respondWith(p) { this.p = p; }, waitUntil(p) { this.w = p; } }; handlers.fetch(e); return e; };
  const texto = async (r) => (r && r.text ? r.text() : '[opaca]');
  return { sb, estado, store, caches, handlers, nombreCache, simular, texto };
}

async function instalar(m) {
  let ev = { waitUntil(p) { this.p = p; } }; m.handlers.install(ev); await ev.p;
  ev = { waitUntil(p) { this.p = p; } }; m.handlers.activate(ev); await ev.p;
  return m.caches.open(m.nombreCache);
}

test('precachea todos los <script> de index.html y las cuatro librerías de CDN; borra cachés viejas', async () => {
  const m = montar();
  m.store.set('fieldsight-cache-v1', {});
  const cache = await instalar(m);
  const keys = (await cache.keys()).map((k) => k.url);
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"/g)].map((x) => BASE + x[1]);
  for (const s of scripts) assert.ok(keys.includes(s), 'falta en CORE_ASSETS: ' + s);
  assert.ok(keys.includes(BASE + 'css/styles.css'));
  assert.ok(keys.includes(BASE + 'icons/Logo_Netmask_1500x300px.png'));
  assert.ok(keys.includes('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'), 'supabase-js (respuesta opaca) precacheado');
  assert.equal(keys.filter((k) => !k.startsWith(BASE)).length, 4, 'cuatro librerías externas');
  assert.equal(m.store.has('fieldsight-cache-v1'), false);
});

test('nunca intercepta la API de Supabase ni peticiones que no sean GET', async () => {
  const m = montar(); await instalar(m);
  assert.equal(m.simular(BASE + 'rest/v1/visitas?select=id', { headers: { apikey: 'x', authorization: 'Bearer y' } }).p, undefined);
  assert.equal(m.simular(BASE + 'auth/v1/user').p, undefined, 'por prefijo, aun sin cabeceras');
  assert.equal(m.simular(BASE + 'storage/v1/object/sign/fotos/v1/a.jpg?token=abc').p, undefined, 'las fotos firmadas no se acumulan en el teléfono');
  assert.equal(m.simular(BASE + 'realtime/v1/websocket').p, undefined);
  assert.equal(m.simular(BASE + 'js/config.js', { method: 'POST' }).p, undefined);
  assert.equal(m.simular('https://maps.google.com/?q=1,2').p, undefined, 'otros orígenes se dejan pasar');
});

test('sirve lo propio y las librerías desde caché, y refresca en segundo plano', async () => {
  const m = montar(); const cache = await instalar(m);
  let e = m.simular(BASE + 'js/config.js');
  assert.equal(await m.texto(await e.p), 'config-v1');
  e = m.simular('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', { mode: 'no-cors' });
  assert.equal((await e.p).type, 'opaque');

  m.estado.versionConfig = 'v2';
  e = m.simular(BASE + 'js/config.js');
  assert.equal(await m.texto(await e.p), 'config-v1', 'responde la copia en caché al instante');
  await e.w;
  assert.equal(await m.texto(await cache.match(BASE + 'js/config.js')), 'config-v2', 'y deja la caché al día para la próxima');
});

test('cachea en tiempo de ejecución los recursos de los CDN permitidos (idioma de Tesseract)', async () => {
  const m = montar(); const cache = await instalar(m);
  const url = 'https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz';
  m.estado.fetchLog = [];
  let e = m.simular(url, { mode: 'no-cors' }); await e.p;
  assert.equal(m.estado.fetchLog.length, 1, 'la primera vez va a red');
  e = m.simular(url, { mode: 'no-cors' }); await e.p; await e.w;
  assert.ok(await cache.match(url), 'queda en caché');
});

test('sin red: la app abre desde caché y las navegaciones caen al shell', async () => {
  const m = montar(); await instalar(m);
  m.estado.offline = true;
  assert.equal(await m.texto(await m.simular(BASE + 'js/config.js').p), 'config-v1');
  assert.equal(await m.texto(await m.simular(BASE + '?code=recuperacion', { mode: 'navigate' }).p), 'core:/', 'ignora la query en navegaciones');
  assert.equal(await m.texto(await m.simular(BASE + 'otra-ruta', { mode: 'navigate' }).p), 'core:/index.html');
  assert.equal((await m.simular(BASE + 'js/nuevo.js').p).status, 503, 'sin caché y sin red: 503 controlado, no una excepción');
});
