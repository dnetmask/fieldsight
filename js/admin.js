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
