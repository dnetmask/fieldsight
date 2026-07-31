function ensureXLSX(){
  return new Promise((resolve, reject) => {
    if(window.XLSX){ resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar el módulo de Excel (revisa tu conexión a internet)'));
    document.head.appendChild(s);
  });
}

async function exportarExcel(){
  if(!currentDetailId) return;
  const btn = document.getElementById('btnExcel');
  const original = btn.innerHTML;
  btn.disabled = true; btn.textContent = 'Generando...';
  try{
    await ensureXLSX();
    const { data: row, error: rowErr } = await supabaseClient.from('visitas').select('*').eq('id', currentDetailId).single();
    if(rowErr || !row) throw new Error('No se encontró la visita');
    const r = filaAVisita(row);
    const wb = XLSX.utils.book_new();

    const wsResumen = XLSX.utils.aoa_to_sheet([
      ['NETMASK S.A.S.', 'Envigado, Antioquia · Colombia'],
      ['Informe de visita técnica', ''],
      [],
      ['Código', r.codigo||''],
      ['Proyecto', r.proyecto||''],
      ['Cliente', r.cliente||''],
      ['Sede', r.sede||''],
      ['Técnico', r.tecnico||''],
      ['Fecha', r.fecha||''],
      ['Tipo de actividad', TIPO_LABEL[r.tipo]||r.tipo||''],
      ['Coordenadas GPS', r.gps ? (r.gps.lat.toFixed(5)+', '+r.gps.lng.toFixed(5)) : 'No capturado'],
      ['Observaciones', r.observaciones||'']
    ]);
    wsResumen['!cols'] = [{wch:22},{wch:40}];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    if(r.tipo === 'activos' && r.activos && r.activos.length){
      const headers = ['#','Nombre','Tipo','Área','Proceso','Máquina','Marca','Modelo','Serial','Tag','Tablero/Rack','Ubicación','Estado','Conectado a red OT','Protocolo','IP','MAC','Observaciones','N° fotos'];
      const rows = r.activos.map((a,i)=>[i+1, a.nombre||'', a.tipo||'', a.area||'', a.proceso||'', a.maquina||'', a.marca||'', a.modelo||'', a.serial||'', a.tag||'', a.tablero||'', a.ubicacion||'', a.estado||'', a.otRed||'', a.protocolo||'', a.ip||'', a.mac||'', a.obs||'', (a.fotos||[]).length]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Activos');
    }

    if(r.tipo === 'implementacion' && r.implementaciones && r.implementaciones.length){
      const headers = ['#','Equipo','Tipo','Marca','Modelo','Serial','Rack/Tablero','Ubicación','Estado inicial','Estado final','Conformidad','Hallazgos','Acción recomendada','Fotos antes','Fotos después'];
      const rows = r.implementaciones.map((it,i)=>[i+1, it.eqNombre||'', it.tipo||'', it.eqMarca||'', it.eqModelo||'', it.eqSerial||'', it.eqTablero||'', it.eqUbicacion||'', it.estadoInicial||'', it.estadoFinal||'', it.conformidad||'', it.hallazgos||'', it.accion||'', (it.fotosAntes||[]).length, (it.fotosDespues||[]).length]);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Implementacion');
    }

    if(r.tipo === 'inspeccion' && r.checklist){
      const headers = ['Grupo','Ítem','Estado','Criticidad','Observación'];
      const rows = [];
      CHECKLIST_DEF.forEach(grp => grp.items.forEach(itxt => {
        const key = grp.grupo+'|'+itxt;
        const st = r.checklist[key] || {};
        const estadoTxt = st.estado==='ok'?'Cumple':st.estado==='bad'?'No cumple':st.estado==='na'?'N/A':'Sin marcar';
        rows.push([grp.grupo, itxt, estadoTxt, st.criticidad||'', st.obs||'']);
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([headers, ...rows]), 'Checklist');
    }

    XLSX.writeFile(wb, (r.codigo||'informe')+'.xlsx');
    toast('Excel generado ✓ revisa tus descargas');
  }catch(err){
    console.error(err);
    toast('No se pudo generar el Excel: '+(err&&err.message?err.message:'error'), 3600);
  }finally{
    btn.disabled = false; btn.innerHTML = original;
  }
}
