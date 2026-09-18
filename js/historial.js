function filaAVisita(row){
  const d = row.data || {};
  return {
    id: row.id, codigo: row.codigo,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    proyecto: row.proyecto, cliente: row.cliente, sede: row.sede, tecnico: row.tecnico, fecha: row.fecha,
    tipo: row.tipo,
    gps: d.gps, activos: d.activos||[], implementaciones: d.implementaciones||[], checklist: d.checklist||{},
    tipoInspeccion: d.tipoInspeccion || null,
    observaciones: d.observaciones, firma: d.firma,
    creadoPor: row.creado_por_nombre, actualizadoPor: row.actualizado_por_nombre,
    creadoEn: row.created_at, actualizadoEn: row.updated_at,
    createdBy: row.created_by
  };
}

const HISTORIAL_PAGINA = 30;
// Solo las columnas que muestra la lista -- la columna `data` (fotos,
// checklist, el reporte completo) se trae únicamente al abrir una visita.
const HISTORIAL_COLUMNAS = 'id,codigo,proyecto,cliente,sede,tecnico,fecha,tipo,creado_por_nombre,created_at';
let _histCargadas = 0;

async function consultarPaginaHistorial(desde){
  const { data: rows, error } = await supabaseClient.from('visitas')
    .select(HISTORIAL_COLUMNAS)
    .order('created_at', {ascending:false})
    .order('id', {ascending:false})
    .range(desde, desde + HISTORIAL_PAGINA - 1);
  if(error) throw new Error(error.message);
  return (rows||[]).map(filaAVisita);
}

function htmlItemHistorial(r){
  return `
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
  `;
}

function htmlBotonCargarMas(hayMas){
  if(!hayMas) return '';
  return `<div id="histMasWrap" style="margin:6px 0 20px;"><button class="btn btn-outline" onclick="cargarMasHistorial(this)">Cargar más visitas</button></div>`;
}

async function cargarMasHistorial(btn){
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Cargando...';
  try{
    const mas = await consultarPaginaHistorial(_histCargadas);
    _histCargadas += mas.length;
    document.getElementById('histItems').insertAdjacentHTML('beforeend', mas.map(htmlItemHistorial).join(''));
    if(mas.length < HISTORIAL_PAGINA){
      const wrap = document.getElementById('histMasWrap');
      if(wrap) wrap.remove();
      return;
    }
  }catch(err){
    toast('No se pudieron cargar más visitas: ' + (err && err.message ? err.message : ''), 3600);
  }
  btn.disabled = false;
  btn.textContent = original;
}

async function cargarHistorial(){
  const listEl = document.getElementById('histList');
  listEl.innerHTML = '<div class="hint" style="text-align:center;padding:20px 0;">Cargando...</div>';
  _histCargadas = 0;

  const pendientes = await listarPendientesLocal();
  let reports = [];
  let errorCarga = null;
  try{
    reports = await consultarPaginaHistorial(0);
    _histCargadas = reports.length;
  }catch(err){
    errorCarga = err;
  }

  if(!reports.length && !pendientes.length){
    if(errorCarga){
      listEl.innerHTML = '<div class="hint">No se pudo cargar el historial: '+escapeHtml(errorCarga.message||'')+'</div>';
    } else {
      listEl.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/><path d="M9 13h6M9 17h6"/></svg>
          <p>Todavía no se ha guardado ninguna visita.<br>Toca "Nueva visita" para empezar.</p>
        </div>`;
    }
    return;
  }

  const avisoError = errorCarga
    ? '<div class="hint" style="padding:8px 0;">No se pudo actualizar el historial en línea (sin conexión) — mostrando lo disponible en este teléfono.</div>'
    : '';

  const pendientesHtml = pendientes.map(p => `
    <div class="hist-item" onclick="reabrirVisitaLocal('${p.id}')">
      <div class="hist-tag" style="background:var(--orange);color:#fff;">⏳</div>
      <div class="hist-info">
        <div class="n1">${escapeHtml(p.sede||'Sin sede')}</div>
        <div class="n2">${escapeHtml(p.proyecto||'')} · ${p.fecha||''}</div>
        <div class="hist-badges">
          <span class="badge" style="background:var(--orange);color:#fff;">Pendiente de sincronizar</span>
          ${p.tipo ? '<span class="badge">'+(TIPO_BADGE[p.tipo]||p.tipo)+'</span>' : ''}
        </div>
      </div>
      <div class="hist-chevron">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </div>
  `).join('');

  listEl.innerHTML = avisoError + pendientesHtml
    + '<div id="histItems">' + reports.map(htmlItemHistorial).join('') + '</div>'
    + htmlBotonCargarMas(reports.length === HISTORIAL_PAGINA);
}

/* ---------------------------------------------------------
   DETALLE / IMPRESIÓN — las fotos se recuperan bajo demanda
--------------------------------------------------------- */
