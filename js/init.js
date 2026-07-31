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

