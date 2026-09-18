const test = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const { crearSandbox, cargar, evaluar, plano } = require('../helpers/sandbox');

function montar({ enlaces = true } = {}) {
  let firmas = 0;
  const sb = crearSandbox({
    XLSX,
    enlaceFirmadoFoto: async (key) => { firmas++; return enlaces && key ? 'https://storage.test/firmada/' + encodeURIComponent(key) : null; },
    TIPO_LABEL: { activos: 'Levantamiento de activos' },
    CHECKLIST_DEF: [],
  });
  cargar(sb, 'js/utils.js', 'js/export-excel.js');
  return { sb, firmas: () => firmas };
}

const VISITA = {
  tipo: 'activos',
  activos: [
    { nombre: 'Switch Core', fotos: [{ key: 'v1/a.jpg', cat: 'Frontal' }, { key: 'v1/b.jpg', cat: 'Serial' }] },
    { nombre: 'UPS Sala', fotos: [{ key: 'v1/c.jpg', cat: 'Panorámica' }] },
  ],
};

test('la hoja "Fotos" lleva nota de vencimiento, una fila por foto y enlaces con tooltip', async () => {
  const { sb, firmas } = montar();
  const wb = XLSX.utils.book_new();
  await sb.agregarHojaFotos(wb, VISITA);
  assert.deepEqual(wb.SheetNames, ['Fotos']);
  assert.equal(firmas(), 3);

  const ws = wb.Sheets.Fotos;
  const filas = XLSX.utils.sheet_to_json(ws, { header: 1 });
  assert.match(filas[0][0], /^Estos enlaces vencen el \d{2}\/\d{2}\/\d{4}\. Si ya no funcionan, comunícate con Netmask/);
  assert.match(filas[0][0], /contacto@netmask\.co/);
  assert.deepEqual(plano(ws['!merges']), [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }], 'la nota ocupa las 4 columnas');
  assert.deepEqual(filas[2], ['#', 'Referencia', 'Categoría', 'Foto']);
  assert.deepEqual(filas.slice(3).map((f) => f.slice(0, 3)), [[1, 'Switch Core', 'Frontal'], [2, 'Switch Core', 'Serial'], [3, 'UPS Sala', 'Panorámica']]);

  const celda = ws[XLSX.utils.encode_cell({ r: 3, c: 3 })];
  assert.equal(celda.v, 'Abrir foto');
  assert.equal(celda.l.Target, 'https://storage.test/firmada/v1%2Fa.jpg');
  assert.match(celda.l.Tooltip, /válido hasta el \d{2}\/\d{2}\/\d{4}/);

  const vence = new Date(Date.now() + evaluar(sb, 'NM_LINK_EXPIRES_SECONDS') * 1000).toLocaleDateString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit' });
  assert.ok(filas[0][0].includes(vence), 'la fecha de la nota es hoy + 90 días');
});

test('sin enlace disponible la celda dice "No disponible"; sin fotos no crea la hoja', async () => {
  const { sb } = montar({ enlaces: false });
  const wb = XLSX.utils.book_new();
  await sb.agregarHojaFotos(wb, VISITA);
  assert.equal(wb.Sheets.Fotos[XLSX.utils.encode_cell({ r: 3, c: 3 })].v, 'No disponible');

  const vacio = XLSX.utils.book_new();
  await sb.agregarHojaFotos(vacio, { tipo: 'activos', activos: [{ nombre: 'sin fotos', fotos: [] }] });
  assert.deepEqual(vacio.SheetNames, []);
});

test('implementaciones (antes/después) e inspecciones también se listan', async () => {
  const { sb } = montar();
  let wb = XLSX.utils.book_new();
  await sb.agregarHojaFotos(wb, { tipo: 'implementacion', implementaciones: [{ eqNombre: 'Router', fotosAntes: [{ key: 'a', cat: 'General' }], fotosDespues: [{ key: 'b', cat: 'Pruebas' }] }] });
  let filas = XLSX.utils.sheet_to_json(wb.Sheets.Fotos, { header: 1 }).slice(3);
  assert.deepEqual(filas.map((f) => f.slice(1, 3)), [['Router', 'Antes · General'], ['Router', 'Después · Pruebas']]);

  wb = XLSX.utils.book_new();
  await sb.agregarHojaFotos(wb, { tipo: 'inspeccion', checklist: { 'Físico|Orden y limpieza': { estado: 'ok', fotoKey: 'k1' }, 'Físico|Sin foto': { estado: 'bad' } } });
  filas = XLSX.utils.sheet_to_json(wb.Sheets.Fotos, { header: 1 }).slice(3);
  assert.deepEqual(filas.map((f) => f.slice(1, 3)), [['Orden y limpieza', 'Físico']]);
});
