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
   Cliente_Proyecto_Fecha.ext — usa sanitizarNombre (js/export-zip.js). */
function nombreInforme(r, ext){
  const partes = [r.cliente, r.proyecto, r.fecha].map(sanitizarNombre).filter(Boolean);
  const base = partes.length ? partes.join('_') : sanitizarNombre(r.codigo || 'FieldSight');
  return base + '.' + ext;
}

/* Aplica fn a cada elemento con a lo sumo `limite` llamadas en vuelo a la vez
   y devuelve los resultados en el mismo orden. Se usa para descargar fotos en
   paralelo sin disparar el rate-limit por IP del gateway (nginx.conf). */
async function mapConcurrente(items, limite, fn){
  const out = new Array(items.length);
  let siguiente = 0;
  async function obrero(){
    while(siguiente < items.length){
      const i = siguiente++;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({length: Math.min(limite, items.length)}, obrero));
  return out;
}

/* Vigencia de los enlaces firmados de fotos en el Excel exportado
   (js/detalle.js, js/export-excel.js) -- 90 días. */
const NM_LINK_EXPIRES_SECONDS = 90 * 24 * 60 * 60;

/* ---------------------------------------------------------
   CATÁLOGO DE TIPOS DE ACTIVO (compartido entre técnicos)
--------------------------------------------------------- */
