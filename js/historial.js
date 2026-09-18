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
let _histTotal = null;      // coincidencias totales en el servidor (count=exact)
let _histSolicitud = 0;     // para descartar respuestas de búsquedas ya superadas
let _histFiltroTimer = null;

/* ---------------------------------------------------------
   BÚSQUEDA Y FILTROS DEL HISTORIAL -- se aplican en el servidor
   (la lista está paginada), y también a las visitas pendientes
   de sincronizar que viven en este teléfono.
--------------------------------------------------------- */
function filtrosHistorial(){
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  return {
    // Se quitan los caracteres que PostgREST usa para separar filtros en or=(...)
    texto: val('histBuscar').replace(/[,()"\\%]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80),
    desde: val('histDesde'),
    hasta: val('histHasta')
  };
}
function hayFiltrosHistorial(f){ return !!(f.texto || f.desde || f.hasta); }
function aplicarFiltrosHistorial(query, f){
  if(f.texto){
    const patron = '%' + f.texto + '%';
    query = query.or(['proyecto','cliente','sede','tecnico'].map(c => c + '.ilike.' + patron).join(','));
  }
  if(f.desde) query = query.gte('fecha', f.desde);
  if(f.hasta) query = query.lte('fecha', f.hasta);
  return query;
}
function pendienteCoincide(p, f){
  if(f.texto){
    const t = f.texto.toLowerCase();
    if(![p.proyecto, p.cliente, p.sede, p.tecnico].some(v => (v||'').toLowerCase().includes(t))) return false;
  }
  if(f.desde && (p.fecha||'') < f.desde) return false;
  if(f.hasta && (p.fecha||'') > f.hasta) return false;
  return true;
}
function onFiltroHistorialCambio(){
  clearTimeout(_histFiltroTimer);
  _histFiltroTimer = setTimeout(cargarHistorial, 300);
}
function toggleFiltroFechas(){
  const row = document.getElementById('histFechas');
  row.classList.toggle('hidden');
  if(row.classList.contains('hidden')){
    const d = document.getElementById('histDesde'), h = document.getElementById('histHasta');
    if(d.value || h.value){ d.value = ''; h.value = ''; cargarHistorial(); }
  }
}
function limpiarFiltrosHistorial(){
  document.getElementById('histBuscar').value = '';
  document.getElementById('histDesde').value = '';
  document.getElementById('histHasta').value = '';
  cargarHistorial();
}

async function consultarPaginaHistorial(desde, f){
  let query = supabaseClient.from('visitas').select(HISTORIAL_COLUMNAS, {count: 'exact'});
  query = aplicarFiltrosHistorial(query, f);
  const { data: rows, error, count } = await query
    .order('created_at', {ascending:false})
    .order('id', {ascending:false})
    .range(desde, desde + HISTORIAL_PAGINA - 1);
  if(error) throw new Error(error.message);
  return { filas: (rows||[]).map(filaAVisita), total: typeof count === 'number' ? count : null };
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

function textoBotonCargarMas(){
  return _histTotal != null ? `Cargar más visitas (${_histCargadas} de ${_histTotal})` : 'Cargar más visitas';
}
function hayMasHistorial(ultimaPagina){
  return _histTotal != null ? _histCargadas < _histTotal : ultimaPagina.length === HISTORIAL_PAGINA;
}
function htmlBotonCargarMas(hayMas){
  if(!hayMas) return '';
  return `<div id="histMasWrap" style="margin:6px 0 20px;"><button class="btn btn-outline" onclick="cargarMasHistorial(this)">${textoBotonCargarMas()}</button></div>`;
}

async function cargarMasHistorial(btn){
  btn.disabled = true;
  btn.textContent = 'Cargando...';
  const solicitud = _histSolicitud;
  try{
    const { filas, total } = await consultarPaginaHistorial(_histCargadas, filtrosHistorial());
    if(solicitud !== _histSolicitud) return; // la búsqueda cambió mientras cargaba: ya se repintó todo
    if(total != null) _histTotal = total;
    _histCargadas += filas.length;
    document.getElementById('histItems').insertAdjacentHTML('beforeend', filas.map(htmlItemHistorial).join(''));
    if(!hayMasHistorial(filas)){
      const wrap = document.getElementById('histMasWrap');
      if(wrap) wrap.remove();
      return;
    }
  }catch(err){
    toast('No se pudieron cargar más visitas: ' + (err && err.message ? err.message : ''), 3600);
  }
  btn.disabled = false;
  btn.textContent = textoBotonCargarMas();
}

async function cargarHistorial(){
  const listEl = document.getElementById('histList');
  const f = filtrosHistorial();
  const solicitud = ++_histSolicitud;
  listEl.innerHTML = '<div class="hint" style="text-align:center;padding:20px 0;">Cargando...</div>';
  _histCargadas = 0;
  _histTotal = null;

  const pendientes = (await listarPendientesLocal()).filter(p => pendienteCoincide(p, f));
  let reports = [];
  let errorCarga = null;
  try{
    const { filas, total } = await consultarPaginaHistorial(0, f);
    reports = filas;
    _histTotal = total;
    _histCargadas = filas.length;
  }catch(err){
    errorCarga = err;
  }
  if(solicitud !== _histSolicitud) return; // ya hay una búsqueda más nueva en curso

  if(!reports.length && !pendientes.length){
    if(errorCarga){
      listEl.innerHTML = '<div class="hint">No se pudo cargar el historial: '+escapeHtml(errorCarga.message||'')+'</div>';
    } else if(hayFiltrosHistorial(f)){
      listEl.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          <p>Ninguna visita coincide con la búsqueda.</p>
          <button type="button" class="btn btn-ghost" onclick="limpiarFiltrosHistorial()" style="margin-top:10px;">Quitar filtros</button>
        </div>`;
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

  const resumen = (hayFiltrosHistorial(f) && _histTotal != null)
    ? `<div class="hint" style="padding:6px 0 10px;">${_histTotal} visita${_histTotal===1?'':'s'} coincide${_histTotal===1?'':'n'} con la búsqueda</div>`
    : '';

  listEl.innerHTML = avisoError + resumen + pendientesHtml
    + '<div id="histItems">' + reports.map(htmlItemHistorial).join('') + '</div>'
    + htmlBotonCargarMas(hayMasHistorial(reports));
}

/* ---------------------------------------------------------
   DETALLE / IMPRESIÓN — las fotos se recuperan bajo demanda
--------------------------------------------------------- */
