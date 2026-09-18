/* ---------------------------------------------------------
   GPS -- primer intento con alta precisión (GPS real); si falla o
   tarda, segundo intento con precisión normal (red / wifi). Dentro
   de un datacenter o entre estructuras metálicas el GPS puro suele
   no fijar, y una coordenada aproximada sirve más que ninguna.
--------------------------------------------------------- */
function obtenerPosicion(opciones){
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, opciones));
}

// Pinta (o limpia, con null) la ubicación en el formulario y la deja en gpsActual.
function pintarGps(g){
  gpsActual = g || null;
  document.getElementById('gpsEmpty').classList.toggle('hidden', !!g);
  document.getElementById('gpsData').classList.toggle('hidden', !g);
  if(!g) return;
  document.getElementById('gpsCoord').textContent = g.lat.toFixed(6)+', '+g.lng.toFixed(6);
  document.getElementById('gpsMeta').textContent = 'Precisión ±'+Math.round(g.acc)+' m · '+new Date(g.ts).toLocaleTimeString('es-CO');
  document.getElementById('gpsLink').href = 'https://maps.google.com/?q='+g.lat+','+g.lng;
}

function mensajeErrorGps(err){
  if(err && err.code === 1) return 'Permiso de ubicación denegado. Actívalo para este sitio en los ajustes del navegador.';
  if(err && err.code === 3) return 'El GPS no respondió a tiempo. Acércate a una ventana o sal al exterior e intenta de nuevo.';
  return 'No se pudo obtener la ubicación' + (err && err.message ? ': '+err.message : '') + '.';
}

async function capturarGPS(){
  if(!navigator.geolocation){ toast('Este navegador no soporta GPS'); return; }
  const btn = document.getElementById('btnGps');
  btn.disabled = true;
  btn.textContent = 'Obteniendo ubicación...';
  try{
    let pos;
    try{
      pos = await obtenerPosicion({enableHighAccuracy:true, timeout:12000, maximumAge:0});
    }catch(err1){
      if(err1 && err1.code === 1) throw err1; // sin permiso: reintentar no ayuda
      btn.textContent = 'Reintentando con menor precisión...';
      pos = await obtenerPosicion({enableHighAccuracy:false, timeout:10000, maximumAge:60000});
    }
    pintarGps({lat:pos.coords.latitude, lng:pos.coords.longitude, acc:pos.coords.accuracy, ts:Date.now()});
    if(pos.coords.accuracy > 100) toast('Ubicación aproximada (±'+Math.round(pos.coords.accuracy)+' m). Puedes volver a capturarla más tarde.', 3600);
  }catch(err){
    toast(mensajeErrorGps(err), 3600);
  }finally{
    restoreGpsBtn();
  }
}
function restoreGpsBtn(){
  const btn = document.getElementById('btnGps');
  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Capturar ubicación actual`;
}

/* ---------------------------------------------------------
   FOTOS — compresión con reducción progresiva de calidad
--------------------------------------------------------- */
