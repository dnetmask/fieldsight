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

  const { data:{ session } } = await supabaseClient.auth.getSession();
  if(session){
    await cargarSesion(session);
  } else {
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

