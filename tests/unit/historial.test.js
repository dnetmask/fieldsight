const test = require('node:test');
const assert = require('node:assert/strict');
const { crearSandbox, cargar, evaluar, capturarToasts, plano } = require('../helpers/sandbox');

const TOTAL = 65;
const FILAS = Array.from({ length: TOTAL }, (_, i) => ({
  id: 'vis_' + String(i).padStart(3, '0'), codigo: 'FS-' + i, proyecto: 'Proyecto ' + i,
  cliente: i % 5 === 0 ? 'Ecopetrol' : 'Cliente ' + i, sede: 'Sede ' + i, tecnico: 'T', fecha: '2026-09-01',
  tipo: 'activos', creado_por_nombre: 'Usuario', created_at: '2026-09-01T00:00:00Z',
}));

// Supabase falso que registra cómo se arma cada consulta y devuelve páginas de FILAS.
function clienteFalso({ fallar = false } = {}) {
  const consultas = [];
  return {
    consultas,
    from(tabla) {
      return {
        select(cols, opts) {
          const q = { tabla, cols, opts, orders: [], filtros: [] };
          q.or = (s) => { q.filtros.push(['or', s]); return q; };
          q.gte = (c, v) => { q.filtros.push(['gte', c, v]); return q; };
          q.lte = (c, v) => { q.filtros.push(['lte', c, v]); return q; };
          q.order = (c) => { q.orders.push(c); return q; };
          q.range = (a, b) => {
            q.rango = [a, b];
            consultas.push(q);
            return Promise.resolve(fallar
              ? { data: null, error: { message: 'sin red' }, count: null }
              : { data: FILAS.slice(a, b + 1), error: null, count: TOTAL });
          };
          return q;
        },
      };
    },
  };
}

function montar(opciones = {}) {
  const supabaseClient = clienteFalso(opciones);
  const sb = crearSandbox({
    supabaseClient,
    listarPendientesLocal: async () => opciones.pendientes || [],
    TIPO_BADGE: { activos: 'Activos' },
  });
  cargar(sb, 'js/utils.js', 'js/historial.js');
  const toasts = capturarToasts(sb);
  const el = (id) => sb.document.getElementById(id);
  const items = (html) => (html.match(/class="hist-item"/g) || []).length;
  return { sb, supabaseClient, toasts, el, items };
}

test('filaAVisita reconstruye el objeto plano y tolera una fila sin data', () => {
  const { sb } = montar();
  const r = sb.filaAVisita({ id: 'v1', codigo: 'FS-1', sede: 'Norte', tipo: 'activos', created_at: '2026-09-01T10:00:00Z', creado_por_nombre: 'Ana' });
  assert.equal(r.sede, 'Norte');
  assert.equal(r.creadoPor, 'Ana');
  assert.deepEqual(plano(r.activos), []);
  assert.deepEqual(plano(r.checklist), {});
  assert.equal(r.tipoInspeccion, null);
  const con = sb.filaAVisita({ id: 'v2', data: { gps: { lat: 1, lng: 2 }, activos: [{ nombre: 'x' }] } });
  assert.equal(con.activos.length, 1);
  assert.deepEqual(con.gps, { lat: 1, lng: 2 });
});

test('la primera página pide solo columnas planas, de a 30, con count exacto y orden estable', async () => {
  const { sb, supabaseClient } = montar();
  await sb.cargarHistorial();
  const q = supabaseClient.consultas[0];
  assert.equal(q.cols, 'id,codigo,proyecto,cliente,sede,tecnico,fecha,tipo,creado_por_nombre,created_at');
  assert.ok(!/\bdata\b/.test(q.cols) && !q.cols.includes('*'), 'nunca trae data ni *');
  assert.deepEqual(plano(q.opts), { count: 'exact' });
  assert.deepEqual(q.rango, [0, 29]);
  assert.deepEqual(q.orders, ['created_at', 'id']);
});

