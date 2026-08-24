function toast(msg, ms){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), ms || 2400);
}
function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function cssId(key){ return key.replace(/[^a-zA-Z0-9]/g,'_'); }

/* Nombre de archivo estándar para los informes exportados (Word/Excel/PDF):
   Cliente_TipoDeActividad_Fecha.ext — usa sanitizarNombre (js/export-zip.js). */
function nombreInforme(r, ext){
  const tipoTxt = (TIPO_LABEL && TIPO_LABEL[r.tipo]) || r.tipo || 'Informe';
  const partes = [r.cliente, tipoTxt, r.fecha].map(sanitizarNombre).filter(Boolean);
  const base = partes.length ? partes.join('_') : sanitizarNombre(r.codigo || 'FieldSight');
  return base + '.' + ext;
}

/* ---------------------------------------------------------
   CATÁLOGO DE TIPOS DE ACTIVO (compartido entre técnicos)
--------------------------------------------------------- */
