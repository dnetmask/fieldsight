const test = require('node:test');
const assert = require('node:assert/strict');
const { crearSandbox, cargar, evaluar, plano } = require('../helpers/sandbox');

// sanitizarNombre y extDeDataUrl viven en export-zip.js; nombreInforme (utils.js) usa la primera.
const sb = cargar(crearSandbox(), 'js/utils.js', 'js/export-zip.js');

test('escapeHtml escapa los cinco caracteres peligrosos', () => {
  assert.equal(sb.escapeHtml(`<b class="x">Tom & 'Jerry'</b>`), '&lt;b class=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/b&gt;');
  assert.equal(sb.escapeHtml(null), '');
});

test('sanitizarNombre quita caracteres inválidos para nombres de archivo y une con "_"', () => {
  assert.equal(sb.sanitizarNombre(' Rack: sala/2 <nueva>? '), 'Rack_sala2_nueva');
  assert.equal(sb.sanitizarNombre(''), '');
  assert.equal(sb.sanitizarNombre(undefined), '');
});

test('extDeDataUrl deduce la extensión (jpeg → jpg)', () => {
  assert.equal(sb.extDeDataUrl('data:image/jpeg;base64,AAAA'), 'jpg');
  assert.equal(sb.extDeDataUrl('data:image/png;base64,AAAA'), 'png');
  assert.equal(sb.extDeDataUrl('lo que sea'), 'jpg');
});

test('nombreInforme arma Cliente_Proyecto_Fecha.ext', () => {
  assert.equal(
    sb.nombreInforme({ cliente: 'Ecopetrol S.A.', proyecto: 'Rack: sala 2', fecha: '2026-09-18' }, 'docx'),
    'Ecopetrol_S.A._Rack_sala_2_2026-09-18.docx'
  );
});

test('nombreInforme omite partes vacías y cae al código si no hay nada', () => {
  assert.equal(sb.nombreInforme({ cliente: 'ACME', fecha: '2026-01-01' }, 'xlsx'), 'ACME_2026-01-01.xlsx');
  assert.equal(sb.nombreInforme({ codigo: 'FS-123' }, 'pdf'), 'FS-123.pdf');
  assert.equal(sb.nombreInforme({}, 'pdf'), 'FieldSight.pdf');
});

test('mapConcurrente conserva el orden y no supera el límite', async () => {
  let enVuelo = 0, maximo = 0;
  const r = await sb.mapConcurrente([5, 1, 4, 2, 3], 2, async (x) => {
    enVuelo++; maximo = Math.max(maximo, enVuelo);
    await new Promise((res) => setTimeout(res, x * 3));
    enVuelo--;
    return x * 10;
  });
  assert.deepEqual(plano(r), [50, 10, 40, 20, 30]);
  assert.ok(maximo <= 2, 'máximo en vuelo ' + maximo);
});

test('mapConcurrente con lista vacía y con límite mayor que la lista', async () => {
  assert.deepEqual(plano(await sb.mapConcurrente([], 5, async () => 1)), []);
  assert.deepEqual(plano(await sb.mapConcurrente([1, 2], 10, async (x) => x + 1)), [2, 3]);
});

test('la vigencia de los enlaces de fotos es de 90 días', () => {
  assert.equal(evaluar(sb, 'NM_LINK_EXPIRES_SECONDS'), 90 * 24 * 60 * 60);
});
