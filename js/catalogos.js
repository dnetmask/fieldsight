async function cargarCatalogoTipos(){
  try{
    const { data, error } = await supabaseClient.from('catalogo_tipos_activo').select('nombre').order('nombre');
    if(error) throw error;
    if(data && data.length){
      CATALOGO_TIPOS = data.map(x => x.nombre);
    } else {
      const { error: insErr } = await supabaseClient.from('catalogo_tipos_activo').insert(DEFAULT_TIPOS_ACTIVO.map(nombre => ({nombre})));
      if(!insErr) CATALOGO_TIPOS = DEFAULT_TIPOS_ACTIVO.slice();
    }
  }catch(e){ console.error(e); /* usa la lista por defecto si falla */ }
}
// El mismo nombre con distintas mayúsculas o espacios no debe generar dos
// entradas: se normaliza aquí y, en la base, hay un índice único por
// lower(nombre) (supabase/schema.sql).
function normalizarNombreCatalogo(s){
  const t = String(s||'').trim().replace(/\s+/g, ' ');
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}
async function agregarTipoActivo(nuevo){
  const t = normalizarNombreCatalogo(nuevo);
  if(!t) return null;
  const mismo = (x) => x.toLowerCase() === t.toLowerCase();
  const existente = CATALOGO_TIPOS.find(mismo);
  if(existente) return existente;
  let res;
  try{ res = await supabaseClient.from('catalogo_tipos_activo').insert({nombre:t}); }
  catch(e){ res = {error:e}; }
  if(res.error){
    // Puede existir ya en el servidor con otras mayúsculas, o no haber red:
    // se recarga y, si aparece, se usa esa entrada.
    await cargarCatalogoTipos();
    const enServidor = CATALOGO_TIPOS.find(mismo);
    if(enServidor) return enServidor;
    CATALOGO_TIPOS.push(t);
    toast('Se usará en esta visita, pero no se pudo agregar al catálogo compartido', 3600);
    return t;
  }
  CATALOGO_TIPOS.push(t);
  return t;
}
async function handleTipoActivoChange(uid, value){
  if(value === '__add__'){
    const nuevo = await pedirTexto('Quedará disponible en la lista para todo el equipo.', {titulo:'Nuevo tipo de activo', placeholder:'Ej. Firewall', aceptar:'Agregar'});
    if(nuevo){
      updateActivo(uid, 'tipo', await agregarTipoActivo(nuevo));
      renderActivos(); // el catálogo cambió: los selects de todas las tarjetas necesitan la opción nueva
    } else {
      rerenderActivo(uid); // deja el select como estaba
    }
  } else {
    updateActivo(uid, 'tipo', value);
  }
}

/* ---------------------------------------------------------
   CATÁLOGO DE PROTOCOLOS OT/INDUSTRIALES (compartido)
--------------------------------------------------------- */
async function cargarCatalogoProtocolos(){
  try{
    const { data, error } = await supabaseClient.from('catalogo_protocolos').select('nombre, ethernet').order('nombre');
    if(error) throw error;
    if(data && data.length){
      CATALOGO_PROTOCOLOS = data;
    } else {
      const { error: insErr } = await supabaseClient.from('catalogo_protocolos').insert(DEFAULT_PROTOCOLOS);
      if(!insErr) CATALOGO_PROTOCOLOS = DEFAULT_PROTOCOLOS.slice();
    }
  }catch(e){ console.error(e); /* usa la lista por defecto si falla */ }
}
async function agregarProtocolo(nombre, esEthernet){
  const t = normalizarNombreCatalogo(nombre);
  if(!t) return null;
  const mismo = (x) => x.nombre.toLowerCase() === t.toLowerCase();
  const existente = CATALOGO_PROTOCOLOS.find(mismo);
  if(existente) return existente.nombre;
  let res;
  try{ res = await supabaseClient.from('catalogo_protocolos').insert({nombre:t, ethernet: !!esEthernet}); }
  catch(e){ res = {error:e}; }
  if(res.error){
    await cargarCatalogoProtocolos();
    const enServidor = CATALOGO_PROTOCOLOS.find(mismo);
    if(enServidor) return enServidor.nombre;
    CATALOGO_PROTOCOLOS.push({nombre:t, ethernet: !!esEthernet});
    toast('Se usará en esta visita, pero no se pudo agregar al catálogo compartido', 3600);
    return t;
  }
  CATALOGO_PROTOCOLOS.push({nombre:t, ethernet: !!esEthernet});
  return t;
}
function protocoloEsEthernet(nombre){
  if(!nombre) return false;
  const p = CATALOGO_PROTOCOLOS.find(x => x.nombre === nombre);
  return p ? !!p.ethernet : false;
}
async function handleProtocoloChange(uid, value){
  if(value === '__add__'){
    const r = await mostrarModal({
      titulo: 'Nuevo protocolo',
      mensaje: 'Quedará disponible en la lista para todo el equipo.',
      campo: {placeholder: 'Ej. EtherCAT'},
      opciones: [
        {valor:'ethernet', texto:'Sobre Ethernet', detalle:'Usa dirección IP y MAC'},
        {valor:'serial', texto:'Serial / fieldbus', detalle:'Sin IP ni MAC'}
      ],
      opcionInicial: 'ethernet',
      aceptar: 'Agregar'
    });
    if(r.ok && r.texto){
      updateActivo(uid, 'protocolo', await agregarProtocolo(r.texto, r.opcion === 'ethernet'));
      renderActivos(); // el catálogo cambió: los selects de todas las tarjetas necesitan la opción nueva
    } else {
      rerenderActivo(uid); // deja el select como estaba
    }
  } else {
    updateActivo(uid, 'protocolo', value);
    rerenderActivo(uid); // muestra u oculta IP/MAC solo en esta tarjeta
  }
}

/* ---------------------------------------------------------
   VALIDACIÓN DE IP / MAC
--------------------------------------------------------- */
