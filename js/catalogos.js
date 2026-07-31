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
    const nuevo = window.prompt('Nombre del nuevo tipo de activo:');
    if(nuevo && nuevo.trim()){
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
    const nuevo = window.prompt('Nombre del nuevo protocolo:');
    if(nuevo && nuevo.trim()){
      const esEthernet = window.confirm('¿Este protocolo funciona sobre Ethernet y usa dirección IP/MAC?\n\nAceptar = Sí (Ethernet/IP)\nCancelar = No (serial/fieldbus)');
      const nombre = await agregarProtocolo(nuevo, esEthernet);
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
