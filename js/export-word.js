const NM_NAVY = '0A2540';
const NM_BLUE = '0072CE';

function ensureJSZip(){
  return new Promise((resolve, reject) => {
    if(window.JSZip){ resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('No se pudo cargar el módulo de Word (revisa tu conexión a internet)'));
    document.head.appendChild(s);
  });
}

function xmlEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function docxP(text, opts={}){
  const {bold=false, italic=false, size=21, color='141414', spacingBefore=0, spacingAfter=120, borderColor=null, alignment=null} = opts;
  let rPr = `<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>${bold?'<w:b/>':''}${italic?'<w:i/>':''}<w:color w:val="${color}"/><w:sz w:val="${size}"/>`;
  let pPr = `<w:spacing w:before="${spacingBefore}" w:after="${spacingAfter}"/>`;
  if(borderColor) pPr += `<w:pBdr><w:bottom w:val="single" w:sz="12" w:space="4" w:color="${borderColor}"/></w:pBdr>`;
  if(alignment) pPr += `<w:jc w:val="${alignment}"/>`;
  return `<w:p><w:pPr>${pPr}</w:pPr><w:r><w:rPr>${rPr}</w:rPr><w:t xml:space="preserve">${xmlEsc(text)}</w:t></w:r></w:p>`;
}
function docxH1(text){ return docxP(text, {bold:true, size:36, color:NM_NAVY, spacingBefore:120, spacingAfter:160, borderColor:NM_BLUE}); }
function docxH2(text){ return docxP(text, {bold:true, size:26, color:NM_BLUE, spacingBefore:220, spacingAfter:120}); }
function docxH3(text){ return docxP(text, {bold:true, size:22, color:NM_NAVY, spacingBefore:180, spacingAfter:100}); }

