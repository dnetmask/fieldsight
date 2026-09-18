/* ---------------------------------------------------------
   ADMINISTRAR USUARIOS — solo visible/accesible para rol
   'administrador'. Cambiar el rol de otro usuario requiere la política
   "Administradores editan cualquier perfil" en supabase/schema.sql (la
   política normal de perfiles solo deja a cada quien editar el suyo).
--------------------------------------------------------- */
const ROLES_DISPONIBLES = ['tecnico', 'supervisor', 'administrador'];
const ROL_LABEL = { tecnico: 'Técnico', supervisor: 'Supervisor', administrador: 'Administrador' };

async function cargarUsuarios(){
  const listEl = document.getElementById('adminUsersList');
  listEl.innerHTML = '<div class="hint" style="text-align:center;padding:20px 0;">Cargando...</div>';
  try{
    const { data: perfiles, error } = await supabaseClient.from('profiles').select('*').order('nombre');
    if(error) throw new Error(error.message);
    if(!perfiles || !perfiles.length){
      listEl.innerHTML = '<div class="hint">No hay usuarios registrados todavía.</div>';
      return;
    }
    listEl.innerHTML = perfiles.map(p => `
      <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
        <div style="min-width:0;">
          <div style="font-weight:700;font-size:13.5px;">${escapeHtml(p.nombre)}${p.id===currentUser.id ? ' <span style="color:var(--ink-soft);font-weight:600;">(tú)</span>' : ''}</div>
          <div style="font-size:11.5px;color:var(--ink-soft);overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.email||'')}</div>
        </div>
        <select style="width:auto;margin-bottom:0;flex-shrink:0;" ${p.id===currentUser.id ? 'disabled title="No puedes cambiar tu propio rol aquí"' : ''} onchange="cambiarRolUsuario('${p.id}', this.value, this)">
          ${ROLES_DISPONIBLES.map(r => `<option value="${r}" ${p.rol===r?'selected':''}>${ROL_LABEL[r]}</option>`).join('')}
        </select>
      </div>
    `).join('');
  }catch(err){
    console.error(err);
    listEl.innerHTML = '<div class="hint">No se pudo cargar la lista de usuarios: '+escapeHtml(err.message||'')+'</div>';
  }
}

async function cambiarRolUsuario(id, nuevoRol, selectEl){
  selectEl.disabled = true;
  try{
    // RLS bloquea sin lanzar error explícito (0 filas afectadas) si quien
    // llama no tiene permiso -- el .select() deja verificar que sí hubo un
    // cambio real, no solo que la llamada no falló.
    const { data, error } = await supabaseClient.from('profiles').update({ rol: nuevoRol }).eq('id', id).select();
    if(error) throw new Error(error.message);
    if(!data || !data.length) throw new Error('No tienes permiso para cambiar este rol');
    toast('Rol actualizado ✓');
  }catch(err){
    console.error(err);
    toast('No se pudo actualizar el rol: ' + (err.message||''), 3600);
    await cargarUsuarios(); // revertir visualmente al valor real
    return;
  }
  selectEl.disabled = false;
}

/* ---------------------------------------------------------
   CATÁLOGOS COMPARTIDOS -- curaduría: ver qué tipos de activo y
   protocolos existen, cuántas visitas usan cada uno, y quitar los que
   no se usan (duplicados, errores de tipeo). Requiere las políticas
   "Administradores quitan ..." de supabase/schema.sql.
--------------------------------------------------------- */
let _catalogoAdminEntradas = [];

async function contarUsoEnVisitas(campo, valor){
  const filtro = {activos: [{}]};
  filtro.activos[0][campo] = valor;
  const { count, error } = await supabaseClient.from('visitas').select('id', {count:'exact', head:true}).contains('data', filtro);
  return error ? null : (count || 0);
}

async function cargarCatalogosAdmin(){
  const el = document.getElementById('adminCatalogos');
  if(!el) return;
  el.innerHTML = '<div class="hint" style="text-align:center;padding:12px 0;">Cargando catálogos...</div>';
  try{
    await Promise.all([cargarCatalogoTipos(), cargarCatalogoProtocolos()]);
    const tipos = CATALOGO_TIPOS.map(n => ({tabla:'catalogo_tipos_activo', campo:'tipo', nombre:n, extra:''}));
    const protocolos = CATALOGO_PROTOCOLOS.map(p => ({tabla:'catalogo_protocolos', campo:'protocolo', nombre:p.nombre, extra: p.ethernet ? 'Ethernet · IP/MAC' : 'Serial / fieldbus'}));
    _catalogoAdminEntradas = tipos.concat(protocolos);
    const usos = await mapConcurrente(_catalogoAdminEntradas, 5, e => contarUsoEnVisitas(e.campo, e.nombre));
    _catalogoAdminEntradas.forEach((e, i) => { e.uso = usos[i]; e.indice = i; });
    el.innerHTML = htmlBloqueCatalogo('Tipos de activo', tipos) + htmlBloqueCatalogo('Protocolos', protocolos);
  }catch(err){
    console.error(err);
    el.innerHTML = '<div class="hint">No se pudieron cargar los catálogos: '+escapeHtml(err.message||'')+'</div>';
  }
}

function htmlBloqueCatalogo(titulo, entradas){
  const filas = entradas.map(e => {
    const uso = e.uso == null ? 'uso desconocido' : e.uso === 0 ? 'sin uso' : `en ${e.uso} visita${e.uso === 1 ? '' : 's'}`;
    const puedeQuitar = e.uso === 0;
    return `
      <div class="cat-fila">
        <div class="cat-info">
          <div class="cat-nombre">${escapeHtml(e.nombre)}</div>
          <div class="cat-meta">${escapeHtml(e.extra ? e.extra + ' · ' + uso : uso)}</div>
        </div>
        <button type="button" class="btn btn-danger cat-quitar" ${puedeQuitar ? '' : 'disabled title="Está en uso en visitas guardadas"'} onclick="quitarEntradaCatalogo(${e.indice}, this)">Quitar</button>
      </div>`;
  }).join('');
  return `<div class="card"><div class="check-group-title">${escapeHtml(titulo)} <span class="cat-total">${entradas.length}</span></div>${filas || '<div class="hint">Vacío</div>'}</div>`;
}

async function quitarEntradaCatalogo(indice, btn){
  const e = _catalogoAdminEntradas[indice];
  if(!e) return;
  if(!(await confirmar(`Se quitará "${e.nombre}" de la lista compartida de todo el equipo.`, {titulo:'¿Quitar del catálogo?', aceptar:'Quitar', peligro:true}))) return;
  btn.disabled = true;
  try{
    // Igual que con los roles: si RLS lo bloquea no hay error, solo 0 filas.
    const { data, error } = await supabaseClient.from(e.tabla).delete().eq('nombre', e.nombre).select();
    if(error) throw new Error(error.message);
    if(!data || !data.length) throw new Error('No tienes permiso para quitar entradas del catálogo');
    toast('Quitado del catálogo ✓');
  }catch(err){
    toast('No se pudo quitar: ' + (err.message || ''), 3600);
  }
  await cargarCatalogosAdmin();
}
