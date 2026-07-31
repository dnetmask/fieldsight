function filaAVisita(row){
  const d = row.data || {};
  return {
    id: row.id, codigo: row.codigo,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    proyecto: row.proyecto, cliente: row.cliente, sede: row.sede, tecnico: row.tecnico, fecha: row.fecha,
    tipo: row.tipo,
    gps: d.gps, activos: d.activos||[], implementaciones: d.implementaciones||[], checklist: d.checklist||{},
    observaciones: d.observaciones, firma: d.firma,
    creadoPor: row.creado_por_nombre, actualizadoPor: row.actualizado_por_nombre,
    creadoEn: row.created_at, actualizadoEn: row.updated_at,
    createdBy: row.created_by
  };
}

async function cargarHistorial(){
  const listEl = document.getElementById('histList');
  listEl.innerHTML = '<div class="hint" style="text-align:center;padding:20px 0;">Cargando...</div>';
  try{
    const { data: rows, error } = await supabaseClient.from('visitas').select('*').order('created_at', {ascending:false});
    if(error) throw new Error(error.message);
    if(!rows || rows.length === 0){
      listEl.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 17h6"/></svg>
          <p>Todavía no se ha guardado ninguna visita.<br>Toca "Nueva visita" para empezar.</p>
        </div>`;
      return;
    }
    const reports = rows.map(filaAVisita);
    listEl.innerHTML = reports.map(r => `
      <div class="hist-item" onclick="goDetail('${r.id}')">
        <div class="hist-tag">${(r.codigo||'FS').replace('FS-','')}</div>
        <div class="hist-info">
          <div class="n1">${escapeHtml(r.sede||'Sin sede')}</div>
          <div class="n2">${escapeHtml(r.proyecto||'')} · ${r.fecha||''}</div>
          <div class="n2" style="opacity:.8;">${escapeHtml(r.creadoPor||'—')}</div>
          <div class="hist-badges">${r.tipo ? '<span class="badge">'+(TIPO_BADGE[r.tipo]||r.tipo)+'</span>' : ''}</div>
        </div>
        <div class="hist-chevron">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </div>
      </div>
    `).join('');
  }catch(err){
    console.error(err);
    listEl.innerHTML = '<div class="hint">No se pudo cargar el historial: '+escapeHtml(err.message||'')+'</div>';
  }
}

/* ---------------------------------------------------------
   DETALLE / IMPRESIÓN — las fotos se recuperan bajo demanda
--------------------------------------------------------- */
