/* ---------------------------------------------------------
   PWA — registro del service worker (offline) e instalación
--------------------------------------------------------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.log('No se pudo registrar el service worker:', err);
    });
  });
}

let deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('btnInstall');
  if(btn) btn.classList.remove('hidden');
});
async function instalarApp(){
  const btn = document.getElementById('btnInstall');
  if(!deferredInstallPrompt){
    toast('Usa el menú del navegador → "Agregar a pantalla de inicio"');
    return;
  }
  deferredInstallPrompt.prompt();
  const choice = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if(btn) btn.classList.add('hidden');
  if(choice && choice.outcome === 'accepted') toast('¡Instalada! Búscala en tu pantalla de inicio');
}
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('btnInstall');
  if(btn) btn.classList.add('hidden');
  toast('FieldSight instalada correctamente ✓');
});
