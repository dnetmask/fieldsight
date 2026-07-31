function addImpl(){
  implementaciones.push({uid:newUid(), tipo:'', descripcion:'', eqNombre:'', eqTipo:'', eqMarca:'', eqModelo:'', eqSerial:'', eqUbicacion:'', eqTablero:'', estadoInicial:'', estadoFinal:'', conformidad:'', hallazgos:'', accion:'', fotosAntes:[], fotosDespues:[], catSelAntes:CAT_ANTES[0], catSelDespues:CAT_DESPUES[0]});
  renderImpl();
}
function removeImpl(uid){
  implementaciones = implementaciones.filter(x => x.uid !== uid);
  renderImpl();
}
function updateImpl(uid, field, value){
  const it = implementaciones.find(x => x.uid === uid);
  if(it) it[field] = value;
}
function renderImpl(){
  const wrap = document.getElementById('implList');
  wrap.innerHTML = implementaciones.map((it, idx) => `
    <div class="rep-card">
      <div class="rep-head">
        <div class="rep-title">Implementación ${idx+1}</div>
        <button class="rep-del" onclick="removeImpl('${it.uid}')">×</button>
      </div>
      <div class="field-row">
        <div><label>Tipo de implementación</label><input type="text" value="${escapeHtml(it.tipo)}" oninput="updateImpl('${it.uid}','tipo',this.value)" placeholder="Ej. Instalación de switch"></div>
        <div><label>Conformidad</label>
          <select onchange="updateImpl('${it.uid}','conformidad',this.value)">
            <option value="">Seleccionar...</option>
            <option ${it.conformidad==='Conforme'?'selected':''}>Conforme</option>
            <option ${it.conformidad==='No conforme'?'selected':''}>No conforme</option>
          </select>
        </div>
      </div>
      <label>Descripción de la actividad</label>
      <textarea oninput="updateImpl('${it.uid}','descripcion',this.value)">${escapeHtml(it.descripcion)}</textarea>

      <div class="field-row">
        <div><label>Equipo — nombre</label><input type="text" value="${escapeHtml(it.eqNombre)}" oninput="updateImpl('${it.uid}','eqNombre',this.value)"></div>
        <div><label>Equipo — tipo</label><input type="text" value="${escapeHtml(it.eqTipo)}" oninput="updateImpl('${it.uid}','eqTipo',this.value)"></div>
      </div>
      <div class="field-row">
        <div><label>Marca</label><input type="text" value="${escapeHtml(it.eqMarca)}" oninput="updateImpl('${it.uid}','eqMarca',this.value)"></div>
        <div><label>Modelo</label><input type="text" value="${escapeHtml(it.eqModelo)}" oninput="updateImpl('${it.uid}','eqModelo',this.value)"></div>
      </div>
      <div class="field-row">
        <div><label>Serial</label><input type="text" value="${escapeHtml(it.eqSerial)}" oninput="updateImpl('${it.uid}','eqSerial',this.value)"></div>
        <div><label>Rack / tablero asociado</label><input type="text" value="${escapeHtml(it.eqTablero)}" oninput="updateImpl('${it.uid}','eqTablero',this.value)"></div>
      </div>
      <label>Ubicación</label>
      <input type="text" value="${escapeHtml(it.eqUbicacion)}" oninput="updateImpl('${it.uid}','eqUbicacion',this.value)">

      <div class="field-row">
        <div><label>Estado inicial</label><textarea oninput="updateImpl('${it.uid}','estadoInicial',this.value)">${escapeHtml(it.estadoInicial)}</textarea></div>
        <div><label>Estado final</label><textarea oninput="updateImpl('${it.uid}','estadoFinal',this.value)">${escapeHtml(it.estadoFinal)}</textarea></div>
      </div>
      <label>Hallazgos</label>
      <textarea oninput="updateImpl('${it.uid}','hallazgos',this.value)">${escapeHtml(it.hallazgos)}</textarea>
      <label>Acción recomendada</label>
      <textarea oninput="updateImpl('${it.uid}','accion',this.value)">${escapeHtml(it.accion)}</textarea>

      <div class="photo-section">
        <label>Fotos — Antes de la intervención</label>
        <select class="photo-cat-select" onchange="updateImpl('${it.uid}','catSelAntes',this.value)">
          ${CAT_ANTES.map(c=>`<option ${it.catSelAntes===c?'selected':''}>${c}</option>`).join('')}
        </select>
        <div class="photo-count">${it.fotosAntes.length} foto(s) agregada(s)</div>
        <div class="photo-grid" id="grid-impl-antes-${it.uid}"></div>
      </div>

      <div class="photo-section" style="margin-top:14px;">
        <label>Fotos — Después de la intervención</label>
        <select class="photo-cat-select" onchange="updateImpl('${it.uid}','catSelDespues',this.value)">
          ${CAT_DESPUES.map(c=>`<option ${it.catSelDespues===c?'selected':''}>${c}</option>`).join('')}
        </select>
        <div class="photo-count">${it.fotosDespues.length} foto(s) agregada(s)</div>
        <div class="photo-grid" id="grid-impl-despues-${it.uid}"></div>
      </div>
    </div>
  `).join('');
  implementaciones.forEach(it => {
    renderPhotoGrid('grid-impl-antes-'+it.uid, it, 'fotosAntes');
    renderPhotoGrid('grid-impl-despues-'+it.uid, it, 'fotosDespues');
  });
}

/* ---------------------------------------------------------
   GRID DE FOTOS GENÉRICO (usado por activos e implementaciones)
   Las imágenes viven en memoria como dataUrl hasta el momento
   de guardar; ahí se suben una por una a su propia clave de
   almacenamiento para no exceder el límite de tamaño por clave.
--------------------------------------------------------- */
