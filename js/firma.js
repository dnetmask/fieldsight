function initSignaturePad(){
  const canvas = document.getElementById('sigCanvas');
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = (rect.width || 300) * ratio;
  canvas.height = 170 * ratio;
  sigCtx = canvas.getContext('2d');
  sigCtx.scale(ratio, ratio);
  sigCtx.lineWidth = 2.2;
  sigCtx.lineCap = 'round';
  sigCtx.strokeStyle = '#141414';
  const pos = (e) => { const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return {x:t.clientX-r.left, y:t.clientY-r.top}; };
  const start = (e) => { e.preventDefault(); sigDrawing=true; const p=pos(e); sigLastX=p.x; sigLastY=p.y; };
  const move = (e) => { if(!sigDrawing) return; e.preventDefault(); const p=pos(e); sigCtx.beginPath(); sigCtx.moveTo(sigLastX,sigLastY); sigCtx.lineTo(p.x,p.y); sigCtx.stroke(); sigLastX=p.x; sigLastY=p.y; };
  const end = () => { sigDrawing=false; };
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);
  canvas.addEventListener('touchstart', start, {passive:false});
  canvas.addEventListener('touchmove', move, {passive:false});
  canvas.addEventListener('touchend', end);
}
function limpiarFirma(){
  const canvas = document.getElementById('sigCanvas');
  sigCtx.clearRect(0,0,canvas.width,canvas.height);
}
function firmaVacia(){
  const canvas = document.getElementById('sigCanvas');
  const blank = document.createElement('canvas');
  blank.width = canvas.width; blank.height = canvas.height;
  return canvas.toDataURL() === blank.toDataURL();
}
function dibujarFirmaDesde(dataUrl){
  return new Promise((resolve) => {
    const canvas = document.getElementById('sigCanvas');
    const img = new Image();
    img.onload = () => {
      const ratio = window.devicePixelRatio || 1;
      const cw = canvas.width/ratio, ch = canvas.height/ratio;
      sigCtx.clearRect(0,0,cw,ch);
      const scale = Math.min(cw/img.width, ch/img.height, 1);
      const w = img.width*scale, h = img.height*scale;
      sigCtx.drawImage(img, (cw-w)/2, (ch-h)/2, w, h);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = dataUrl;
  });
}

/* ---------------------------------------------------------
   GUARDAR — cada foto se sube a su propia clave de storage
   (evita superar el límite de 5MB por clave) y el registro
   de la visita solo guarda referencias livianas.
--------------------------------------------------------- */
