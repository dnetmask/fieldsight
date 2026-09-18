/* ---------------------------------------------------------
   BORRADOR AUTOMÁTICO — guarda el formulario en progreso cada
   cierto tiempo (IndexedDB, en este teléfono) para no perder el
   trabajo si la app se cierra antes de presionar "Guardar visita".
   Es independiente de la cola de sincronización offline (esa vive
   en otra rama sin fusionar todavía) — este módulo no depende de
   ella ni la reemplaza.
--------------------------------------------------------- */
const BORRADOR_DB_NAME = 'fieldsight_borrador';
const BORRADOR_STORE = 'borrador';
const BORRADOR_ID = 'actual';
let _borradorDbPromise = null;

function abrirBorradorDB(){
  if(_borradorDbPromise) return _borradorDbPromise;
  _borradorDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(BORRADOR_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(BORRADOR_STORE, {keyPath: 'id'});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _borradorDbPromise;
}
async function guardarBorrador(snapshot){
  const db = await abrirBorradorDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BORRADOR_STORE, 'readwrite');
    tx.objectStore(BORRADOR_STORE).put(snapshot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function obtenerBorrador(){
  const db = await abrirBorradorDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(BORRADOR_STORE, 'readonly').objectStore(BORRADOR_STORE).get(BORRADOR_ID);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function borrarBorrador(){
  const db = await abrirBorradorDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BORRADOR_STORE, 'readwrite');
    tx.objectStore(BORRADOR_STORE).delete(BORRADOR_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Fotografía del formulario tal como está en memoria ahora mismo.
function snapshotFormularioActual(){
  return {
    id: BORRADOR_ID,
    guardadoEn: Date.now(),
    editingId, editingCodigo, editingCreatedAt,
    tipoSel,
    proyecto: document.getElementById('fProyecto').value,
    cliente: document.getElementById('fCliente').value,
    sede: document.getElementById('fSede').value,
    tecnico: document.getElementById('fTecnico').value,
    fecha: document.getElementById('fFecha').value,
    observaciones: document.getElementById('fObs').value,
    sigNombre: document.getElementById('sigNombre').value,
    sigCargo: document.getElementById('sigCargo').value,
    firmaDataUrl: firmaVacia() ? null : document.getElementById('sigCanvas').toDataURL('image/png'),
    gpsActual,
    activos, implementaciones, checklistState,
    tipoInspeccion: (typeof tipoInspeccion !== 'undefined') ? tipoInspeccion : null
  };
}
async function guardarBorradorActual(){
  try{ await guardarBorrador(snapshotFormularioActual()); }
  catch(e){ console.log('No se pudo autoguardar el borrador:', e); }
}
// Solo si el formulario está a la vista y tiene algo que valga la pena guardar.
function guardarBorradorSiHayContenido(){
  const formView = document.getElementById('formView');
  if(!formView || formView.classList.contains('hidden')) return;
  const hayContenido = tipoSel || document.getElementById('fProyecto').value.trim() || document.getElementById('fSede').value.trim();
  if(hayContenido) guardarBorradorActual();
}
// Guarda ~2 s después de un cambio caro de perder (una foto nueva), sin
// esperar al temporizador de 30 s. resetForm() lo cancela para que un
// guardado tardío no deje un borrador de un formulario ya vacío.
let _borradorProntoTimer = null;
function programarBorradorPronto(){
  clearTimeout(_borradorProntoTimer);
  _borradorProntoTimer = setTimeout(guardarBorradorSiHayContenido, 2000);
}
function cancelarBorradorPronto(){
  clearTimeout(_borradorProntoTimer);
  _borradorProntoTimer = null;
}

// Se llama una vez al iniciar sesión — si hay un borrador, ofrece
// continuar donde se quedó o descartarlo.
async function restaurarBorradorSiExiste(){
  let b;
  try{ b = await obtenerBorrador(); }catch(e){ return; }
  if(!b) return;

  const cuando = new Date(b.guardadoEn).toLocaleString('es-CO', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
  const donde = [b.proyecto, b.sede].filter(s => s && s.trim()).join(' · ');
  // descartable:false -- tocar afuera o Escape no debe descartar el trabajo
  // del técnico; solo el botón explícito.
  const continuar = await confirmar(
    (donde ? donde + ' — ' : '') + 'guardado el ' + cuando + '. ¿Quieres continuar donde quedaste?',
    {titulo:'Borrador sin guardar', aceptar:'Continuar', cancelar:'Descartar borrador', descartable:false}
  );
  if(!continuar){
    await borrarBorrador();
    return;
  }

  editingId = b.editingId; editingCodigo = b.editingCodigo; editingCreatedAt = b.editingCreatedAt;
  document.getElementById('fProyecto').value = b.proyecto || '';
  document.getElementById('fCliente').value = b.cliente || '';
  document.getElementById('fSede').value = b.sede || '';
  document.getElementById('fTecnico').value = b.tecnico || '';
  if(b.fecha) document.getElementById('fFecha').value = b.fecha;
  document.getElementById('fObs').value = b.observaciones || '';
  document.getElementById('sigNombre').value = b.sigNombre || '';
  document.getElementById('sigCargo').value = b.sigCargo || '';

  pintarGps(b.gpsActual || null);
  if(b.firmaDataUrl) await dibujarFirmaDesde(b.firmaDataUrl);

  activos = b.activos || [];
  implementaciones = b.implementaciones || [];
  checklistState = b.checklistState || {};
  if(typeof tipoInspeccion !== 'undefined') tipoInspeccion = b.tipoInspeccion || null;
  renderActivos();
  renderImpl();
  renderChecklist();
  const selInsp = document.getElementById('tipoInspeccionSel');
  if(selInsp) selInsp.value = b.tipoInspeccion || '';

  if(b.tipoSel) actualizarVisibilidadTipo(b.tipoSel);
  if(b.editingId){
    document.getElementById('btnGuardar').innerHTML = BTN_GUARDAR_DEFAULT.replace('Guardar visita', 'Actualizar visita');
    document.getElementById('editBannerCode').textContent = (b.editingCodigo || b.editingId) + '';
    document.getElementById('editBanner').classList.remove('hidden');
  }

  goForm();
  toast('Borrador restaurado ✓');
}
