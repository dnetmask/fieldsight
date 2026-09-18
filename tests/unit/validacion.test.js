const test = require('node:test');
const assert = require('node:assert/strict');
const { crearSandbox, cargar } = require('../helpers/sandbox');

const sb = cargar(crearSandbox(), 'js/validacion.js');

test('validarIP acepta IPv4 válidas y el campo vacío', () => {
  for (const v of ['192.168.1.10', '10.1.0.190', '0.0.0.0', '255.255.255.255', '', undefined]) {
    assert.equal(sb.validarIP(v), true, String(v));
  }
});

test('validarIP rechaza formatos inválidos', () => {
  for (const v of ['256.1.1.1', '192.168.1', '192.168.1.1.1', '1.2.3.', 'abc', '192.168.1.a']) {
    assert.equal(sb.validarIP(v), false, v);
  }
});

test('validarMAC acepta ":" o "-" como separador, en cualquier caja', () => {
  assert.equal(sb.validarMAC('AA:BB:CC:DD:EE:FF'), true);
  assert.equal(sb.validarMAC('aa-bb-cc-dd-ee-ff'), true);
  assert.equal(sb.validarMAC(''), true);
});

test('validarMAC rechaza longitud o dígitos inválidos', () => {
  assert.equal(sb.validarMAC('AA:BB:CC:DD:EE'), false);
  assert.equal(sb.validarMAC('GG:BB:CC:DD:EE:FF'), false);
  assert.equal(sb.validarMAC('AABBCCDDEEFF'), false);
});

test('formatearMAC normaliza a mayúsculas con ":" mientras se escribe', () => {
  assert.equal(sb.formatearMAC('aabbccddeeff'), 'AA:BB:CC:DD:EE:FF');
  assert.equal(sb.formatearMAC('aa-bb.cc dd'), 'AA:BB:CC:DD');
  assert.equal(sb.formatearMAC('AABBCCDDEEFF0011'), 'AA:BB:CC:DD:EE:FF', 'corta a 12 dígitos');
  assert.equal(sb.formatearMAC('a'), 'A');
  assert.equal(sb.formatearMAC(''), '');
});
