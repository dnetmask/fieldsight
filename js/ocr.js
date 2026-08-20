/* ---------------------------------------------------------
   OCR — lee texto desde una foto (placa/etiqueta de un activo)
   para llenar campos como Marca, Modelo o Serial sin escribirlos
   a mano. Corre 100% en el navegador (Tesseract.js vía WASM) — la
   foto no se envía a ningún servidor para esto.
--------------------------------------------------------- */
function ensureTesseract(){
  return new Promise((resolve, reject) => {
    if(window.Tesseract){ resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar el módulo de OCR (revisa tu conexión a internet).'));
    document.head.appendChild(s);
  });
}

function ocrButtonHtml(targetInputId){
  return `
    <label class="ocr-btn" title="Leer con cámara (OCR)">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
      <input type="file" accept="image/*" capture="environment" onchange="handleOcrCapture(this, '${targetInputId}')">
    </label>
  `;
}

async function handleOcrCapture(fileInput, targetInputId){
  const file = fileInput.files[0];
  if(!file) return;
  const btn = fileInput.closest('.ocr-btn');
  if(btn) btn.classList.add('ocr-loading');
  try{
    await ensureTesseract();
    const { data } = await Tesseract.recognize(file, 'eng');
    const lineas = (data.text || '').split('\n').map(l => l.trim()).filter(Boolean);
    if(!lineas.length){
      alert('No se detectó texto en la foto. Intenta con más luz y de más cerca, o escribe el valor manualmente.');
      return;
    }
    const target = document.getElementById(targetInputId);
    if(target){
      target.value = lineas[0];
      target.dispatchEvent(new Event('input', {bubbles:true}));
      target.focus();
    }
  } catch(err){
    alert(err.message || 'No se pudo leer el texto de la foto. Escribe el valor manualmente.');
  } finally {
    if(btn) btn.classList.remove('ocr-loading');
    fileInput.value = '';
  }
}
