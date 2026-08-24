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

/* SheetJS Community no incrusta imágenes reales en el .xlsx (eso requiere
   la versión Pro) -- en vez de eso, esta hoja deja cada foto organizada
   con su referencia y un enlace directo (signed URL, válido 7 días) para
   abrirla en el navegador con un clic. Las imágenes reales van en el
   Word/PDF/ZIP. */
async function agregarHojaFotos(wb, r){
  const filas = [];
  if(r.tipo === 'activos' && r.activos){
    for(const a of r.activos){
      for(const f of (a.fotos||[])) filas.push({ref: a.nombre||'Activo', cat: f.cat||'', key: f.key});
    }
  }
  if(r.tipo === 'implementacion' && r.implementaciones){
    for(const it of r.implementaciones){
      for(const f of (it.fotosAntes||[])) filas.push({ref: it.eqNombre||'Equipo', cat: 'Antes · '+(f.cat||''), key: f.key});
      for(const f of (it.fotosDespues||[])) filas.push({ref: it.eqNombre||'Equipo', cat: 'Después · '+(f.cat||''), key: f.key});
    }
  }
  if(r.tipo === 'inspeccion' && r.checklist){
    for(const clave of Object.keys(r.checklist)){
      const st = r.checklist[clave];
      if(st.fotoKey) filas.push({ref: clave.split('|')[1]||'Ítem', cat: clave.split('|')[0]||'', key: st.fotoKey});
    }
  }
  if(!filas.length) return;

  const vencimiento = new Date(Date.now() + NM_LINK_EXPIRES_SECONDS*1000);
  const vencimientoTxt = vencimiento.toLocaleDateString('es-CO', {year:'numeric', month:'2-digit', day:'2-digit'});
  const nota = `Estos enlaces vencen el ${vencimientoTxt}. Si ya no funcionan, comunícate con Netmask S.A.S.: contacto@netmask.co · WhatsApp +57 313 319 0566.`;

  const filaEncabezado = 2; // nota (0) + fila en blanco (1) + encabezado (2)
  const aoa = [
    [nota, '', '', ''],
    [],
    ['#','Referencia','Categoría','Foto'],
    ...filas.map((f,i)=>[i+1, f.ref, f.cat, 'Abrir foto'])
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!merges'] = [{s:{r:0,c:0}, e:{r:0,c:3}}];
  ws['!cols'] = [{wch:5},{wch:28},{wch:24},{wch:16}];

  for(let i=0;i<filas.length;i++){
    const url = await enlaceFirmadoFoto(filas[i].key);
    const addr = XLSX.utils.encode_cell({r:filaEncabezado+1+i, c:3});
    ws[addr] = url
      ? {t:'s', v:'Abrir foto', l:{Target:url, Tooltip:`Abrir foto (enlace válido hasta el ${vencimientoTxt})`}}
      : {t:'s', v:'No disponible'};
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Fotos');
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

    await agregarHojaFotos(wb, r);

    XLSX.writeFile(wb, nombreInforme(r, 'xlsx'));
    toast('Excel generado ✓ revisa tus descargas');
  }catch(err){
    console.error(err);
    toast('No se pudo generar el Excel: '+(err&&err.message?err.message:'error'), 3600);
  }finally{
    btn.disabled = false; btn.innerHTML = original;
  }
}
