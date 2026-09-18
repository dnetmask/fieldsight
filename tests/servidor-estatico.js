// Servidor estático para pruebas: sirve el repo tal cual, sin caché (los
// navegadores guardan js/css por heurística y sirven versiones viejas, lo que
// da falsos negativos), y si FIELDSIGHT_SUPABASE_URL está definida, inyecta
// esa URL y FIELDSIGHT_ANON_KEY en js/config.js al servirlo -- así las
// pruebas no dependen de lo que tenga el config.js local de cada quien.
//
//   node tests/servidor-estatico.js            -> http://localhost:8877
//   PORT=9000 node tests/servidor-estatico.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..');
const PUERTO = Number(process.env.PORT || 8877);
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function configInyectado(fuente) {
  return fuente
    .replace(/const SUPABASE_URL = '[^']*';/, `const SUPABASE_URL = '${process.env.FIELDSIGHT_SUPABASE_URL}';`)
    .replace(/const SUPABASE_ANON_KEY = '[^']*';/, `const SUPABASE_ANON_KEY = '${process.env.FIELDSIGHT_ANON_KEY || 'anon-de-pruebas'}';`);
}

const servidor = http.createServer((req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const archivo = path.normalize(path.join(RAIZ, ruta === '/' ? 'index.html' : ruta));
  if (!archivo.startsWith(RAIZ)) { res.writeHead(403); return res.end(); }
  fs.readFile(archivo, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404 ' + ruta); }
    if (ruta === '/js/config.js' && process.env.FIELDSIGHT_SUPABASE_URL) {
      data = Buffer.from(configInyectado(data.toString('utf8')), 'utf8');
    }
    res.writeHead(200, {
      'Content-Type': TIPOS[path.extname(archivo)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
});

servidor.listen(PUERTO, () => console.log('FieldSight de pruebas en http://localhost:' + PUERTO));
