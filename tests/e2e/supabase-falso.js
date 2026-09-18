// Supabase simulado por interceptación de red (page.route). La app de pruebas
// apunta a http://supabase.test (ver playwright.config.js): ninguna petición
// sale a la red real, y las pruebas corren sin Docker ni credenciales.
// Cubre lo justo que usa la app: login con contraseña, perfil, catálogos y
// la lista/detalle de visitas con paginación, búsqueda y filtro de fechas.
const ORIGEN = 'http://supabase.test';
const USUARIO = { id: '11111111-1111-4111-8111-111111111111', email: 'prueba@fieldsight.local', nombre: 'Usuario de Prueba', rol: 'administrador' };
const CONTRASENA = 'Prueba123!';

const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (payload) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.firma-falsa`;

function usuarioAuth(u) {
  return {
    id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email,
    email_confirmed_at: '2026-01-01T00:00:00Z', phone: '',
    app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { nombre: u.nombre },
    identities: [], created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z', is_anonymous: false,
  };
}
function sesion(u) {
  const ahora = Math.floor(Date.now() / 1000);
  return {
    access_token: jwt({ sub: u.id, email: u.email, role: 'authenticated', aud: 'authenticated', iat: ahora, exp: ahora + 3600 }),
    token_type: 'bearer', expires_in: 3600, expires_at: ahora + 3600, refresh_token: 'refresh-falso', user: usuarioAuth(u),
  };
}

// N visitas de prueba; una de cada cinco es de "Ecopetrol Barranca".
function visitasDePrueba(n) {
  return Array.from({ length: n }, (_, i) => {
    const k = String(i + 1).padStart(3, '0');
    return {
      id: 'vis_e2e_' + k, codigo: 'FS-' + k, proyecto: 'Proyecto ' + k,
      cliente: i % 5 === 4 ? 'Ecopetrol Barranca' : 'Cliente ' + k, sede: 'Sede ' + k, tecnico: 'Usuario de Prueba',
      fecha: '2026-08-' + String((i % 28) + 1).padStart(2, '0'), tipo: 'activos', data: {},
      created_by: USUARIO.id, creado_por_nombre: 'Usuario de Prueba',
      created_at: new Date(Date.UTC(2026, 7, 1, 10, 0, i)).toISOString(), updated_at: null, updated_by: null, actualizado_por_nombre: null,
    };
  });
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization, apikey, content-type, prefer, accept, accept-profile, content-profile, range, x-client-info, x-supabase-api-version, x-upsert',
  'access-control-expose-headers': 'content-range, x-total-count',
};

async function instalarSupabaseFalso(page, opciones = {}) {
  const usuario = opciones.usuario || USUARIO;
  const visitas = (opciones.visitas || []).slice();
  const tipos = opciones.tipos || ['Switch', 'Router', 'UPS'];
  const protocolos = opciones.protocolos || [{ nombre: 'Modbus TCP', ethernet: true }, { nombre: 'Modbus RTU', ethernet: false }];
  const perfil = { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, activo: true, created_at: '2026-01-01T00:00:00Z' };
  const peticiones = [];

  await page.route(ORIGEN + '/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const metodo = req.method();
    const ruta = url.pathname;
    peticiones.push({ metodo, ruta, query: Object.fromEntries(url.searchParams) });
    const quiereObjeto = /vnd\.pgrst\.object/.test(req.headers()['accept'] || '');
    const json = (body, extra = {}, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { ...CORS, ...extra }, body: JSON.stringify(body) });

    if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });

    if (ruta === '/auth/v1/token') {
      const cuerpo = req.postDataJSON() || {};
      if (url.searchParams.get('grant_type') === 'refresh_token') return json(sesion(usuario));
      if (cuerpo.email === usuario.email && cuerpo.password === CONTRASENA) return json(sesion(usuario));
      return json({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials', error: 'invalid_grant', error_description: 'Invalid login credentials' }, {}, 400);
    }
    if (ruta === '/auth/v1/user') return json(usuarioAuth(usuario));
    if (ruta === '/auth/v1/logout') return route.fulfill({ status: 204, headers: CORS, body: '' });
    if (ruta === '/auth/v1/signup') {
      const cuerpo = req.postDataJSON() || {};
      if ((cuerpo.password || '').length < 8) return json({ code: 422, error_code: 'weak_password', msg: 'Password should be at least 8 characters.' }, {}, 422);
      return json(sesion({ ...usuario, email: cuerpo.email, nombre: (cuerpo.data || {}).nombre || 'Nuevo' }));
    }

    if (ruta === '/rest/v1/profiles') return json(quiereObjeto ? perfil : [perfil]);
    if (ruta === '/rest/v1/catalogo_tipos_activo') return metodo === 'GET' ? json(tipos.map((n) => ({ nombre: n }))) : json([], {}, 201);
    if (ruta === '/rest/v1/catalogo_protocolos') return metodo === 'GET' ? json(protocolos) : json([], {}, 201);

    if (ruta === '/rest/v1/visitas' && metodo === 'GET') {
      let filas = visitas.slice();
      const idEq = url.searchParams.get('id');
      if (idEq && idEq.startsWith('eq.')) {
        const v = filas.find((x) => x.id === idEq.slice(3));
        if (quiereObjeto) return v ? json(v) : json({ code: 'PGRST116', message: 'no rows' }, {}, 406);
        return json(v ? [v] : []);
      }
      const or = url.searchParams.get('or');
      if (or) {
        const m = or.match(/ilike\.%([^%,)]*)%/);
        const t = (m ? m[1] : '').toLowerCase();
        filas = filas.filter((v) => ['proyecto', 'cliente', 'sede', 'tecnico'].some((c) => String(v[c] || '').toLowerCase().includes(t)));
      }
      for (const f of url.searchParams.getAll('fecha')) {
        if (f.startsWith('gte.')) filas = filas.filter((v) => v.fecha >= f.slice(4));
        if (f.startsWith('lte.')) filas = filas.filter((v) => v.fecha <= f.slice(4));
      }
      filas.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
      const offset = Number(url.searchParams.get('offset') || 0);
      const limit = Number(url.searchParams.get('limit') || filas.length);
      const pagina = filas.slice(offset, offset + limit);
      const select = url.searchParams.get('select') || '*';
      const proyectar = (v) => (select === '*' ? v : Object.fromEntries(select.split(',').map((c) => [c, v[c]])));
      return json(pagina.map(proyectar), { 'content-range': `${offset}-${offset + Math.max(pagina.length - 1, 0)}/${filas.length}` });
    }
    if (ruta === '/rest/v1/visitas') return json([], {}, 201);

    return json({ message: 'ruta no simulada: ' + metodo + ' ' + ruta }, {}, 404);
  });

  return { peticiones, usuario, visitas };
}

async function iniciarSesion(page) {
  await page.goto('/');
  await page.fill('#authEmail', USUARIO.email);
  await page.fill('#authPassword', CONTRASENA);
  await page.click('#btnAuthSubmit');
  await page.waitForSelector('.topbar:not(.hidden)');
}

module.exports = { ORIGEN, USUARIO, CONTRASENA, instalarSupabaseFalso, iniciarSesion, visitasDePrueba };
