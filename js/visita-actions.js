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

    gpsActual = r.gps || null;
    if(gpsActual){
      document.getElementById('gpsEmpty').classList.add('hidden');
      document.getElementById('gpsData').classList.remove('hidden');
      document.getElementById('gpsCoord').textContent = gpsActual.lat.toFixed(6)+', '+gpsActual.lng.toFixed(6);
      document.getElementById('gpsMeta').textContent = 'Precisión ±'+Math.round(gpsActual.acc)+' m · '+new Date(gpsActual.ts).toLocaleTimeString('es-CO');
      document.getElementById('gpsLink').href = 'https://maps.google.com/?q='+gpsActual.lat+','+gpsActual.lng;
    }

    if(r.firma && r.firma.dataUrl) await dibujarFirmaDesde(r.firma.dataUrl);

    if(r.tipo === 'activos' && r.activos){
      for(const a of r.activos){
        const fotos = [];
        for(const f of (a.fotos||[])){
          const dataUrl = await resolverFoto(f.key);
          fotos.push({cat:f.cat, key:f.key, dataUrl});
        }
        activos.push(Object.assign({}, a, {uid:newUid(), fotos, catSel:CAT_ACTIVO[0]}));
      }
      renderActivos();
    }
    if(r.tipo === 'implementacion' && r.implementaciones){
      for(const it of r.implementaciones){
        const fotosAntes = [];
        for(const f of (it.fotosAntes||[])){ const dataUrl = await resolverFoto(f.key); fotosAntes.push({cat:f.cat, key:f.key, dataUrl}); }
        const fotosDespues = [];
        for(const f of (it.fotosDespues||[])){ const dataUrl = await resolverFoto(f.key); fotosDespues.push({cat:f.cat, key:f.key, dataUrl}); }
        implementaciones.push(Object.assign({}, it, {uid:newUid(), fotosAntes, fotosDespues, catSelAntes:CAT_ANTES[0], catSelDespues:CAT_DESPUES[0]}));
      }
      renderImpl();
    }
    if(r.tipo === 'inspeccion' && r.checklist){
      for(const key of Object.keys(r.checklist)){
        const st = r.checklist[key];
        let fotoDataUrl = null;
        if(st.fotoKey) fotoDataUrl = await resolverFoto(st.fotoKey);
        checklistState[key] = {estado: st.estado||null, criticidad: st.criticidad||null, obs: st.obs||'', foto: fotoDataUrl, fotoKey: st.fotoKey||null};
      }
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

async function eliminarVisitaActual(){
  if(!currentDetailId) return;
  if(!confirm('¿Eliminar esta visita? Esta acción no se puede deshacer.')) return;
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
