/* ---------------------------------------------------------
   MODO OFFLINE — si no hay conexión (o la política de sync no lo
   permite en este momento), la visita se guarda localmente en el
   teléfono (IndexedDB — no localStorage, que ya causó un bug de
   cuota llena en campo) y se sincroniza sola cuando corresponde:

     - Android/Chrome: solo con WiFi (navigator.connection.type).
     - iPhone/Safari: esa API no existe ahí, así que se sincroniza
       en cuanto haya cualquier conexión — salvo que el técnico
       active manualmente "Pausar con datos móviles".
--------------------------------------------------------- */
const OFFLINE_DB_NAME = 'fieldsight_offline';
const OFFLINE_STORE = 'pendientes';
let _offlineDbPromise = null;

function abrirOfflineDB(){
  if(_offlineDbPromise) return _offlineDbPromise;
  _offlineDbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(OFFLINE_DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(OFFLINE_STORE, {keyPath: 'id'});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _offlineDbPromise;
}

// Guarda (o actualiza) una visita pendiente. Si ya existía una versión
// pendiente de esta misma visita, conserva su _esEdicion original — si no,
// una visita nueva editada varias veces sin conexión terminaría marcada
// como "actualización" y se intentaría un UPDATE contra un registro que
// nunca se llegó a insertar en el servidor.
async function guardarVisitaLocal(fila, rawData, esEdicionDeEstaLlamada){
  const db = await abrirOfflineDB();
  const existente = await obtenerPendienteLocal(fila.id);
  const esEdicion = existente ? existente._esEdicion : esEdicionDeEstaLlamada;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    tx.objectStore(OFFLINE_STORE).put({
      ...fila,
      _rawData: rawData,
      _esEdicion: esEdicion,
      _guardadoLocalEn: existente ? existente._guardadoLocalEn : Date.now()
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function listarPendientesLocal(){
  const db = await abrirOfflineDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(OFFLINE_STORE, 'readonly').objectStore(OFFLINE_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function obtenerPendienteLocal(id){
  const db = await abrirOfflineDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(OFFLINE_STORE, 'readonly').objectStore(OFFLINE_STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function eliminarPendienteLocal(id){
  const db = await abrirOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_STORE, 'readwrite');
    tx.objectStore(OFFLINE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ---------------------------------------------------------
   POLÍTICA DE SINCRONIZACIÓN
--------------------------------------------------------- */
function sincronizacionPausadaManualmente(){
  return localStorage.getItem('fs_pausarSyncDatos') === '1';
}
function setSincronizacionPausada(pausada){
  localStorage.setItem('fs_pausarSyncDatos', pausada ? '1' : '0');
}
function debeSincronizarAhora(){
  if(!navigator.onLine) return false;
  if(sincronizacionPausadaManualmente()) return false;
  const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
  if(conn && conn.type){
    // Solo Android/Chrome expone esta API de forma confiable — ahí sí se
    // exige WiFi/ethernet. En iOS/Safari (sin esta API) se cae al "sincroniza
    // con cualquier conexión" que viene después de este bloque.
    return conn.type === 'wifi' || conn.type === 'ethernet';
  }
  return true;
}

/* ---------------------------------------------------------
   ENVÍO AL SERVIDOR (compartido entre guardado en línea y
   sincronización en segundo plano de lo pendiente)
--------------------------------------------------------- */
async function subirVisitaCompleta(fila, rawData, esEdicion){
  let originalKeys = [];
  if(esEdicion){
    try{
      const { data: prevRow } = await supabaseClient.from('visitas').select('data').eq('id', fila.id).single();
      if(prevRow) originalKeys = recolectarKeysDeReporte(prevRow.data || {});
    }catch(e){}
  }

  let activosOut = [], implOut = [], checklistOut = {};
  if(fila.tipo === 'activos'){
    activosOut = await subirFotosDeLista(rawData.activos, fila.id, ['fotos']);
  }
  if(fila.tipo === 'implementacion'){
    implOut = await subirFotosDeLista(rawData.implementaciones, fila.id, ['fotosAntes','fotosDespues']);
  }
  if(fila.tipo === 'inspeccion'){
    for(const key of Object.keys(rawData.checklist || {})){
      const st = rawData.checklist[key];
      const copia = {estado:st.estado, criticidad:st.criticidad, obs:st.obs, fotoKey:null};
      if(st.fotoKey && st.foto){
        copia.fotoKey = st.fotoKey;
      } else if(st.foto){
        const fkey = fila.id+'/'+newUid()+'.jpg';
        await subirFotoBlob(fkey, st.foto);
        copia.fotoKey = fkey;
      }
      checklistOut[key] = copia;
    }
  }

  const dataBlob = {
    gps: rawData.gps,
    activos: activosOut,
    implementaciones: implOut,
    checklist: checklistOut,
    tipoInspeccion: rawData.tipoInspeccion || null,
    observaciones: rawData.observaciones,
    firma: rawData.firma
  };

  const filaEnviar = {...fila, data: dataBlob};

  let dbError;
  if(esEdicion){
    const { error } = await supabaseClient.from('visitas').update(filaEnviar).eq('id', fila.id);
    dbError = error;
  } else {
    const { error } = await supabaseClient.from('visitas').insert(filaEnviar);
    dbError = error;
  }
  if(dbError) throw new Error(dbError.message);

  if(esEdicion && originalKeys.length){
    const finalKeys = new Set(recolectarKeysDeReporte(dataBlob));
    const orphaned = originalKeys.filter(k => !finalKeys.has(k));
    if(orphaned.length){ try{ await supabaseClient.storage.from('fotos').remove(orphaned); }catch(e){} }
  }
}

function esErrorDeConexion(err){
  if(!navigator.onLine) return true;
  if(err instanceof TypeError) return true; // fetch() lanza TypeError cuando no hay red
  const msg = (err && err.message || '').toLowerCase();
  return msg.includes('fetch') || msg.includes('network') || msg.includes('connection') || msg.includes('conexión');
}

/* ---------------------------------------------------------
   SINCRONIZACIÓN EN SEGUNDO PLANO
--------------------------------------------------------- */
let _sincronizandoPendientes = false;
async function intentarSincronizarPendientes(esManual){
  if(_sincronizandoPendientes) return;
  if(!esManual && !debeSincronizarAhora()) return;

  _sincronizandoPendientes = true;
  try{
    const pendientes = await listarPendientesLocal();
    if(!pendientes.length){
      if(esManual) toast('No hay visitas pendientes por sincronizar');
      await actualizarBarraSync();
      return;
    }
    if(esManual && !debeSincronizarAhora() && !navigator.onLine){
      toast('Sin conexión — no se puede sincronizar todavía');
      return;
    }
    let sincronizadas = 0;
    for(const p of pendientes){
      const { _rawData, _esEdicion, _guardadoLocalEn, ...fila } = p;
      try{
        await subirVisitaCompleta(fila, _rawData, _esEdicion);
        await eliminarPendienteLocal(p.id);
        sincronizadas++;
      }catch(err){
        console.log('No se pudo sincronizar la visita '+p.id+' todavía:', err);
        if(esManual && !esErrorDeConexion(err)){
          toast('Una visita pendiente tiene un error: '+(err.message||''), 3600);
        }
      }
    }
    if(sincronizadas) toast(sincronizadas+' visita(s) sincronizada(s) ✓');
  } finally {
    _sincronizandoPendientes = false;
    await actualizarBarraSync();
  }
}

/* ---------------------------------------------------------
   BARRA DE ESTADO (bajo el topbar)
--------------------------------------------------------- */
async function actualizarBarraSync(){
  const bar = document.getElementById('syncBar');
  if(!bar) return;
  const chk = document.getElementById('chkPausarDatos');
  if(chk) chk.checked = sincronizacionPausadaManualmente();
  const pendientes = await listarPendientesLocal();
  const txt = document.getElementById('syncBarText');
  if(!pendientes.length){
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  if(txt) txt.textContent = pendientes.length + (pendientes.length===1 ? ' visita pendiente de sincronizar' : ' visitas pendientes de sincronizar');
}
