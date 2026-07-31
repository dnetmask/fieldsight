function sanitizarNombre(s){
  return String(s||'').trim().replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'_');
}
function extDeDataUrl(dataUrl){
  const m = /^data:image\/([a-zA-Z0-9]+);base64,/.exec(dataUrl||'');
  let ext = m ? m[1].toLowerCase() : 'jpg';
  if(ext === 'jpeg') ext = 'jpg';
  return ext;
}
async function exportarFotosZip(){
  if(!currentDetailId) return;
  const btn = document.getElementById('btnFotosZip');
  const original = btn.innerHTML;
  btn.disabled = true; btn.textContent = 'Generando...';
  try{
    await ensureJSZip();
    const { data: row, error: rowErr } = await supabaseClient.from('visitas').select('*').eq('id', currentDetailId).single();
    if(rowErr || !row) throw new Error('No se encontró la visita');
    const r = filaAVisita(row);

    const partesCarpeta = [r.cliente, r.sede, r.proyecto, r.fecha].map(sanitizarNombre).filter(Boolean);
    const rutaCarpeta = partesCarpeta.length ? partesCarpeta.join('/') : 'FieldSight';
    const zip = new JSZip();
    const folder = zip.folder(rutaCarpeta);
    let count = 0;

    if(r.tipo === 'activos' && r.activos){
      for(const a of r.activos){
        const base = [a.area, a.proceso, a.maquina, a.nombre].map(sanitizarNombre).filter(Boolean).join('_') || 'Activo';
        const fotos = await resolverFotos(a.fotos);
        let n = 0;
        for(const f of fotos){
          if(!f.dataUrl) continue;
          n++; count++;
          folder.file(`${base}_${n}.${extDeDataUrl(f.dataUrl)}`, f.dataUrl.split(',')[1], {base64:true});
        }
      }
    }
    if(r.tipo === 'implementacion' && r.implementaciones){
      for(const it of r.implementaciones){
        const base = sanitizarNombre(it.eqNombre) || 'Equipo';
        const antes = await resolverFotos(it.fotosAntes);
        const despues = await resolverFotos(it.fotosDespues);
        let n = 0;
        for(const f of antes){ if(!f.dataUrl) continue; n++; count++; folder.file(`${base}_Antes_${n}.${extDeDataUrl(f.dataUrl)}`, f.dataUrl.split(',')[1], {base64:true}); }
        n = 0;
        for(const f of despues){ if(!f.dataUrl) continue; n++; count++; folder.file(`${base}_Despues_${n}.${extDeDataUrl(f.dataUrl)}`, f.dataUrl.split(',')[1], {base64:true}); }
      }
    }
    if(r.tipo === 'inspeccion' && r.checklist){
      let n = 0;
      for(const key of Object.keys(r.checklist)){
        const st = r.checklist[key];
        if(!st.fotoKey) continue;
        const dataUrl = await resolverFoto(st.fotoKey);
        if(!dataUrl) continue;
        n++; count++;
        const nombreItem = sanitizarNombre((key.split('|')[1]||'item'));
        folder.file(`${nombreItem}_${n}.${extDeDataUrl(dataUrl)}`, dataUrl.split(',')[1], {base64:true});
      }
    }

    if(count === 0){ toast('Esta visita no tiene fotos para exportar'); return; }

    const blob = await zip.generateAsync({type:'blob'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (r.codigo||'fotos') + '.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
    toast('ZIP generado ✓ ('+count+' fotos)');
  }catch(err){
    console.error(err);
    toast('No se pudo generar el ZIP: '+(err&&err.message?err.message:'error'), 3600);
  }finally{
    btn.disabled = false; btn.innerHTML = original;
  }
}

