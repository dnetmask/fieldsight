// Dibuja una franja semitransparente con texto en la parte inferior de la
// foto (marca de agua) — así cada foto queda identificada aunque se vea
// aislada del resto del reporte (por ejemplo, exportada a un ZIP).
function dibujarMarcaAgua(ctx, canvas, lineas){
  const validas = (lineas || []).filter(Boolean);
  if(!validas.length) return;
  const fontSize = Math.max(13, Math.round(canvas.width * 0.032));
  const lineHeight = Math.round(fontSize * 1.35);
  const padding = Math.round(fontSize * 0.6);
  const boxHeight = lineHeight * validas.length + padding * 2;
  ctx.fillStyle = 'rgba(10, 37, 64, 0.72)'; // navy Netmask translúcido
  ctx.fillRect(0, canvas.height - boxHeight, canvas.width, boxHeight);
  ctx.fillStyle = '#ffffff';
  ctx.font = fontSize + 'px sans-serif';
  ctx.textBaseline = 'top';
  validas.forEach((linea, i) => {
    ctx.fillText(linea, padding, canvas.height - boxHeight + padding + i * lineHeight);
  });
}

function comprimirFoto(file, cb, lineasMarca){
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const maxW = 1000;
      const scale = Math.min(1, maxW / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      dibujarMarcaAgua(ctx, canvas, lineasMarca);

      let quality = 0.55;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      const targetChars = 700 * 1024 * 1.37; // ~700KB de imagen en base64
      let tries = 0;
      while(dataUrl.length > targetChars && quality > 0.25 && tries < 5){
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
        tries++;
      }
      cb(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ---------------------------------------------------------
   ACTIVOS
--------------------------------------------------------- */

function renderPhotoGrid(gridId, owner, field){
  const grid = document.getElementById(gridId);
  if(!grid) return;
  const arr = owner[field] || [];
  let html = arr.map((f, idx) => `
    <div class="photo-thumb">
      <img src="${f.dataUrl}">
      <div class="tag">${escapeHtml(f.cat)}</div>
      <div class="del" onclick="delFotoGenerico('${gridId}','${owner.uid}','${field}',${idx})">×</div>
    </div>
  `).join('');
  html += `
    <label class="photo-add">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      <span>Foto</span>
      <input type="file" accept="image/*" capture="environment" onchange="addFotoGenerico('${gridId}','${owner.uid}','${field}', this)">
    </label>
  `;
  grid.innerHTML = html;
}
function findOwner(uid){
  return activos.find(a=>a.uid===uid) || implementaciones.find(i=>i.uid===uid);
}
function catFieldFor(field){
  if(field==='fotos') return 'catSel';
  if(field==='fotosAntes') return 'catSelAntes';
  if(field==='fotosDespues') return 'catSelDespues';
  return 'catSel';
}
function updatePhotoCount(gridId, n){
  const gridEl = document.getElementById(gridId);
  if(!gridEl) return;
  const countEl = gridEl.parentElement.querySelector('.photo-count');
  if(countEl) countEl.textContent = n + ' foto(s) agregada(s)';
}
// Calcula las líneas de la marca de agua según el tipo de actividad y el
// campo de la foto (activo, o antes/después de una implementación).
function lineasMarcaFoto(owner, field){
  if(field === 'fotos'){ // Levantamiento de activos
    return [
      owner.area && ('Área: ' + owner.area),
      owner.proceso && ('Proceso: ' + owner.proceso),
      owner.maquina && ('Máquina: ' + owner.maquina),
      owner.ubicacion && ('Ubicación: ' + owner.ubicacion),
      owner.nombre && ('Activo: ' + owner.nombre),
    ].filter(Boolean);
  }
  if(field === 'fotosAntes' || field === 'fotosDespues'){ // Implementación
    const catField = catFieldFor(field);
    return [
      owner.eqNombre && ('Equipo: ' + owner.eqNombre),
      owner.eqTipo && ('Tipo: ' + owner.eqTipo),
      owner.eqUbicacion && ('Ubicación: ' + owner.eqUbicacion),
      owner[catField] && ('Foto: ' + owner[catField]),
    ].filter(Boolean);
  }
  return [];
}
function addFotoGenerico(gridId, uid, field, input){
  const file = input.files[0];
  if(!file) return;
  const owner = findOwner(uid);
  if(!owner) return;
  const catField = catFieldFor(field);
  comprimirFoto(file, (dataUrl) => {
    owner[field].push({cat: owner[catField], dataUrl});
    renderPhotoGrid(gridId, owner, field);
    updatePhotoCount(gridId, owner[field].length);
  }, lineasMarcaFoto(owner, field));
  input.value = '';
}
function delFotoGenerico(gridId, uid, field, idx){
  const owner = findOwner(uid);
  if(!owner) return;
  owner[field].splice(idx, 1);
  renderPhotoGrid(gridId, owner, field);
  updatePhotoCount(gridId, owner[field].length);
}

/* ---------------------------------------------------------
   CHECKLIST
--------------------------------------------------------- */
