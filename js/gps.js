function capturarGPS(){
  if(!navigator.geolocation){ toast('Este navegador no soporta GPS'); return; }
  const btn = document.getElementById('btnGps');
  btn.disabled = true;
  btn.textContent = 'Obteniendo ubicación...';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      gpsActual = {lat:pos.coords.latitude, lng:pos.coords.longitude, acc:pos.coords.accuracy, ts:Date.now()};
      document.getElementById('gpsEmpty').classList.add('hidden');
      document.getElementById('gpsData').classList.remove('hidden');
      document.getElementById('gpsCoord').textContent = gpsActual.lat.toFixed(6)+', '+gpsActual.lng.toFixed(6);
      document.getElementById('gpsMeta').textContent = 'Precisión ±'+Math.round(gpsActual.acc)+' m · '+new Date(gpsActual.ts).toLocaleTimeString('es-CO');
      document.getElementById('gpsLink').href = 'https://maps.google.com/?q='+gpsActual.lat+','+gpsActual.lng;
      restoreGpsBtn();
    },
    (err) => { toast('No se pudo obtener la ubicación: '+err.message); restoreGpsBtn(); },
    {enableHighAccuracy:true, timeout:15000}
  );
}
function restoreGpsBtn(){
  const btn = document.getElementById('btnGps');
  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg> Capturar ubicación actual`;
}

/* ---------------------------------------------------------
   FOTOS — compresión con reducción progresiva de calidad
--------------------------------------------------------- */
