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
}
function toggleAuthMode(){
  authModoRegistro = !authModoRegistro;
  document.getElementById('authNombreWrap').classList.toggle('hidden', !authModoRegistro);
  document.getElementById('btnAuthSubmit').textContent = authModoRegistro ? 'Crear cuenta' : 'Iniciar sesión';
  document.getElementById('btnAuthToggle').textContent = authModoRegistro ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate';
  document.getElementById('authError').style.display = 'none';
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

  await cargarCatalogoTipos();
  await cargarCatalogoProtocolos();
  renderChecklist();
  goForm();
  await restaurarBorradorSiExiste();
}
async function cerrarSesion(){
  if(!confirm('¿Cerrar sesión?')) return;
  try{ await supabaseClient.auth.signOut(); }catch(e){}
  currentUser = null; currentProfile = null;
  location.reload();
}

