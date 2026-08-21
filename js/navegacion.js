function setTabs(active){
  document.getElementById('tabNew').classList.toggle('active', active==='new');
  document.getElementById('tabHist').classList.toggle('active', active==='hist');
}
function goForm(){
  document.getElementById('formView').classList.remove('hidden');
  document.getElementById('historyView').classList.add('hidden');
  document.getElementById('detailView').classList.add('hidden');
  document.getElementById('adminView').classList.add('hidden');
  setTabs('new');
}
function goHistory(){
  document.getElementById('formView').classList.add('hidden');
  document.getElementById('historyView').classList.remove('hidden');
  document.getElementById('detailView').classList.add('hidden');
  document.getElementById('adminView').classList.add('hidden');
  setTabs('hist');
  cargarHistorial();
}
function goDetail(id){
  document.getElementById('formView').classList.add('hidden');
  document.getElementById('historyView').classList.add('hidden');
  document.getElementById('detailView').classList.remove('hidden');
  document.getElementById('adminView').classList.add('hidden');
  mostrarDetalle(id);
}
function goAdmin(){
  document.getElementById('formView').classList.add('hidden');
  document.getElementById('historyView').classList.add('hidden');
  document.getElementById('detailView').classList.add('hidden');
  document.getElementById('adminView').classList.remove('hidden');
  setTabs('');
  cargarUsuarios();
}

/* ---------------------------------------------------------
   TIPO DE ACTIVIDAD (selección única)
--------------------------------------------------------- */
function actualizarVisibilidadTipo(key){
  tipoSel = key;
  ['activos','implementacion','inspeccion'].forEach(k => {
    document.getElementById('topt-'+k).classList.toggle('on', k===key);
  });
  document.getElementById('blockActivos').classList.toggle('hidden', key!=='activos');
  document.getElementById('blockImplementacion').classList.toggle('hidden', key!=='implementacion');
  document.getElementById('blockChecklist').classList.toggle('hidden', key!=='inspeccion');
}
function selectTipo(key){
  actualizarVisibilidadTipo(key);
  if(key==='activos' && activos.length===0) addActivo();
  if(key==='implementacion' && implementaciones.length===0) addImpl();
}

/* ---------------------------------------------------------
   GPS
--------------------------------------------------------- */
