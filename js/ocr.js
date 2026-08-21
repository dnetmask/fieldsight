/* ---------------------------------------------------------
   OCR — lee texto desde una foto (placa/etiqueta de un activo)
   para llenar campos como Marca, Modelo o Serial sin escribirlos
   a mano. Corre 100% en el navegador (Tesseract.js vía WASM) — la
   foto no se envía a ningún servidor para esto.
--------------------------------------------------------- */
let _tesseractWorkerPromise = null;

// DEBUG TEMPORAL: agrega ?ocrdebug=1 a la URL para ver, en cada foto, la
// imagen ya preprocesada y el texto crudo que detecta Tesseract. Quitar
// este bloque (y los que dicen "DEBUG TEMPORAL" más abajo) cuando el OCR
// quede afinado.
window.OCR_DEBUG = new URLSearchParams(location.search).get('ocrdebug') === '1';

function ensureTesseractScript(){
  return new Promise((resolve, reject) => {
    if(window.Tesseract){ resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar el módulo de OCR (revisa tu conexión a internet).'));
    document.head.appendChild(s);
  });
}

// Un solo worker reutilizado entre capturas — crear uno nuevo por foto sería
// lento (cada worker vuelve a descargar los datos del idioma).
function ensureTesseractWorker(){
  if(!_tesseractWorkerPromise){
    _tesseractWorkerPromise = ensureTesseractScript().then(async () => {
      const worker = await Tesseract.createWorker('eng');
      // PSM 11 = "texto disperso" (no asume una sola línea/párrafo limpio).
      // Muchas placas/etiquetas de campo traen un código de barras junto al
      // texto legible — un modo que asume "todo es una sola línea" (PSM 7)
      // se confunde con las barras y no lee nada útil. PSM 11 encuentra el
      // texto real aunque también detecte fragmentos de ruido alrededor
      // (por eso handleOcrCapture se queda con la línea más larga, no la
      // primera).
      await worker.setParameters({ tessedit_pageseg_mode: '11' });
      return worker;
    });
  }
  return _tesseractWorkerPromise;
}

// Convierte la foto a escala de grises + contraste estirado antes de leerla.
// Ayuda mucho con placas metálicas grabadas/en relieve o con poco contraste
// (el caso más común y más difícil para OCR genérico sobre una foto a color).
function prepararImagenParaOcr(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la foto.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('No se pudo procesar la foto.'));
      img.onload = () => {
        const maxDim = 1600;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const px = imgData.data;
        const gris = new Uint8ClampedArray(w * h);
        let min = 255, max = 0;
        for(let i = 0; i < gris.length; i++){
          const o = i * 4;
          const g = px[o] * 0.299 + px[o + 1] * 0.587 + px[o + 2] * 0.114;
          gris[i] = g;
          if(g < min) min = g;
          if(g > max) max = g;
        }
        const rango = (max - min) || 1;
        for(let i = 0; i < gris.length; i++){
          const v = Math.round((gris[i] - min) * 255 / rango);
          const o = i * 4;
          px[o] = px[o + 1] = px[o + 2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
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
    const worker = await ensureTesseractWorker();
    const canvas = await prepararImagenParaOcr(file);
    const { data } = await worker.recognize(canvas);

    // --- DEBUG TEMPORAL: quitar cuando el OCR quede afinado ---
    if(window.OCR_DEBUG){
      window.open(canvas.toDataURL('image/png'), '_blank');
      alert('DEBUG\nTexto crudo: ' + JSON.stringify(data.text) + '\nConfianza: ' + Math.round(data.confidence) + '\nTamaño foto: ' + canvas.width + 'x' + canvas.height);
    }
    // --- FIN DEBUG ---

    const lineas = (data.text || '').split('\n').map(l => l.trim()).filter(Boolean);
    if(!lineas.length){
      alert('No se detectó texto en la foto. Intenta con más luz y de más cerca, o escribe el valor manualmente.');
      return;
    }
    // En modo "texto disperso" también aparecen fragmentos de ruido (barras
    // de código de barras mal leídas, marcas sueltas). El dato real casi
    // siempre es la línea con más caracteres alfanuméricos — se descartan
    // primero las líneas que son solo ruido (menos de 2 letras/números).
    const conContenido = lineas.filter(l => (l.match(/[a-z0-9]/gi) || []).length >= 2);
    const candidatas = conContenido.length ? conContenido : lineas;
    const mejor = candidatas.reduce((a, b) => b.length > a.length ? b : a);
    const target = document.getElementById(targetInputId);
    if(target){
      target.value = mejor;
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