function docxKV(rows, colWidths=[2500,6500]){
  const trs = rows.map(([k,v]) => `
    <w:tr>
      <w:tc><w:tcPr><w:tcW w:w="${colWidths[0]}" w:type="dxa"/><w:shd w:val="clear" w:fill="F2F2F2"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${xmlEsc(k)}</w:t></w:r></w:p></w:tc>
      <w:tc><w:tcPr><w:tcW w:w="${colWidths[1]}" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${xmlEsc(v||'—')}</w:t></w:r></w:p></w:tc>
    </w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="9000" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideH w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideV w:val="single" w:sz="4" w:color="CCCCCC"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblGrid><w:gridCol w:w="${colWidths[0]}"/><w:gridCol w:w="${colWidths[1]}"/></w:tblGrid></w:tblPr>${trs}</w:tbl>`;
}
function docxGridTable(headers, rows, colWidths){
  const total = colWidths.reduce((a,b)=>a+b,0);
  const headerTr = `<w:tr>${headers.map((h,i)=>`<w:tc><w:tcPr><w:tcW w:w="${colWidths[i]}" w:type="dxa"/><w:shd w:val="clear" w:fill="${NM_NAVY}"/></w:tcPr><w:p><w:r><w:rPr><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${xmlEsc(h)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`;
  const bodyTrs = rows.map(r => `<w:tr>${r.map((c,i)=>`<w:tc><w:tcPr><w:tcW w:w="${colWidths[i]}" w:type="dxa"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">${xmlEsc(c)}</w:t></w:r></w:p></w:tc>`).join('')}</w:tr>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="CCCCCC"/><w:left w:val="single" w:sz="4" w:color="CCCCCC"/><w:bottom w:val="single" w:sz="4" w:color="CCCCCC"/><w:right w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideH w:val="single" w:sz="4" w:color="CCCCCC"/><w:insideV w:val="single" w:sz="4" w:color="CCCCCC"/></w:tblBorders><w:tblLayout w:type="fixed"/><w:tblGrid>${colWidths.map(w=>`<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid></w:tblPr>${headerTr}${bodyTrs}</w:tbl>`;
}
function docxImagePara(rId, emuW, emuH, docPrId){
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${emuW}" cy="${emuH}"/><wp:docPr id="${docPrId}" name="Picture${docPrId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="Picture${docPrId}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emuW}" cy="${emuH}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}
function getImageDims(dataUrl){
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({w:img.naturalWidth||800, h:img.naturalHeight||600});
    img.onerror = () => resolve({w:800,h:600});
    img.src = dataUrl;
  });
}

/* Constructor incremental del cuerpo del documento + registro de imágenes */
function crearDocxBuilder(){
  let bodyXml = '';
  const mediaFiles = []; // {rId, ext, base64}
  let counter = 0;
  return {
    addRaw(xml){ bodyXml += xml; },
    async addImage(dataUrl, caption, maxWpx=240){
      if(!dataUrl) return;
      counter++;
      const rId = counter;
      const extMatch = /^data:image\/([a-zA-Z0-9]+);base64,/.exec(dataUrl);
      let ext = extMatch ? extMatch[1].toLowerCase() : 'jpeg';
      if(ext === 'jpg') ext = 'jpeg';
      const base64 = dataUrl.substring(dataUrl.indexOf(',')+1);
      mediaFiles.push({rId, ext, base64});
      const dims = await getImageDims(dataUrl);
      const scale = Math.min(1, maxWpx / dims.w);
      const wpx = Math.max(1, Math.round(dims.w * scale));
      const hpx = Math.max(1, Math.round(dims.h * scale));
      bodyXml += docxImagePara(rId, wpx*9525, hpx*9525, 100+rId);
      if(caption) bodyXml += docxP(caption, {size:16, italic:true, color:'5B6470', alignment:'center', spacingAfter:220});
    },
    async build(){
      await ensureJSZip();
      bodyXml += `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080"/></w:sectPr>`;
      const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>${bodyXml}</w:body></w:document>`;

      const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="jpeg" ContentType="image/jpeg"/>
<Default Extension="png" ContentType="image/png"/>
<Default Extension="gif" ContentType="image/gif"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

      const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

      const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${mediaFiles.map(m => `<Relationship Id="rId${m.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${m.rId}.${m.ext}"/>`).join('\n')}
</Relationships>`;

      const zip = new JSZip();
      zip.file('[Content_Types].xml', contentTypes);
      zip.file('_rels/.rels', rootRels);
      zip.file('word/document.xml', documentXml);
      zip.file('word/_rels/document.xml.rels', docRels);
      mediaFiles.forEach(m => zip.file(`word/media/image${m.rId}.${m.ext}`, m.base64, {base64:true}));

      return await zip.generateAsync({type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'});
    }
  };
}

async function agregarActivosAWord(b, r){
  for(let i=0;i<r.activos.length;i++){
    const a = r.activos[i];
    b.addRaw(docxH3(`${i+1}. ${a.nombre||'Activo sin nombre'}${a.estado?(' — '+a.estado):''}`));
    b.addRaw(docxKV([
      ['Tipo', a.tipo],['Área',a.area],['Proceso',a.proceso],['Máquina',a.maquina],
      ['Marca',a.marca],['Modelo',a.modelo],['Serial',a.serial],['Tag',a.tag],
      ['Tablero/Rack',a.tablero],['Ubicación',a.ubicacion],
      ['Conectado a red OT', a.otRed],['Protocolo', a.protocolo],
      ['Dirección IP', a.ip],['Dirección MAC', a.mac]
    ]));
    if(a.obs) b.addRaw(docxP('Observaciones: '+a.obs, {size:20, spacingAfter:160}));
    const fotos = await resolverFotos(a.fotos);
    for(const f of fotos){ if(f.dataUrl) await b.addImage(f.dataUrl, f.cat); }
  }
}
async function agregarImplAWord(b, r){
  for(let i=0;i<r.implementaciones.length;i++){
    const it = r.implementaciones[i];
    b.addRaw(docxH3(`${i+1}. ${it.eqNombre||'Equipo sin nombre'}${it.conformidad?(' — '+it.conformidad):''}`));
    b.addRaw(docxKV([
      ['Tipo de implementación', it.tipo],['Marca',it.eqMarca],['Modelo',it.eqModelo],
      ['Serial',it.eqSerial],['Rack/Tablero',it.eqTablero],['Ubicación',it.eqUbicacion]
    ]));
    if(it.descripcion) b.addRaw(docxP('Descripción: '+it.descripcion, {size:20, spacingAfter:120}));
    if(it.estadoInicial) b.addRaw(docxP('Estado inicial: '+it.estadoInicial, {size:20, spacingAfter:120}));
    if(it.estadoFinal) b.addRaw(docxP('Estado final: '+it.estadoFinal, {size:20, spacingAfter:120}));
    if(it.hallazgos) b.addRaw(docxP('Hallazgos: '+it.hallazgos, {size:20, spacingAfter:120}));
    if(it.accion) b.addRaw(docxP('Acción recomendada: '+it.accion, {size:20, spacingAfter:160}));
    const antesR = (await resolverFotos(it.fotosAntes)).filter(f=>f.dataUrl);
    const despuesR = (await resolverFotos(it.fotosDespues)).filter(f=>f.dataUrl);
    if(antesR.length){
      b.addRaw(docxP('ANTES', {bold:true, size:18, color:'5B6470', spacingAfter:80}));
      for(const f of antesR) await b.addImage(f.dataUrl, f.cat);
    }
    if(despuesR.length){
      b.addRaw(docxP('DESPUÉS', {bold:true, size:18, color:'5B6470', spacingAfter:80}));
      for(const f of despuesR) await b.addImage(f.dataUrl, f.cat);
    }
  }
}
async function agregarChecklistAWord(b, r){
  const rows = [];
  for(const grp of CHECKLIST_DEF){
    for(const itxt of grp.items){
      const key = grp.grupo+'|'+itxt;
      const st = (r.checklist && r.checklist[key]) || {};
      const estadoTxt = st.estado==='ok'?'Cumple':st.estado==='bad'?('No cumple'+(st.criticidad?' · '+st.criticidad:'')):st.estado==='na'?'N/A':'Sin marcar';
      rows.push([grp.grupo, itxt, estadoTxt, st.obs||'']);
    }
  }
  b.addRaw(docxGridTable(['Grupo','Ítem','Estado','Observación'], rows, [1800,3600,1800,1800]));
  b.addRaw(docxP('', {spacingAfter:100}));
  for(const grp of CHECKLIST_DEF){
    for(const itxt of grp.items){
      const key = grp.grupo+'|'+itxt;
      const st = (r.checklist && r.checklist[key]) || {};
      if(st.fotoKey){
        const dataUrl = await resolverFoto(st.fotoKey);
        if(dataUrl) await b.addImage(dataUrl, itxt, 200);
      }
    }
  }
}

async function exportarWord(){
  if(!currentDetailId) return;
  const btn = document.getElementById('btnWord');
  const original = btn.innerHTML;
  btn.disabled = true; btn.textContent = 'Generando...';
  try{
    const { data: row, error: rowErr } = await supabaseClient.from('visitas').select('*').eq('id', currentDetailId).single();
    if(rowErr || !row) throw new Error('No se encontró la visita');
    const r = filaAVisita(row);

    const b = crearDocxBuilder();
    b.addRaw(docxP('NETMASK S.A.S.', {bold:true, size:22, color:NM_BLUE, spacingAfter:20}));
    b.addRaw(docxP('Envigado, Antioquia · Colombia', {size:16, color:'5B6470', spacingAfter:240}));
    b.addRaw(docxH1('Informe de visita técnica — '+(r.codigo||'')));
    b.addRaw(docxKV([
      ['Proyecto', r.proyecto], ['Cliente', r.cliente], ['Sede', r.sede],
      ['Técnico', r.tecnico], ['Fecha', r.fecha],
      ['Tipo de actividad', TIPO_LABEL[r.tipo]||r.tipo],
      ['Coordenadas GPS', r.gps ? (r.gps.lat.toFixed(5)+', '+r.gps.lng.toFixed(5)) : 'No capturado']
    ]));

    if(r.tipo === 'activos'){ b.addRaw(docxH2('Activos levantados')); await agregarActivosAWord(b, r); }
    if(r.tipo === 'implementacion'){ b.addRaw(docxH2('Implementación antes / después')); await agregarImplAWord(b, r); }
    if(r.tipo === 'inspeccion'){ b.addRaw(docxH2('Checklist de inspección')); await agregarChecklistAWord(b, r); }
    if(r.observaciones){ b.addRaw(docxH2('Observaciones generales')); b.addRaw(docxP(r.observaciones, {size:20})); }

    b.addRaw(docxH2('Firma'));
    if(r.firma && r.firma.dataUrl) await b.addImage(r.firma.dataUrl, null, 180);
    else b.addRaw(docxP('Sin firma registrada', {size:20}));
    b.addRaw(docxP((r.firma&&r.firma.nombre)||'—', {bold:true, size:20, spacingAfter:20}));
    b.addRaw(docxP((r.firma&&r.firma.cargo)||'', {size:18}));

    const blob = await b.build();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (r.codigo||'informe') + '.docx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
    toast('Word generado ✓ revisa tus descargas');
  }catch(err){
    console.error(err);
    toast('No se pudo generar el Word: '+(err&&err.message?err.message:'error'), 3600);
  }finally{
    btn.disabled = false; btn.innerHTML = original;
  }
}

/* ---------------------------------------------------------
   REABRIR / EDITAR una visita guardada desde el historial
--------------------------------------------------------- */
