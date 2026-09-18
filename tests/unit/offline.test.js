const test = require('node:test');
const assert = require('node:assert/strict');
const { crearSandbox, cargar } = require('../helpers/sandbox');

function montar(navigator) {
  const sb = crearSandbox({ navigator, indexedDB: {} });
  cargar(sb, 'js/offline.js');
  return sb;
}

test('debeSincronizarAhora: sin red nunca', () => {
  assert.equal(montar({ onLine: false, connection: { type: 'wifi' } }).debeSincronizarAhora(), false);
});

test('debeSincronizarAhora: en Android solo con wifi/ethernet', () => {
  assert.equal(montar({ onLine: true, connection: { type: 'wifi' } }).debeSincronizarAhora(), true);
  assert.equal(montar({ onLine: true, connection: { type: 'ethernet' } }).debeSincronizarAhora(), true);
  assert.equal(montar({ onLine: true, connection: { type: 'cellular' } }).debeSincronizarAhora(), false);
});

test('debeSincronizarAhora: en iOS (sin la API de conexión) con cualquier red, salvo pausa manual', () => {
  const sb = montar({ onLine: true });
  assert.equal(sb.debeSincronizarAhora(), true);
  sb.setSincronizacionPausada(true);
  assert.equal(sb.sincronizacionPausadaManualmente(), true);
  assert.equal(sb.debeSincronizarAhora(), false);
  sb.setSincronizacionPausada(false);
  assert.equal(sb.debeSincronizarAhora(), true);
});

test('esErrorDeConexion distingue red caída de errores de datos', () => {
  const sb = montar({ onLine: true });
  assert.equal(sb.esErrorDeConexion(new TypeError('Failed to fetch')), true);
  assert.equal(sb.esErrorDeConexion(new Error('NetworkError when attempting to fetch resource')), true);
  assert.equal(sb.esErrorDeConexion(new Error('duplicate key value violates unique constraint')), false);
  assert.equal(sb.esErrorDeConexion({ message: 'new row violates row-level security policy' }), false);
  assert.equal(montar({ onLine: false }).esErrorDeConexion(new Error('cualquier cosa')), true, 'sin red, todo error es de conexión');
});
