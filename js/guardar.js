async function subirFotosDeLista(lista, visitaId, campos){
  const salida = [];
  for(const owner of lista){
    const copia = {...owner};
    for(const field of campos){
      const fotosOut = [];
      for(const f of owner[field]){
        if(f.key){
          // Ya estaba subida (edición de una visita existente) — se reutiliza.
          fotosOut.push({cat:f.cat, key:f.key});
        } else if(f.dataUrl){
          const path = visitaId+'/'+newUid()+'.jpg';
          await subirFotoBlob(path, f.dataUrl);
          fotosOut.push({cat:f.cat, key:path});
        }
      }
      copia[field] = fotosOut;
    }
    delete copia.catSel; delete copia.catSelAntes; delete copia.catSelDespues;
    salida.push(copia);
  }
  return salida;
}
function recolectarKeysDeReporte(report){
  const keys = [];
  (report.activos||[]).forEach(a => (a.fotos||[]).forEach(f=>{ if(f.key) keys.push(f.key); }));
  (report.implementaciones||[]).forEach(it => {
    (it.fotosAntes||[]).forEach(f=>{ if(f.key) keys.push(f.key); });
    (it.fotosDespues||[]).forEach(f=>{ if(f.key) keys.push(f.key); });
  });
  if(report.checklist){
    Object.keys(report.checklist).forEach(k=>{ const st=report.checklist[k]; if(st && st.fotoKey) keys.push(st.fotoKey); });
  }
  return keys;
}

async function guardarVisita(){
  const proyecto = document.getElementById('fProyecto').value.trim();
  const sede = document.getElementById('fSede').value.trim();
  if(!proyecto || !sede){ toast('Completa al menos proyecto y sede'); return; }
  if(!tipoSel){ toast('Selecciona el tipo de actividad'); return; }

  if(tipoSel === 'activos'){
    for(let i=0;i<activos.length;i++){
      const a = activos[i];
      if(protocoloEsEthernet(a.protocolo)){
        if(a.ip && !validarIP(a.ip)){ toast('Activo '+(i+1)+': la dirección IP no tiene un formato válido'); return; }
        if(a.mac && !validarMAC(a.mac)){ toast('Activo '+(i+1)+': la dirección MAC no tiene un formato válido'); return; }
      }
    }
  }

  const btn = document.getElementById('btnGuardar');
  btn.disabled = true;
  const idOriginal = btn.innerHTML;
  btn.innerHTML = editingId ? 'Actualizando...' : 'Guardando...';

  const esEdicion = !!editingId;
  const id = editingId || ('vis_' + Date.now());
  const codigo = editingCodigo || ('FS-' + Date.now().toString().slice(-7));

  let originalKeys = [];
  if(esEdicion){
    try{
      const { data: prevRow } = await supabaseClient.from('visitas').select('data').eq('id', id).single();
      if(prevRow) originalKeys = recolectarKeysDeReporte(prevRow.data || {});
    }catch(e){}
  }

  try{
    let activosOut = [], implOut = [], checklistOut = {};

    if(tipoSel === 'activos'){
      activosOut = await subirFotosDeLista(activos, id, ['fotos']);
    }
    if(tipoSel === 'implementacion'){
      implOut = await subirFotosDeLista(implementaciones, id, ['fotosAntes','fotosDespues']);
    }
    if(tipoSel === 'inspeccion'){
      for(const key of Object.keys(checklistState)){
        const st = checklistState[key];
        const copia = {estado:st.estado, criticidad:st.criticidad, obs:st.obs, fotoKey:null};
        if(st.fotoKey && st.foto){
          copia.fotoKey = st.fotoKey; // ya estaba subida, no se toca
        } else if(st.foto){
          const fkey = id+'/'+newUid()+'.jpg';
          await subirFotoBlob(fkey, st.foto);
          copia.fotoKey = fkey;
        }
        checklistOut[key] = copia;
      }
    }

    const dataBlob = {
      gps: gpsActual,
      activos: activosOut,
      implementaciones: implOut,
      checklist: checklistOut,
      tipoInspeccion: tipoSel === 'inspeccion' ? tipoInspeccion : null,
      observaciones: document.getElementById('fObs').value.trim(),
      firma: {
        nombre: document.getElementById('sigNombre').value.trim(),
        cargo: document.getElementById('sigCargo').value.trim(),
        dataUrl: firmaVacia() ? null : document.getElementById('sigCanvas').toDataURL('image/png')
      }
    };

    const fila = {
      id, codigo,
      proyecto, cliente: document.getElementById('fCliente').value.trim(),
      sede, tecnico: document.getElementById('fTecnico').value.trim(),
      fecha: document.getElementById('fFecha').value || null,
      tipo: tipoSel,
      data: dataBlob,
      updated_by: currentUser.id,
      actualizado_por_nombre: currentProfile.nombre,
      updated_at: new Date().toISOString()
    };

    let dbError;
    if(esEdicion){
      const { error } = await supabaseClient.from('visitas').update(fila).eq('id', id);
      dbError = error;
    } else {
      fila.created_by = currentUser.id;
      fila.creado_por_nombre = currentProfile.nombre;
      const { error } = await supabaseClient.from('visitas').insert(fila);
      dbError = error;
    }
    if(dbError) throw new Error(dbError.message);

    if(esEdicion && originalKeys.length){
      const finalKeys = new Set(recolectarKeysDeReporte(dataBlob));
      const orphaned = originalKeys.filter(k => !finalKeys.has(k));
      if(orphaned.length){ try{ await supabaseClient.storage.from('fotos').remove(orphaned); }catch(e){} }
    }

    toast(esEdicion ? 'Visita actualizada ✓' : 'Visita guardada ✓ Código '+codigo);
    resetForm();
    goHistory();
  }catch(err){
    console.error(err);
    toast('No se pudo guardar: ' + (err && err.message ? err.message : 'error desconocido'), 3600);
  }finally{
    btn.disabled = false;
    btn.innerHTML = idOriginal;
  }
}

function cancelarEdicion(){
  resetForm();
  goForm();
  toast('Edición cancelada');
}

function resetForm(){
  document.getElementById('fProyecto').value='';
  document.getElementById('fCliente').value='';
  document.getElementById('fSede').value='';
  document.getElementById('fTecnico').value='';
  document.getElementById('fFecha').valueAsDate = new Date();
  document.getElementById('fObs').value='';
  document.getElementById('sigNombre').value='';
  document.getElementById('sigCargo').value='';
  tipoSel = null;
  ['activos','implementacion','inspeccion'].forEach(k => document.getElementById('topt-'+k).classList.remove('on'));
  document.getElementById('blockActivos').classList.add('hidden');
  document.getElementById('blockImplementacion').classList.add('hidden');
  document.getElementById('blockChecklist').classList.add('hidden');
  gpsActual = null;
  document.getElementById('gpsEmpty').classList.remove('hidden');
  document.getElementById('gpsData').classList.add('hidden');
  activos = []; renderActivos();
  implementaciones = []; renderImpl();
  checklistState = {}; renderChecklist();
  tipoInspeccion = null;
  document.getElementById('tipoInspeccionSel').value = '';
  limpiarFirma();
  editingId = null; editingCodigo = null; editingCreatedAt = null;
  document.getElementById('editBanner').classList.add('hidden');
  document.getElementById('btnGuardar').innerHTML = BTN_GUARDAR_DEFAULT;
}

/* ---------------------------------------------------------
   HISTORIAL
--------------------------------------------------------- */
