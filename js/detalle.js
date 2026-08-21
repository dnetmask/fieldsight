function dataUrlToBlob(dataUrl){
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = /:(.*?);/.exec(header);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], {type:mime});
}
async function subirFotoBlob(path, dataUrl){
  const blob = dataUrlToBlob(dataUrl);
  const { error } = await supabaseClient.storage.from('fotos').upload(path, blob, {contentType: blob.type, upsert:true});
  if(error) throw new Error('No se pudo subir una foto: '+error.message);
  return path;
}
async function resolverFoto(key){
  if(!key) return null;
  try{
    const { data, error } = await supabaseClient.storage.from('fotos').createSignedUrl(key, 3600);
    if(error || !data) return null;
    const resp = await fetch(data.signedUrl);
    if(!resp.ok) return null;
    const blob = await resp.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }catch(e){ return null; }
}
async function resolverFotos(fotosArr){
  const out = [];
  for(const f of (fotosArr||[])){
    const dataUrl = await resolverFoto(f.key);
    out.push({cat:f.cat, dataUrl});
  }
  return out;
}

async function mostrarDetalle(id){
  currentDetailId = id;
  const wrap = document.getElementById('detailContent');
  wrap.innerHTML = '<div class="hint">Cargando...</div>';
  try{
    const { data: row, error } = await supabaseClient.from('visitas').select('*').eq('id', id).single();
    if(error || !row){ wrap.innerHTML = '<div class="hint">Visita no encontrada.</div>'; return; }
    const r = filaAVisita(row);

    let activosHtml = '';
    if(r.tipo === 'activos' && r.activos && r.activos.length){
      const bloques = [];
      for(let i=0;i<r.activos.length;i++){
        const a = r.activos[i];
        const fotosResueltas = await resolverFotos(a.fotos);
        let fotos = '';
        if(fotosResueltas.length){
          fotos = '<div class="print-photo-grid" style="margin-top:8px;">' + fotosResueltas.filter(f=>f.dataUrl).map(f=>`<div><img src="${f.dataUrl}"><div class="cap">${escapeHtml(f.cat)}</div></div>`).join('') + '</div>';
        }
        bloques.push(`<div class="detail-block">
          <b>${i+1}. ${escapeHtml(a.nombre||'Activo sin nombre')}</b> ${a.estado?('<span class="pill '+(a.estado==='Bueno'?'ok':(a.estado==='Malo'||a.estado==='Fuera de servicio'?'bad':'na'))+'">'+escapeHtml(a.estado)+'</span>'):''}
          <div class="kv-grid" style="margin-top:8px;">
            <div class="kv"><div class="k">Tipo</div><div class="v">${escapeHtml(a.tipo||'—')}</div></div>
            <div class="kv"><div class="k">Área / Proceso</div><div class="v">${escapeHtml(a.area||'—')} / ${escapeHtml(a.proceso||'—')}</div></div>
            <div class="kv"><div class="k">Máquina</div><div class="v">${escapeHtml(a.maquina||'—')}</div></div>
            <div class="kv"><div class="k">Marca / Modelo</div><div class="v">${escapeHtml(a.marca||'—')} / ${escapeHtml(a.modelo||'—')}</div></div>
            <div class="kv"><div class="k">Serial / Tag</div><div class="v">${escapeHtml(a.serial||'—')} / ${escapeHtml(a.tag||'—')}</div></div>
            <div class="kv"><div class="k">Tablero / rack</div><div class="v">${escapeHtml(a.tablero||'—')}</div></div>
            <div class="kv"><div class="k">Conectado a red OT</div><div class="v">${escapeHtml(a.otRed||'—')}</div></div>
            <div class="kv"><div class="k">Protocolo</div><div class="v">${escapeHtml(a.protocolo||'—')}</div></div>
            ${(a.ip || a.mac) ? `<div class="kv"><div class="k">IP / MAC</div><div class="v">${escapeHtml(a.ip||'—')} / ${escapeHtml(a.mac||'—')}</div></div>` : ''}
          </div>
          ${a.obs?('<div style="margin-top:6px;font-size:12.5px;color:var(--ink-soft);">'+escapeHtml(a.obs)+'</div>'):''}
          ${fotos}
        </div>`);
      }
      activosHtml = '<div class="section-label"><span class="num">A</span>Activos levantados</div><div class="card">' + bloques.join('') + '</div>';
    }

    let implHtml = '';
    if(r.tipo === 'implementacion' && r.implementaciones && r.implementaciones.length){
      const bloques = [];
      for(let i=0;i<r.implementaciones.length;i++){
        const it = r.implementaciones[i];
        const antesR = (await resolverFotos(it.fotosAntes)).filter(f=>f.dataUrl);
        const despuesR = (await resolverFotos(it.fotosDespues)).filter(f=>f.dataUrl);
        let fotos = '';
        if(antesR.length){
          fotos += '<div style="margin-top:10px;font-size:11px;font-weight:700;color:var(--ink-soft);letter-spacing:.5px;">ANTES</div><div class="print-photo-grid">' + antesR.map(f=>`<div><img src="${f.dataUrl}"><div class="cap">${escapeHtml(f.cat)}</div></div>`).join('') + '</div>';
        }
        if(despuesR.length){
          fotos += '<div style="margin-top:10px;font-size:11px;font-weight:700;color:var(--ink-soft);letter-spacing:.5px;">DESPUÉS</div><div class="print-photo-grid">' + despuesR.map(f=>`<div><img src="${f.dataUrl}"><div class="cap">${escapeHtml(f.cat)}</div></div>`).join('') + '</div>';
        }
        bloques.push(`<div class="detail-block">
          <b>${i+1}. ${escapeHtml(it.eqNombre||'Equipo sin nombre')}</b> ${it.conformidad?('<span class="pill '+(it.conformidad==='Conforme'?'ok':'bad')+'">'+escapeHtml(it.conformidad)+'</span>'):''}
          <div style="font-size:12.5px;color:var(--ink-soft);margin-top:4px;">${escapeHtml(it.tipo||'')}</div>
          <div class="kv-grid" style="margin-top:8px;">
            <div class="kv"><div class="k">Marca / Modelo</div><div class="v">${escapeHtml(it.eqMarca||'—')} / ${escapeHtml(it.eqModelo||'—')}</div></div>
            <div class="kv"><div class="k">Serial</div><div class="v">${escapeHtml(it.eqSerial||'—')}</div></div>
            <div class="kv"><div class="k">Rack / tablero</div><div class="v">${escapeHtml(it.eqTablero||'—')}</div></div>
            <div class="kv"><div class="k">Ubicación</div><div class="v">${escapeHtml(it.eqUbicacion||'—')}</div></div>
          </div>
          ${it.descripcion?('<div style="margin-top:6px;font-size:12.5px;"><b>Descripción:</b> '+escapeHtml(it.descripcion)+'</div>'):''}
          ${it.estadoInicial?('<div style="margin-top:4px;font-size:12.5px;"><b>Estado inicial:</b> '+escapeHtml(it.estadoInicial)+'</div>'):''}
          ${it.estadoFinal?('<div style="margin-top:4px;font-size:12.5px;"><b>Estado final:</b> '+escapeHtml(it.estadoFinal)+'</div>'):''}
          ${it.hallazgos?('<div style="margin-top:4px;font-size:12.5px;"><b>Hallazgos:</b> '+escapeHtml(it.hallazgos)+'</div>'):''}
          ${it.accion?('<div style="margin-top:4px;font-size:12.5px;"><b>Acción recomendada:</b> '+escapeHtml(it.accion)+'</div>'):''}
          ${fotos}
        </div>`);
      }
      implHtml = '<div class="section-label"><span class="num">B</span>Implementación antes / después</div><div class="card">' + bloques.join('') + '</div>';
    }

    let checklistHtml = '';
    if(r.tipo === 'inspeccion'){
      let rows = '';
      for(const grp of CHECKLIST_DEF){
        rows += `<div class="check-group-title" style="margin-top:10px;">${grp.grupo}</div>`;
        for(const itxt of grp.items){
          const key = grp.grupo+'|'+itxt;
          const st = (r.checklist && r.checklist[key]) || {estado:null};
          const pillClass = st.estado === 'ok' ? 'ok' : st.estado === 'bad' ? 'bad' : 'na';
          const pillText = st.estado === 'ok' ? 'Cumple' : st.estado === 'bad' ? (st.criticidad ? 'No cumple · '+st.criticidad : 'No cumple') : 'N/A';
          let fotoHtml = '';
          if(st.fotoKey){
            const dataUrl = await resolverFoto(st.fotoKey);
            if(dataUrl) fotoHtml = `<div style="margin-top:6px;"><img src="${dataUrl}" style="width:90px;border-radius:6px;border:1px solid var(--card-line);"></div>`;
          }
          rows += `<div class="check-result-row" style="display:block;">
            <div style="display:flex;justify-content:space-between;gap:10px;">
              <span>${itxt}${st.obs ? '<br><span style="color:var(--ink-soft);font-size:11.5px;">'+escapeHtml(st.obs)+'</span>' : ''}</span>
              <span class="pill ${pillClass}">${st.estado ? pillText : 'Sin marcar'}</span>
            </div>
            ${fotoHtml}
          </div>`;
        }
      }
      const tipoInspHtml = r.tipoInspeccion ? '<div style="margin-bottom:8px;"><b>Tipo de inspección:</b> '+escapeHtml(r.tipoInspeccion)+'</div>' : '';
      checklistHtml = '<div class="section-label"><span class="num">C</span>Checklist de inspección</div><div class="card">'+tipoInspHtml+rows+'</div>';
    }

    wrap.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <div style="width:26px;height:26px;border-radius:6px;background:var(--orange);color:#fff;display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-weight:700;font-size:12px;">N</div>
        <div style="font-family:var(--mono);font-size:11px;letter-spacing:1px;color:var(--navy);font-weight:700;">NETMASK S.A.S. · ENVIGADO, COLOMBIA</div>
      </div>
      <div class="rep-header">
        <div class="rid">VISITA · ${escapeHtml(r.codigo||r.id.toUpperCase())}</div>
        <h2>${escapeHtml(r.sede||'Sin sede')}</h2>
        <div class="sub">${escapeHtml(r.proyecto||'')} · ${r.fecha||''} · Técnico: ${escapeHtml(r.tecnico||'—')}</div>
      </div>

      <div class="kv-grid" style="margin-bottom:6px;">
        <div class="kv"><div class="k">Creado por</div><div class="v">${escapeHtml(r.creadoPor||'—')}${r.creadoEn ? ' · '+new Date(r.creadoEn).toLocaleString('es-CO') : ''}</div></div>
        <div class="kv"><div class="k">Última edición</div><div class="v">${r.actualizadoPor && r.actualizadoPor!==r.creadoPor ? escapeHtml(r.actualizadoPor)+(r.actualizadoEn?' · '+new Date(r.actualizadoEn).toLocaleString('es-CO'):'') : '—'}</div></div>
      </div>
      <div class="kv-grid" style="margin-bottom:6px;">
        <div class="kv"><div class="k">Cliente</div><div class="v">${escapeHtml(r.cliente||'—')}</div></div>
        <div class="kv"><div class="k">Tipo de actividad</div><div class="v">${TIPO_LABEL[r.tipo]||r.tipo||'—'}</div></div>
        <div class="kv" style="grid-column:1/-1;"><div class="k">Coordenadas GPS</div><div class="v">${r.gps ? r.gps.lat.toFixed(5)+', '+r.gps.lng.toFixed(5) : 'No capturado'}</div></div>
      </div>

      ${activosHtml}
      ${implHtml}
      ${checklistHtml}

      ${r.observaciones ? '<div class="section-label"><span class="num">D</span>Observaciones</div><div class="card">'+escapeHtml(r.observaciones)+'</div>' : ''}

      <div class="section-label"><span class="num">E</span>Firma</div>
      <div class="card">
        ${r.firma && r.firma.dataUrl ? '<img class="sig-img" src="'+r.firma.dataUrl+'">' : '<div class="hint">Sin firma registrada</div>'}
        <div style="margin-top:8px;font-size:13px;"><b>${escapeHtml((r.firma&&r.firma.nombre)||'—')}</b><br>${escapeHtml((r.firma&&r.firma.cargo)||'')}</div>
      </div>
    `;

    const esSupervisorOAdmin = currentProfile && (currentProfile.rol === 'supervisor' || currentProfile.rol === 'administrador');
    const esCreador = currentUser && r.createdBy === currentUser.id;
    document.getElementById('btnEditarVisita').classList.toggle('hidden', !(esCreador || esSupervisorOAdmin));
    document.getElementById('btnEliminarVisita').classList.toggle('hidden', !esSupervisorOAdmin);
  }catch(err){
    console.error(err);
    wrap.innerHTML = '<div class="hint">Error al cargar la visita.</div>';
  }
}

/* ---------------------------------------------------------
   EXPORTAR A EXCEL (.xlsx real, vía SheetJS cargado bajo demanda)
--------------------------------------------------------- */
