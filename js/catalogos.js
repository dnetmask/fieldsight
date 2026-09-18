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
async function agregarTipoActivo(nuevo){
  const t = nuevo.trim();
  if(!t) return null;
  const existente = CATALOGO_TIPOS.find(x => x.toLowerCase() === t.toLowerCase());
  if(existente) return existente;
  try{
    const { error } = await supabaseClient.from('catalogo_tipos_activo').insert({nombre:t});
    if(!error) CATALOGO_TIPOS.push(t);
  }catch(e){}
  return t;
}
async function handleTipoActivoChange(uid, value){
  if(value === '__add__'){
    const nuevo = await pedirTexto('Quedará disponible en la lista para todo el equipo.', {titulo:'Nuevo tipo de activo', placeholder:'Ej. Firewall', aceptar:'Agregar'});
    if(nuevo){
      const t = await agregarTipoActivo(nuevo);
      updateActivo(uid, 'tipo', t);
    }
    renderActivos();
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
  const t = nombre.trim();
  if(!t) return null;
  const existente = CATALOGO_PROTOCOLOS.find(x => x.nombre.toLowerCase() === t.toLowerCase());
  if(existente) return existente.nombre;
  try{
    const { error } = await supabaseClient.from('catalogo_protocolos').insert({nombre:t, ethernet: !!esEthernet});
    if(!error) CATALOGO_PROTOCOLOS.push({nombre:t, ethernet: !!esEthernet});
  }catch(e){}
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
      const nombre = await agregarProtocolo(r.texto, r.opcion === 'ethernet');
      updateActivo(uid, 'protocolo', nombre);
    }
  } else {
    updateActivo(uid, 'protocolo', value);
  }
  renderActivos();
}

/* ---------------------------------------------------------
   VALIDACIÓN DE IP / MAC
--------------------------------------------------------- */
