function addActivo(){
  // Área y Proceso se repiten casi siempre entre activos consecutivos de la
  // misma visita — se heredan del último agregado para no tener que
  // volver a escribirlos cada vez (el técnico los cambia si corresponde).
  const anterior = activos[activos.length - 1];
  activos.push({
    uid:newUid(),
    area: anterior ? anterior.area : '',
    proceso: anterior ? anterior.proceso : '',
    maquina:'', ubicacion:'', nombre:'', tipo:'', marca:'', modelo:'', serial:'', tag:'', tablero:'', estado:'', obs:'', otRed:'', protocolo:'', ip:'', mac:'', fotos:[], catSel:CAT_ACTIVO[0]
  });
  renderActivos();
}
function removeActivo(uid){
  activos = activos.filter(a => a.uid !== uid);
  renderActivos();
}
function updateActivo(uid, field, value){
  const a = activos.find(x => x.uid === uid);
  if(a) a[field] = value;
}
function renderActivos(){
  const wrap = document.getElementById('activosList');
  wrap.innerHTML = activos.map((a, idx) => `
    <div class="rep-card">
      <div class="rep-head">
        <div class="rep-title">Activo ${idx+1}</div>
        <button class="rep-del" onclick="removeActivo('${a.uid}')">×</button>
      </div>
      <div class="field-row">
        <div><label>Área</label><input type="text" value="${escapeHtml(a.area)}" oninput="updateActivo('${a.uid}','area',this.value)"></div>
        <div><label>Proceso</label><input type="text" value="${escapeHtml(a.proceso)}" oninput="updateActivo('${a.uid}','proceso',this.value)"></div>
      </div>
      <div class="field-row">
        <div><label>Máquina</label><input type="text" value="${escapeHtml(a.maquina)}" oninput="updateActivo('${a.uid}','maquina',this.value)"></div>
        <div><label>Ubicación específica</label><input type="text" value="${escapeHtml(a.ubicacion)}" oninput="updateActivo('${a.uid}','ubicacion',this.value)"></div>
      </div>
      <label>Nombre del activo</label>
      <input type="text" value="${escapeHtml(a.nombre)}" oninput="updateActivo('${a.uid}','nombre',this.value)">
      <div class="field-row">
        <div>
          <label>Tipo de activo</label>
          <select onchange="handleTipoActivoChange('${a.uid}', this.value)">
            <option value="">Seleccionar...</option>
            ${CATALOGO_TIPOS.map(t => `<option ${a.tipo===t?'selected':''}>${escapeHtml(t)}</option>`).join('')}
            <option value="__add__">+ Agregar nuevo tipo...</option>
          </select>
        </div>
        <div>
          <label>Marca</label>
          <div class="input-with-ocr">
            <input type="text" id="marca-${a.uid}" value="${escapeHtml(a.marca)}" oninput="updateActivo('${a.uid}','marca',this.value)">
            ${ocrButtonHtml('marca-'+a.uid)}
          </div>
        </div>
      </div>
      <div class="field-row">
        <div>
          <label>Modelo</label>
          <div class="input-with-ocr">
            <input type="text" id="modelo-${a.uid}" value="${escapeHtml(a.modelo)}" oninput="updateActivo('${a.uid}','modelo',this.value)">
            ${ocrButtonHtml('modelo-'+a.uid)}
          </div>
        </div>
        <div>
          <label>Serial</label>
          <div class="input-with-ocr">
            <input type="text" id="serial-${a.uid}" value="${escapeHtml(a.serial)}" oninput="updateActivo('${a.uid}','serial',this.value)">
            ${ocrButtonHtml('serial-'+a.uid)}
          </div>
        </div>
      </div>
      <div class="field-row">
        <div><label>Tag / identificador</label><input type="text" value="${escapeHtml(a.tag)}" oninput="updateActivo('${a.uid}','tag',this.value)"></div>
        <div><label>Tablero / rack / gabinete</label><input type="text" value="${escapeHtml(a.tablero)}" oninput="updateActivo('${a.uid}','tablero',this.value)"></div>
      </div>

      <div class="field-row">
        <div>
          <label>Conectado a red OT</label>
          <select onchange="updateActivo('${a.uid}','otRed',this.value)">
            <option value="">Seleccionar...</option>
            <option ${a.otRed==='Sí'?'selected':''}>Sí</option>
            <option ${a.otRed==='No'?'selected':''}>No</option>
            <option ${a.otRed==='No aplica'?'selected':''}>No aplica</option>
          </select>
        </div>
        <div>
          <label>Protocolo</label>
          <select onchange="handleProtocoloChange('${a.uid}', this.value)">
            <option value="">Seleccionar...</option>
            ${CATALOGO_PROTOCOLOS.map(p => `<option ${a.protocolo===p.nombre?'selected':''}>${escapeHtml(p.nombre)}</option>`).join('')}
            <option value="__add__">+ Agregar nuevo protocolo...</option>
          </select>
        </div>
      </div>
      ${protocoloEsEthernet(a.protocolo) ? `
      <div class="field-row">
        <div>
          <label>Dirección IP</label>
          <input type="text" inputmode="decimal" placeholder="192.168.1.10" value="${escapeHtml(a.ip)}" class="${a.ip && !validarIP(a.ip)?'input-invalid':''}" oninput="onCampoRedInput('${a.uid}','ip',this)">
        </div>
        <div>
          <label>Dirección MAC</label>
          <input type="text" placeholder="AA:BB:CC:DD:EE:FF" value="${escapeHtml(a.mac)}" class="${a.mac && !validarMAC(a.mac)?'input-invalid':''}" oninput="onCampoRedInput('${a.uid}','mac',this)">
        </div>
      </div>
      <div class="field-error">Formato: IP como 192.168.1.10 · MAC como AA:BB:CC:DD:EE:FF</div>
      ` : ''}

      <label>Estado del activo</label>
      <select onchange="updateActivo('${a.uid}','estado',this.value)">
        <option value="">Seleccionar...</option>
        <option ${a.estado==='Bueno'?'selected':''}>Bueno</option>
        <option ${a.estado==='Regular'?'selected':''}>Regular</option>
        <option ${a.estado==='Malo'?'selected':''}>Malo</option>
        <option ${a.estado==='Fuera de servicio'?'selected':''}>Fuera de servicio</option>
      </select>
      <label>Observaciones</label>
      <textarea oninput="updateActivo('${a.uid}','obs',this.value)">${escapeHtml(a.obs)}</textarea>

      <div class="photo-section">
        <label>Categoría de la próxima foto</label>
        <select class="photo-cat-select" onchange="updateActivo('${a.uid}','catSel',this.value)">
          ${CAT_ACTIVO.map(c=>`<option ${a.catSel===c?'selected':''}>${c}</option>`).join('')}
        </select>
        <div class="photo-count">${a.fotos.length} foto(s) agregada(s)</div>
        <div class="photo-grid" id="grid-act-${a.uid}"></div>
      </div>
    </div>
  `).join('');
  activos.forEach(a => renderPhotoGrid('grid-act-'+a.uid, a, 'fotos'));
}

/* ---------------------------------------------------------
   IMPLEMENTACIÓN ANTES / DESPUÉS
--------------------------------------------------------- */
