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

// Se llama una vez al iniciar sesión — si hay un borrador, ofrece
// continuar donde se quedó o descartarlo.
async function restaurarBorradorSiExiste(){
  let b;
  try{ b = await obtenerBorrador(); }catch(e){ return; }
  if(!b) return;

  const cuando = new Date(b.guardadoEn).toLocaleString('es-CO', {day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit'});
  if(!confirm('Hay un borrador sin guardar de las '+cuando+'. ¿Quieres continuar donde quedaste?')){
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

  gpsActual = b.gpsActual || null;
  if(gpsActual){
    document.getElementById('gpsEmpty').classList.add('hidden');
    document.getElementById('gpsData').classList.remove('hidden');
    document.getElementById('gpsCoord').textContent = gpsActual.lat.toFixed(6)+', '+gpsActual.lng.toFixed(6);
    document.getElementById('gpsMeta').textContent = 'Precisión ±'+Math.round(gpsActual.acc)+' m · '+new Date(gpsActual.ts).toLocaleTimeString('es-CO');
    document.getElementById('gpsLink').href = 'https://maps.google.com/?q='+gpsActual.lat+','+gpsActual.lng;
  }
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
