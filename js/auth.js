/* ---------------------------------------------------------
   AUTENTICACIÓN
--------------------------------------------------------- */
let authModoRegistro = false;

function mostrarAuth(){
  document.querySelector('.topbar').classList.add('hidden');
  document.getElementById('authView').classList.remove('hidden');
  document.getElementById('formView').classList.add('hidden');
  document.getElementById('historyView').classList.add('hidden');
  document.getElementById('detailView').classList.add('hidden');
  document.getElementById('adminView').classList.add('hidden');
}
function toggleAuthMode(){
  authModoRegistro = !authModoRegistro;
  document.getElementById('authNombreWrap').classList.toggle('hidden', !authModoRegistro);
  document.getElementById('btnAuthSubmit').textContent = authModoRegistro ? 'Crear cuenta' : 'Iniciar sesión';
  document.getElementById('btnAuthToggle').textContent = authModoRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate';
  document.getElementById('linkOlvidePassword').classList.toggle('hidden', authModoRegistro);
  document.getElementById('authError').style.display = 'none';
}

/* ---------------------------------------------------------
   RECUPERAR CONTRASEÑA
--------------------------------------------------------- */
// La usan tanto el evento PASSWORD_RECOVERY (init.js) como cargarSesion()
// -- este último la vuelve a forzar al final por si el evento llegó
// mientras cargarSesion ya estaba a mitad de camino (ver nota en init.js).
function mostrarPantallaNuevaPassword(){
  mostrarAuth();
  document.getElementById('authTitleLogin').classList.add('hidden');
  document.getElementById('authRecoveryWrap').classList.add('hidden');
  document.getElementById('authNewPasswordWrap').classList.remove('hidden');
}
function mostrarRecuperarPassword(){
  document.getElementById('authTitleLogin').classList.add('hidden');
  document.getElementById('authRecoveryWrap').classList.remove('hidden');
  document.getElementById('recoveryMsg').style.display = 'none';
  document.getElementById('recoveryEmail').value = document.getElementById('authEmail').value;
}
function ocultarRecuperarPassword(){
  document.getElementById('authRecoveryWrap').classList.add('hidden');
  document.getElementById('authTitleLogin').classList.remove('hidden');
}
async function enviarRecuperacion(){
  const email = document.getElementById('recoveryEmail').value.trim();
  const msgEl = document.getElementById('recoveryMsg');
  msgEl.style.display = 'none';
  if(!email){
    msgEl.style.color = 'var(--red)';
    msgEl.textContent = 'Escribe tu correo';
    msgEl.style.display = 'block';
    return;
  }
  const btn = document.getElementById('btnRecoverySubmit');
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = 'Enviando...';
  try{
    await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
  }catch(e){}
  // El mismo mensaje exista o no la cuenta -- así este formulario no sirve
  // para averiguar qué correos están registrados.
  msgEl.style.color = 'var(--green)';
  msgEl.textContent = 'Si ese correo tiene una cuenta, te llegará un enlace para restablecer la contraseña.';
  msgEl.style.display = 'block';
  btn.disabled = false;
  btn.textContent = original;
}
async function guardarNuevaPassword(){
  const p1 = document.getElementById('newPassword1').value;
  const p2 = document.getElementById('newPassword2').value;
  const errEl = document.getElementById('newPasswordError');
  errEl.style.display = 'none';
  if(!p1 || p1.length < 6){
    errEl.textContent = 'La contraseña debe tener al menos 6 caracteres';
    errEl.style.display = 'block';
    return;
  }
  if(p1 !== p2){
    errEl.textContent = 'Las contraseñas no coinciden';
    errEl.style.display = 'block';
    return;
  }
  const btn = document.getElementById('btnNewPasswordSubmit');
  btn.disabled = true;
  try{
    const { error } = await supabaseClient.auth.updateUser({ password: p1 });
    if(error) throw error;
    window.__modoRecuperacionActivo = false; // ya se completó -- que cargarSesion() siga su curso normal
    document.getElementById('authNewPasswordWrap').classList.add('hidden');
    document.getElementById('newPassword1').value = '';
    document.getElementById('newPassword2').value = '';
    toast('Contraseña actualizada ✓');
    const { data:{ session } } = await supabaseClient.auth.getSession();
    if(session) await cargarSesion(session);
    else mostrarAuth();
  }catch(e){
    errEl.textContent = e.message || 'No se pudo actualizar la contraseña';
    errEl.style.display = 'block';
  }finally{
    btn.disabled = false;
  }
}
async function submitAuth(){
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const nombre = document.getElementById('authNombre').value.trim();
  const errEl = document.getElementById('authError');
  errEl.style.display = 'none';

  if(!email || !password){ errEl.textContent = 'Completa correo y contraseña'; errEl.style.display='block'; return; }
  if(authModoRegistro && !nombre){ errEl.textContent = 'Escribe tu nombre completo'; errEl.style.display='block'; return; }

  const btn = document.getElementById('btnAuthSubmit');
  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = authModoRegistro ? 'Creando cuenta...' : 'Ingresando...';

  try{
    if(authModoRegistro){
      const { data, error } = await supabaseClient.auth.signUp({ email, password, options:{ data:{ nombre } } });
      if(error) throw error;
      if(data.session){
        await cargarSesion(data.session);
      } else {
        errEl.style.display='block';
        errEl.style.color = 'var(--green)';
        errEl.textContent = 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.';
        toggleAuthMode();
      }
    } else {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if(error) throw error;
      await cargarSesion(data.session);
    }
  }catch(err){
    errEl.style.color = 'var(--red)';
    errEl.textContent = err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : err.message;
    errEl.style.display = 'block';
  }finally{
    btn.disabled = false;
    btn.textContent = original;
  }
}
async function cargarSesion(session){
  currentUser = session.user;
  const { data: profile, error } = await supabaseClient.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = profile || { nombre: currentUser.email, rol:'tecnico' };

  document.getElementById('brandUserLabel').textContent = currentProfile.nombre + ' · ' + currentProfile.rol;
  document.querySelector('.topbar').classList.remove('hidden');
  document.getElementById('authView').classList.add('hidden');
  document.getElementById('btnAdmin').classList.toggle('hidden', currentProfile.rol !== 'administrador');

  await cargarCatalogoTipos();
  await cargarCatalogoProtocolos();
  renderChecklist();

  if(window.__modoRecuperacionActivo){
    mostrarPantallaNuevaPassword();
    return;
  }

  goForm();
  await restaurarBorradorSiExiste();
  await actualizarBarraSync();
  intentarSincronizarPendientes(false);
}
async function cerrarSesion(){
  if(!confirm('¿Cerrar sesión?')) return;
  try{ await supabaseClient.auth.signOut(); }catch(e){}
  currentUser = null; currentProfile = null;
  location.reload();
}