test('pinta 30, muestra "Cargar más (30 de 65)" y pagina hasta agotar', async () => {
  const { sb, supabaseClient, el, items } = montar();
  await sb.cargarHistorial();
  const lista = el('histList').innerHTML;
  assert.equal(items(lista), 30);
  assert.match(lista, /Cargar más visitas \(30 de 65\)/);

  const btn = { disabled: false, textContent: '' };
  await sb.cargarMasHistorial(btn);
  assert.deepEqual(supabaseClient.consultas[1].rango, [30, 59]);
  assert.equal(items(el('histItems').apendido), 30);
  assert.equal(el('histMasWrap').removido, false);
  assert.equal(btn.textContent, 'Cargar más visitas (60 de 65)');

  await sb.cargarMasHistorial(btn);
  assert.deepEqual(supabaseClient.consultas[2].rango, [60, 89]);
  assert.equal(items(el('histItems').apendido), 35);
  assert.equal(el('histMasWrap').removido, true, 'ya no hay más: quita el botón');
});

test('los filtros de búsqueda se aplican en el servidor', async () => {
  const { sb, supabaseClient, el } = montar();
  el('histBuscar').value = '  Ecopetrol, (Barranca) 100%  ';
  el('histDesde').value = '2026-08-20';
  el('histHasta').value = '2026-08-25';
  await sb.cargarHistorial();
  const q = supabaseClient.consultas[0];
  assert.deepEqual(q.filtros, [
    ['or', 'proyecto.ilike.%Ecopetrol Barranca 100%,cliente.ilike.%Ecopetrol Barranca 100%,sede.ilike.%Ecopetrol Barranca 100%,tecnico.ilike.%Ecopetrol Barranca 100%'],
    ['gte', 'fecha', '2026-08-20'],
    ['lte', 'fecha', '2026-08-25'],
  ]);
  assert.match(el('histList').innerHTML, /65 visitas coinciden con la búsqueda/);
});

test('pendienteCoincide filtra las visitas locales con los mismos criterios', () => {
  const { sb } = montar();
  const p = { proyecto: 'Migración Meraki', cliente: 'Ecopetrol', sede: 'Barranca', tecnico: 'Ana', fecha: '2026-08-22' };
  assert.equal(sb.pendienteCoincide(p, { texto: 'meraki', desde: '', hasta: '' }), true);
  assert.equal(sb.pendienteCoincide(p, { texto: 'zzz', desde: '', hasta: '' }), false);
  assert.equal(sb.pendienteCoincide(p, { texto: '', desde: '2026-08-23', hasta: '' }), false);
  assert.equal(sb.pendienteCoincide(p, { texto: '', desde: '2026-08-20', hasta: '2026-08-25' }), true);
});

test('sin coincidencias muestra el estado vacío con "Quitar filtros"; sin filtros, el de bienvenida', async () => {
  const sinFilas = montar();
  sinFilas.supabaseClient.from = () => ({ select: () => { const q = { or: () => q, gte: () => q, lte: () => q, order: () => q, range: () => Promise.resolve({ data: [], error: null, count: 0 }) }; return q; } });
  sinFilas.el('histBuscar').value = 'zzzz';
  await sinFilas.sb.cargarHistorial();
  assert.match(sinFilas.el('histList').innerHTML, /Ninguna visita coincide/);
  assert.match(sinFilas.el('histList').innerHTML, /limpiarFiltrosHistorial\(\)/);

  sinFilas.el('histBuscar').value = '';
  await sinFilas.sb.cargarHistorial();
  assert.match(sinFilas.el('histList').innerHTML, /Todavía no se ha guardado ninguna visita/);
});

test('sin red: avisa y re-habilita el botón; sin pendientes muestra el error', async () => {
  const { sb, toasts, el } = montar({ fallar: true });
  await sb.cargarHistorial();
  assert.match(el('histList').innerHTML, /No se pudo cargar el historial: sin red/);
  const btn = { disabled: false, textContent: 'x' };
  await sb.cargarMasHistorial(btn);
  assert.match(toasts.at(-1), /No se pudieron cargar más visitas/);
  assert.equal(btn.disabled, false);
});

test('con pendientes locales y sin red, muestra lo del teléfono con aviso', async () => {
  const { sb, el } = montar({ fallar: true, pendientes: [{ id: 'p1', sede: 'Local', proyecto: 'P', fecha: '2026-09-01', tipo: 'activos' }] });
  await sb.cargarHistorial();
  const html = el('histList').innerHTML;
  assert.match(html, /mostrando lo disponible en este teléfono/);
  assert.match(html, /Pendiente de sincronizar/);
  assert.match(html, /reabrirVisitaLocal\('p1'\)/);
});

test('HISTORIAL_PAGINA es 30', () => {
  assert.equal(evaluar(montar().sb, 'HISTORIAL_PAGINA'), 30);
});
