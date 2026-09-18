const test = require('node:test');
const assert = require('node:assert/strict');
const { crearSandbox, cargar, plano } = require('../helpers/sandbox');

// Storage falso: cada foto tarda distinto para que el orden de llegada no
// coincida con el de pedida, y una clave falla a propósito.
function montar() {
  let enVuelo = 0, maximo = 0, llamadas = 0;
  const sb = crearSandbox({
    supabaseClient: { storage: { from() { return {
      createSignedUrl: async (key) => {
        llamadas++; enVuelo++; maximo = Math.max(maximo, enVuelo);
        await new Promise((r) => setTimeout(r, 5 + Math.random() * 20));
        enVuelo--;
        if (key === 'falla.jpg') return { data: null, error: { message: 'boom' } };
        return { data: { signedUrl: 'sig://' + key }, error: null };
      },
    }; } } },
    fetch: async (url) => ({ ok: true, blob: async () => url }),
    FileReader: class { readAsDataURL(blob) { queueMicrotask(() => { this.result = 'data:' + blob; this.onload && this.onload(); }); } },
    Blob: class {},
    atob: (s) => s,
    Uint8Array,
  });
  cargar(sb, 'js/utils.js', 'js/detalle.js');
  return { sb, medir: () => ({ maximo, llamadas }) };
}

test('resolverFotosPorGrupo agrupa, conserva el orden y respeta el tope global de 5', async () => {
  const { sb, medir } = montar();
  const grupos = [
    [{ cat: 'A1', key: 'a1.jpg' }, { cat: 'A2', key: 'a2.jpg' }, { cat: 'A3', key: 'a3.jpg' }],
    [],
    [{ cat: 'C1', key: 'c1.jpg' }],
    Array.from({ length: 7 }, (_, i) => ({ cat: 'D' + (i + 1), key: i === 1 ? 'falla.jpg' : `d${i + 1}.jpg` })),
  ];
  const out = plano(await sb.resolverFotosPorGrupo(grupos));
  assert.equal(out.length, 4);
  assert.deepEqual(out[1], []);
  assert.deepEqual(out[0].map((f) => f.cat), ['A1', 'A2', 'A3']);
  assert.deepEqual(out[3].map((f) => f.cat), ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7']);
  assert.deepEqual(out[0][0], { cat: 'A1', key: 'a1.jpg', dataUrl: 'data:sig://a1.jpg' });
  assert.equal(out[3][1].dataUrl, null, 'la foto que falla da null y no rompe el lote');
  const { maximo, llamadas } = medir();
  assert.equal(llamadas, 11);
  assert.ok(maximo <= 5, 'máximo en vuelo ' + maximo);
});

test('resolverFotos mantiene la forma anterior ({cat, dataUrl}) más la key', async () => {
  const { sb } = montar();
  assert.deepEqual(plano(await sb.resolverFotos([{ cat: 'X', key: 'x.jpg' }])), [{ cat: 'X', key: 'x.jpg', dataUrl: 'data:sig://x.jpg' }]);
  assert.deepEqual(plano(await sb.resolverFotos(undefined)), []);
});

test('resolverFotoKeys respeta los null en su posición', async () => {
  const { sb } = montar();
  assert.deepEqual(plano(await sb.resolverFotoKeys(['k1.jpg', null, 'k3.jpg'])), ['data:sig://k1.jpg', null, 'data:sig://k3.jpg']);
});

test('enlaceFirmadoFoto devuelve la URL firmada (o null si falla / no hay clave)', async () => {
  const { sb } = montar();
  assert.equal(await sb.enlaceFirmadoFoto('a.jpg'), 'sig://a.jpg');
  assert.equal(await sb.enlaceFirmadoFoto('falla.jpg'), null);
  assert.equal(await sb.enlaceFirmadoFoto(''), null);
});
