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

/* ---------------------------------------------------------
   CATÁLOGO DE TIPOS DE ACTIVO (compartido entre técnicos)
--------------------------------------------------------- */
