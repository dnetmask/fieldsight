// Carga los js/*.js de la app (scripts clásicos con funciones globales, no
// módulos) dentro de un contexto aislado de Node, igual que si fueran varios
// <script> en una página. Las funciones de nivel superior quedan como
// propiedades del sandbox (sb.validarIP); los let/const de nivel superior se
// leen con evaluar(sb, 'NOMBRE').
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const RAIZ = path.resolve(__dirname, '..', '..');

// Lo justo de un elemento DOM para que la app lea/escriba valores, clases y HTML.
function elementoFalso(id) {
  const clases = new Set();
  const el = {
    id, value: '', innerHTML: '', textContent: '', disabled: false, checked: false,
    style: {}, apendido: '', removido: false, hijos: [],
    classList: {
      add: (...c) => c.forEach((x) => clases.add(x)),
      remove: (...c) => c.forEach((x) => clases.delete(x)),
      toggle: (c, f) => { if (f === undefined) f = !clases.has(c); if (f) clases.add(c); else clases.delete(c); return f; },
      contains: (c) => clases.has(c),
    },
    insertAdjacentHTML(_pos, html) { el.apendido += html; },
    remove() { el.removido = true; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    appendChild(h) { el.hijos.push(h); },
    addEventListener() {},
    focus() {},
    setSelectionRange() {},
    dispatchEvent() {},
    getAttribute() { return null; },
  };
  return el;
}

function documentoFalso() {
  const registro = {};
  return {
    getElementById(id) { if (!registro[id]) registro[id] = elementoFalso(id); return registro[id]; },
    createElement(tag) { return elementoFalso('<' + tag + '>'); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    body: { appendChild() {} },
    activeElement: null,
    visibilityState: 'visible',
    _registro: registro,
  };
}

function almacenFalso() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
}

function crearSandbox(extra = {}) {
  const sb = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
    URL, URLSearchParams, TextEncoder, TextDecoder, Buffer,
    document: documentoFalso(),
    navigator: { onLine: true },
    localStorage: almacenFalso(),
    ...extra,
  };
  sb.window = sb;
  sb.self = sb;
  vm.createContext(sb);
  return sb;
}

function cargar(sb, ...archivos) {
  for (const a of archivos) {
    vm.runInContext(fs.readFileSync(path.join(RAIZ, a), 'utf8'), sb, { filename: a });
  }
  return sb;
}

function evaluar(sb, expresion) {
  return vm.runInContext(expresion, sb);
}

// Reemplaza toast() por una lista donde quedan los mensajes.
function capturarToasts(sb) {
  const mensajes = [];
  sb.toast = (m) => mensajes.push(String(m));
  return mensajes;
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Los arrays/objetos creados dentro del sandbox tienen otros prototipos que
// los del test (otro "realm"), y assert.deepStrictEqual los rechaza aunque
// tengan el mismo contenido. plano() los convierte a valores del test.
const plano = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));

module.exports = { RAIZ, crearSandbox, cargar, evaluar, capturarToasts, elementoFalso, documentoFalso, esperar, plano };
