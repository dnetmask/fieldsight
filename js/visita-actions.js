async function reabrirVisita(id){
  if(!id) return;
  try{
    const { data: row, error } = await supabaseClient.from('visitas').select('*').eq('id', id).single();
    if(error || !row){ toast('Visita no encontrada'); return; }
    const r = filaAVisita(row);

    resetForm();
    editingId = r.id;
    editingCodigo = r.codigo;
    editingCreatedAt = r.createdAt || Date.now();

    document.getElementById('fProyecto').value = r.proyecto||'';
    document.getElementById('fCliente').value = r.cliente||'';
    document.getElementById('fSede').value = r.sede||'';
    document.getElementById('fTecnico').value = r.tecnico||'';
    if(r.fecha) document.getElementById('fFecha').value = r.fecha;
    document.getElementById('fObs').value = r.observaciones||'';
    document.getElementById('sigNombre').value = (r.firma&&r.firma.nombre)||'';
    document.getElementById('sigCargo').value = (r.firma&&r.firma.cargo)||'';

    pintarGps(r.gps || null);

    if(r.firma && r.firma.dataUrl) await dibujarFirmaDesde(r.firma.dataUrl);

    if(r.tipo === 'activos' && r.activos){
      const fotosPorActivo = await resolverFotosPorGrupo(r.activos.map(a => a.fotos));
      r.activos.forEach((a, i) => {
        activos.push(Object.assign({}, a, {uid:newUid(), fotos: fotosPorActivo[i], catSel:CAT_ACTIVO[0]}));
      });
      renderActivos();
    }
    if(r.tipo === 'implementacion' && r.implementaciones){
      const grupos = [];
      r.implementaciones.forEach(it => { grupos.push(it.fotosAntes); grupos.push(it.fotosDespues); });
      const fotosImpl = await resolverFotosPorGrupo(grupos);
      r.implementaciones.forEach((it, i) => {
        implementaciones.push(Object.assign({}, it, {uid:newUid(), fotosAntes: fotosImpl[2*i], fotosDespues: fotosImpl[2*i+1], catSelAntes:CAT_ANTES[0], catSelDespues:CAT_DESPUES[0]}));
      });
      renderImpl();
    }
    if(r.tipo === 'inspeccion' && r.checklist){
      const claves = Object.keys(r.checklist);
      const fotosChk = await resolverFotoKeys(claves.map(k => r.checklist[k].fotoKey || null));
      claves.forEach((key, i) => {
        const st = r.checklist[key];
        checklistState[key] = {estado: st.estado||null, criticidad: st.criticidad||null, obs: st.obs||'', foto: fotosChk[i], fotoKey: st.fotoKey||null};
      });
      renderChecklist();
      tipoInspeccion = r.tipoInspeccion || null;
      document.getElementById('tipoInspeccionSel').value = tipoInspeccion || '';
    }

    actualizarVisibilidadTipo(r.tipo);

    const btn = document.getElementById('btnGuardar');
    btn.innerHTML = BTN_GUARDAR_DEFAULT.replace('Guardar visita', 'Actualizar visita');
    document.getElementById('editBannerCode').textContent = r.codigo || r.id;
    document.getElementById('editBanner').classList.remove('hidden');

    goForm();
    toast('Visita cargada — edítala y guarda de nuevo');
  }catch(err){
    console.error(err);
    toast('No se pudo cargar la visita para editar');
  }
}

// Reabre para edición una visita que sigue guardada solo en este teléfono
// (aún no sincronizada) — no necesita conexión, todo viene de IndexedDB.
async function reabrirVisitaLocal(id){
  try{
    const p = await obtenerPendienteLocal(id);
    if(!p){ toast('No se encontró la visita pendiente'); return; }
    const { _rawData: r, _esEdicion, _guardadoLocalEn, ...fila } = p;

    resetForm();
    editingId = fila.id;
    editingCodigo = fila.codigo;
    editingCreatedAt = _guardadoLocalEn;

    document.getElementById('fProyecto').value = fila.proyecto||'';
    document.getElementById('fCliente').value = fila.cliente||'';
    document.getElementById('fSede').value = fila.sede||'';
    document.getElementById('fTecnico').value = fila.tecnico||'';
    if(fila.fecha) document.getElementById('fFecha').value = fila.fecha;
    document.getElementById('fObs').value = (r && r.observaciones) || '';
    document.getElementById('sigNombre').value = (r && r.firma && r.firma.nombre) || '';
    document.getElementById('sigCargo').value = (r && r.firma && r.firma.cargo) || '';

    pintarGps((r && r.gps) || null);

    if(r && r.firma && r.firma.dataUrl) await dibujarFirmaDesde(r.firma.dataUrl);

    if(fila.tipo === 'activos' && r){
      activos = (r.activos||[]).map(a => ({...a}));
      renderActivos();
    }
    if(fila.tipo === 'implementacion' && r){
      implementaciones = (r.implementaciones||[]).map(it => ({...it}));
      renderImpl();
    }
    if(fila.tipo === 'inspeccion' && r){
      checklistState = r.checklist || {};
      renderChecklist();
      tipoInspeccion = r.tipoInspeccion || null;
      document.getElementById('tipoInspeccionSel').value = tipoInspeccion || '';
    }

    actualizarVisibilidadTipo(fila.tipo);

    const btn = document.getElementById('btnGuardar');
    btn.innerHTML = BTN_GUARDAR_DEFAULT.replace('Guardar visita', 'Actualizar visita');
    document.getElementById('editBannerCode').textContent = (fila.codigo||fila.id) + ' (pendiente de sincronizar)';
    document.getElementById('editBanner').classList.remove('hidden');

    goForm();
    toast('Visita pendiente cargada — edítala y guarda de nuevo');
  }catch(err){
    console.error(err);
    toast('No se pudo abrir la visita pendiente');
  }
}

async function eliminarVisitaActual(){
  if(!currentDetailId) return;
  if(!(await confirmar('Se eliminará la visita y todas sus fotos. Esta acción no se puede deshacer.', {titulo:'¿Eliminar esta visita?', aceptar:'Eliminar', peligro:true}))) return;
  try{
    const { data: files } = await supabaseClient.storage.from('fotos').list(currentDetailId);
    if(files && files.length){
      const paths = files.map(f => currentDetailId + '/' + f.name);
      try{ await supabaseClient.storage.from('fotos').remove(paths); }catch(e){}
    }
    const { error } = await supabaseClient.from('visitas').delete().eq('id', currentDetailId);
    if(error) throw new Error(error.message);
    toast('Visita eliminada');
    goHistory();
  }catch(err){
    toast('No se pudo eliminar');
  }
}
