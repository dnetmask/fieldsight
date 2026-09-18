const test = require('node:test');
const assert = require('node:assert/strict');
const { crearSandbox, cargar, evaluar, capturarToasts, plano } = require('../helpers/sandbox');

// Supabase falso: solo lo que usa catalogos.js (select().order(), insert()).
function clienteFalso({ tipos = [], protocolos = [], fallarInsert = false } = {}) {
  const inserts = [];
  return {
    inserts,
    from(tabla) {
      return {
        select() {
          return {
            order: async () => ({
              data: tabla === 'catalogo_tipos_activo' ? tipos.map((n) => ({ nombre: n })) : protocolos,
              error: null,
            }),
          };
        },
        insert: async (obj) => {
          inserts.push({ tabla, obj });
          return fallarInsert ? { error: { message: 'duplicate key value violates unique constraint' } } : { error: null };
        },
      };
    },
  };
}

function montar(opciones) {
  const supabaseClient = clienteFalso(opciones);
  const sb = crearSandbox({
    supabaseClient,
    DEFAULT_TIPOS_ACTIVO: ['Switch', 'Router', 'UPS'],
    DEFAULT_PROTOCOLOS: [{ nombre: 'Modbus TCP', ethernet: true }, { nombre: 'Modbus RTU', ethernet: false }],
    CAT_ACTIVO: ['Panorámica'], CAT_ANTES: ['x'], CAT_DESPUES: ['x'],
  });
  cargar(sb, 'js/state.js', 'js/utils.js', 'js/catalogos.js');
  const toasts = capturarToasts(sb);
  return { sb, supabaseClient, toasts };
}

test('normalizarNombreCatalogo: espacios y mayúscula inicial', () => {
  const { sb } = montar();
  assert.equal(sb.normalizarNombreCatalogo('  firewall   NGFW  '), 'Firewall NGFW');
  assert.equal(sb.normalizarNombreCatalogo('switch'), 'Switch');
  assert.equal(sb.normalizarNombreCatalogo('   '), '');
  assert.equal(sb.normalizarNombreCatalogo(undefined), '');
});

test('agregarTipoActivo devuelve la entrada existente sin distinguir mayúsculas y no inserta', async () => {
  const { sb, supabaseClient } = montar();
  assert.equal(await sb.agregarTipoActivo('  switch '), 'Switch');
  assert.equal(supabaseClient.inserts.length, 0);
  assert.equal(evaluar(sb, 'CATALOGO_TIPOS').length, 3);
});

test('agregarTipoActivo inserta el nombre normalizado y lo suma a la lista', async () => {
  const { sb, supabaseClient, toasts } = montar();
  assert.equal(await sb.agregarTipoActivo('firewall  NGFW '), 'Firewall NGFW');
  assert.deepEqual(plano(supabaseClient.inserts), [{ tabla: 'catalogo_tipos_activo', obj: { nombre: 'Firewall NGFW' } }]);
  assert.ok(evaluar(sb, 'CATALOGO_TIPOS').includes('Firewall NGFW'));
  assert.equal(toasts.length, 0);
});

test('si el servidor ya lo tiene con otra grafía, usa la del servidor', async () => {
  // El servidor devuelve "Firewall" (índice único por lower(nombre) rechaza "FIREWALL").
  const { sb, toasts } = montar({ tipos: ['Switch', 'Router', 'UPS', 'Firewall'], fallarInsert: true });
  assert.equal(await sb.agregarTipoActivo('FIREWALL'), 'Firewall');
  assert.equal(toasts.length, 0, 'no avisa: sí quedó en el catálogo compartido');
});

test('si falla el insert y el servidor no lo tiene (sin red), lo usa igual y avisa', async () => {
  const { sb, toasts } = montar({ tipos: ['Switch', 'Router', 'UPS'], fallarInsert: true });
  assert.equal(await sb.agregarTipoActivo('PLC'), 'PLC');
  assert.ok(evaluar(sb, 'CATALOGO_TIPOS').includes('PLC'), 'queda disponible en esta sesión');
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /no se pudo agregar al catálogo compartido/);
});

test('agregarProtocolo respeta el tipo de red y deduplica', async () => {
  const { sb, supabaseClient } = montar();
  assert.equal(await sb.agregarProtocolo(' ethercat', true), 'Ethercat');
  assert.deepEqual(plano(supabaseClient.inserts[0]), { tabla: 'catalogo_protocolos', obj: { nombre: 'Ethercat', ethernet: true } });
  assert.equal(await sb.agregarProtocolo('MODBUS tcp', false), 'Modbus TCP', 'ya existía: devuelve el nombre guardado');
  assert.equal(supabaseClient.inserts.length, 1);
});

test('protocoloEsEthernet', () => {
  const { sb } = montar();
  assert.equal(sb.protocoloEsEthernet('Modbus TCP'), true);
  assert.equal(sb.protocoloEsEthernet('Modbus RTU'), false);
  assert.equal(sb.protocoloEsEthernet('Inexistente'), false);
  assert.equal(sb.protocoloEsEthernet(''), false);
});
