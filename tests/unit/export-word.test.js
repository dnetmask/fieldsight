// Genera un .docx real con el mismo código que usa el navegador (JSZip desde
// npm en vez del CDN) y revisa la estructura OOXML: partes, relaciones, pie
// de página, portada e índice.
const test = require('node:test');
const assert = require('node:assert/strict');
const JSZip = require('jszip');
const { crearSandbox, cargar, plano } = require('../helpers/sandbox');

const PNG_1PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function montar() {
  const sb = crearSandbox({
    fetch: async () => ({ blob: async () => ({ type: 'image/png' }) }),
    FileReader: class { readAsDataURL() { queueMicrotask(() => { this.result = PNG_1PX; this.onload && this.onload(); }); } },
    Image: class { set src(_v) { this.naturalWidth = 6473; this.naturalHeight = 1275; queueMicrotask(() => this.onload && this.onload()); } },
    TIPO_LABEL: { activos: 'Levantamiento de activos', implementacion: 'Implementación antes/después', inspeccion: 'Inspección' },
    CHECKLIST_DEF: [{ grupo: 'Físico', items: ['Orden'] }],
    resolverFotos: async () => [],
    resolverFoto: async () => null,
  });
  cargar(sb, 'js/utils.js', 'js/export-word.js');
  sb.JSZip = JSZip; // ensureJSZip() lo encuentra en window.JSZip y no inyecta el <script> del CDN
  return sb;
}

// Chequeo de XML bien formado sin dependencias: balance de etiquetas.
function xmlBienFormado(xml) {
  const pila = [];
  const sinProlog = xml.replace(/<\?xml[^>]*\?>/, '');
  for (const m of sinProlog.matchAll(/<(\/?)([\w:.-]+)[^>]*?(\/?)>/g)) {
    const [, cierra, nombre, autocierra] = m;
    if (autocierra) continue;
    if (cierra) { if (pila.pop() !== nombre) return false; }
    else pila.push(nombre);
  }
  return pila.length === 0;
}

const VISITA = {
  id: 'v1', codigo: 'FS-0001', cliente: 'Cliente de Prueba S.A.S.', proyecto: 'Proyecto Norte', sede: 'Sede Principal',
  tecnico: 'Jorge Osorio', fecha: '2026-09-18', tipo: 'activos', observaciones: 'Todo en orden',
  gps: { lat: 6.17, lng: -75.6 }, activos: [], firma: null,
};

test('portada con logo, índice y pie de página con los contactos de Netmask', async () => {
  const sb = montar();
  const b = sb.crearDocxBuilder();
  await sb.agregarPortadaAWord(b, VISITA);
  sb.agregarIndiceAWord(b, VISITA);
  b.addRaw(sb.docxH1('Informe de visita técnica — ' + VISITA.codigo));

  const blob = await b.build();
  const zip = await JSZip.loadAsync(Buffer.from(await blob.arrayBuffer()));
  const leer = (p) => zip.file(p).async('string');

  for (const parte of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/footer1.xml', 'word/_rels/document.xml.rels']) {
    assert.ok(zip.file(parte), 'falta ' + parte);
    assert.ok(xmlBienFormado(await leer(parte)), parte + ' mal formado');
  }
  assert.ok(zip.file('word/media/image1.png'), 'el logo va como imagen embebida');

  const doc = await leer('word/document.xml');
  assert.match(doc, /INFORME DE VISITA TÉCNICA/);
  assert.match(doc, /Levantamiento de activos/);
  assert.match(doc, /Cliente de Prueba S\.A\.S\./);
  assert.match(doc, /<w:t[^>]*>Contenido<\/w:t>/);
  assert.match(doc, /01\s+Datos generales/);
  assert.match(doc, /02\s+Activos levantados/);
  assert.match(doc, /03\s+Observaciones generales/);
  assert.match(doc, /04\s+Firma/);
  assert.equal((doc.match(/<w:br w:type="page"\/>/g) || []).length, 2, 'salto de página tras portada y tras índice');
  assert.match(doc, /<w:footerReference w:type="default" r:id="rIdFooter1"\/>/);

  const footer = await leer('word/footer1.xml');
  assert.match(footer, /NETMASK S\.A\.S\./);
  assert.match(footer, /contacto@netmask\.co/);
  assert.match(footer, /\+57 313 319 0566/);

  assert.match(await leer('[Content_Types].xml'), /footer1\.xml/);
  const rels = await leer('word/_rels/document.xml.rels');
  assert.match(rels, /Id="rIdFooter1"[^>]*Target="footer1\.xml"/);
  assert.match(rels, /Id="rId1"[^>]*Target="media\/image1\.png"/);
});

test('el índice solo lista las secciones que aplican a la visita', () => {
  const sb = montar();
  assert.deepEqual(plano(sb.construirIndice({ tipo: 'inspeccion' })), ['Datos generales', 'Checklist de inspección', 'Firma']);
  assert.deepEqual(plano(sb.construirIndice({ tipo: 'implementacion', observaciones: 'x' })), ['Datos generales', 'Implementación antes / después', 'Observaciones generales', 'Firma']);
});

test('xmlEsc escapa lo que rompería el XML', () => {
  assert.equal(montar().xmlEsc('a < b & c > d'), 'a &lt; b &amp; c &gt; d');
});
