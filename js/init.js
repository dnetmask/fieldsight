/* ---------------------------------------------------------
   INIT
--------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('fFecha').valueAsDate = new Date();
  BTN_GUARDAR_DEFAULT = document.getElementById('btnGuardar').innerHTML;
  initSignaturePad();

  if(!supabaseClient){
    document.getElementById('authError').textContent = 'Falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en el código de la app.';
    document.getElementById('authError').style.display = 'block';
    document.getElementById('btnAuthSubmit').disabled = true;
    document.querySelector('.topbar').classList.add('hidden');
    return;
  }

  // El enlace de "recuperar contraseña" del correo trae el token en la URL:
  // supabase-js lo detecta al cargar y dispara PASSWORD_RECOVERY -- pero
  // ese enlace también deja una sesión válida, así que si no se avisa esto
  // aparte, el getSession() de abajo la toma como un login normal y manda
  // derecho al formulario, pisando la pantalla de "nueva contraseña".
  // PASSWORD_RECOVERY llega unos milisegundos DESPUÉS de que getSession()
  // ya resolvió (parece ser parte del mismo procesamiento interno del
  // cliente, pero no está listo todavía en el momento exacto en que
  // getSession() devuelve el control) -- por eso no basta revisar la
  // bandera aquí mismo; cargarSesion() la vuelve a revisar más tarde,
  // después de sus propias llamadas de red, que le dan tiempo de sobra
  // a este evento para llegar antes de decidir si mostrar el formulario.
  window.__modoRecuperacionActivo = false;
  supabaseClient.auth.onAuthStateChange((event) => {
    if(event === 'PASSWORD_RECOVERY'){
      window.__modoRecuperacionActivo = true;
      mostrarPantallaNuevaPassword();
    }
  });

  const { data:{ session } } = await supabaseClient.auth.getSession();
  if(session){
    await cargarSesion(session);
  } else if(!window.__modoRecuperacionActivo){
    mostrarAuth();
  }
});

/* ---------------------------------------------------------
   BORRADOR AUTOMÁTICO — cada 30s, solo si hay algo que valga la
   pena guardar y el formulario está a la vista (no en Historial).
--------------------------------------------------------- */
setInterval(() => {
  const formView = document.getElementById('formView');
  if(!formView || formView.classList.contains('hidden')) return;
  const hayContenido = tipoSel || document.getElementById('fProyecto').value.trim() || document.getElementById('fSede').value.trim();
  if(hayContenido) guardarBorradorActual();
}, 30 * 1000);

/* ---------------------------------------------------------
   SINCRONIZACIÓN EN SEGUNDO PLANO — se dispara cuando vuelve la
   conexión o cambia de red. navigator.connection.addEventListener
   solo existe en Android/Chrome; el intervalo es el respaldo para
   iOS/Safari (que no avisa cambios de red).
--------------------------------------------------------- */
window.addEventListener('online', () => intentarSincronizarPendientes(false));
if(navigator.connection){
  navigator.connection.addEventListener('change', () => intentarSincronizarPendientes(false));
}
setInterval(() => intentarSincronizarPendientes(false), 2 * 60 * 1000);

