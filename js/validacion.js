function validarIP(v){
  if(!v) return true;
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/.test(v.trim());
}
function validarMAC(v){
  if(!v) return true;
  return /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(v.trim());
}
// Reformatea a mayúsculas y con ":" cada 2 caracteres mientras se escribe,
// para no depender de que el técnico teclee el formato exacto a mano.
function formatearMAC(v){
  const hex = v.toUpperCase().replace(/[^0-9A-F]/g, '').slice(0, 12);
  return hex.replace(/(.{2})(?=.)/g, '$1:');
}
function onCampoRedInput(uid, field, el){
  let valor = el.value;
  if(field === 'mac'){
    valor = formatearMAC(valor);
    el.value = valor;
    el.setSelectionRange(valor.length, valor.length);
  }
  updateActivo(uid, field, valor);
  const ok = field==='ip' ? validarIP(valor) : validarMAC(valor);
  el.classList.toggle('input-invalid', !ok);
}

/* ---------------------------------------------------------
   NAVEGACIÓN
--------------------------------------------------------- */
