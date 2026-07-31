function validarIP(v){
  if(!v) return true;
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/.test(v.trim());
}
function validarMAC(v){
  if(!v) return true;
  return /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(v.trim());
}
function onCampoRedInput(uid, field, el){
  updateActivo(uid, field, el.value);
  const ok = field==='ip' ? validarIP(el.value) : validarMAC(el.value);
  el.classList.toggle('input-invalid', !ok);
}

/* ---------------------------------------------------------
   NAVEGACIÓN
--------------------------------------------------------- */
