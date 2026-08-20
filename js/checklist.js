function renderChecklist(){
  const wrap = document.getElementById('checklistWrap');
  wrap.innerHTML = CHECKLIST_DEF.map(grp => `
    <div class="check-group">
      <div class="check-group-title">${grp.grupo}</div>
      ${grp.items.map(item => {
        const key = grp.grupo+'|'+item;
        checklistState[key] = checklistState[key] || {estado:null, criticidad:null, obs:'', foto:null, fotoKey:null};
        const id = cssId(key);
        return `
        <div class="check-item">
          <div class="qtext">${item}</div>
          <div class="seg">
            <button type="button" onclick="setEstado('${key.replace(/'/g,"\\'")}','ok')" id="btn-ok-${id}">Cumple</button>
            <button type="button" onclick="setEstado('${key.replace(/'/g,"\\'")}','bad')" id="btn-bad-${id}">No cumple</button>
            <button type="button" onclick="setEstado('${key.replace(/'/g,"\\'")}','na')" id="btn-na-${id}">N/A</button>
          </div>
          <div class="crit-row hidden" id="crit-${id}">
            ${CRITICIDADES.map(c => `<button type="button" onclick="setCriticidad('${key.replace(/'/g,"\\'")}','${c}')" id="crit-${c}-${id}">${c}</button>`).join('')}
          </div>
          <textarea placeholder="Observación (opcional)" oninput="checklistState['${key.replace(/'/g,"\\'")}'].obs=this.value">${escapeHtml(checklistState[key].obs)}</textarea>
          <div class="photo-grid" id="grid-chk-${id}"></div>
        </div>`;
      }).join('')}
    </div>
  `).join('');
  CHECKLIST_DEF.forEach(grp => grp.items.forEach(item => {
    const key = grp.grupo+'|'+item;
    renderChecklistPhoto(key);
    const st = checklistState[key];
    if(st.estado) setEstado(key, st.estado);
    if(st.criticidad) setCriticidad(key, st.criticidad);
  }));
}
function setEstado(key, estado){
  checklistState[key].estado = estado;
  const id = cssId(key);
  ['ok','bad','na'].forEach(e => document.getElementById('btn-'+e+'-'+id).classList.remove('on-ok','on-bad','on-na'));
  document.getElementById('btn-'+estado+'-'+id).classList.add('on-'+estado);
  document.getElementById('crit-'+id).classList.toggle('hidden', estado!=='bad');
}
function setCriticidad(key, crit){
  checklistState[key].criticidad = crit;
  const id = cssId(key);
  CRITICIDADES.forEach(c => document.getElementById('crit-'+c+'-'+id).classList.remove('on'));
  document.getElementById('crit-'+crit+'-'+id).classList.add('on');
}
function renderChecklistPhoto(key){
  const id = cssId(key);
  const grid = document.getElementById('grid-chk-'+id);
  if(!grid) return;
  const st = checklistState[key];
  let html = '';
  if(st.foto){
    html += `<div class="photo-thumb"><img src="${st.foto}"><div class="del" onclick="delChecklistFoto('${key.replace(/'/g,"\\'")}')">×</div></div>`;
  } else {
    html += `<label class="photo-add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>Foto</span><input type="file" accept="image/*" capture="environment" onchange="addChecklistFoto('${key.replace(/'/g,"\\'")}', this)"></label>`;
  }
  grid.innerHTML = html;
}
function addChecklistFoto(key, input){
  const file = input.files[0];
  if(!file) return;
  const [grupo, item] = key.split('|');
  const lineas = [
    tipoInspeccion && ('Inspección: ' + tipoInspeccion),
    'Tipo: ' + grupo,
    'Detalle: ' + item,
  ].filter(Boolean);
  comprimirFoto(file, (dataUrl) => {
    checklistState[key].foto = dataUrl;
    checklistState[key].fotoKey = null; // es una foto nueva, aún no tiene clave subida
    renderChecklistPhoto(key);
  }, lineas);
  input.value = '';
}
function delChecklistFoto(key){
  checklistState[key].foto = null;
  checklistState[key].fotoKey = null;
  renderChecklistPhoto(key);
}

/* ---------------------------------------------------------
   FIRMA
--------------------------------------------------------- */
let sigCtx, sigLastX, sigLastY;
