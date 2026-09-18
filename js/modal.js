/* ---------------------------------------------------------
   MODAL PROPIO -- reemplaza confirm()/prompt()/alert() del
   navegador, que se ven ajenos al resto de la app (y en iOS con la
   app instalada rompen la sensación de "app"). Todo devuelve una
   promesa; hay un solo modal a la vez.

     await confirmar('¿Cerrar sesión?', {aceptar:'Cerrar sesión'})  -> true/false
     await pedirTexto('Nombre', {titulo, placeholder, aceptar})     -> texto | null
     await mostrarModal({...})                                       -> {ok, texto, opcion}
--------------------------------------------------------- */
let _modalAbierto = null;

// config: titulo, mensaje, campo:{placeholder, valor}, opciones:[{valor, texto, detalle}],
// opcionInicial, aceptar, cancelar (null = sin botón), peligro (botón rojo),
// descartable (default true: Escape / tocar el fondo equivale a cancelar).
function mostrarModal(config){
  if(_modalAbierto) _modalAbierto.cerrar({ok:false});
  return new Promise((resolve) => {
    const c = Object.assign({aceptar:'Aceptar', cancelar:'Cancelar', descartable:true}, config);
    const activoAntes = document.activeElement;
    const fondo = document.createElement('div');
    fondo.className = 'modal-backdrop';

    const opcionesHtml = c.opciones ? `<div class="modal-opciones" role="radiogroup">${c.opciones.map(o => `
      <label class="modal-opcion${o.valor === c.opcionInicial ? ' on' : ''}">
        <input type="radio" name="modalOpcion" value="${escapeHtml(o.valor)}" ${o.valor === c.opcionInicial ? 'checked' : ''}>
        <span><b>${escapeHtml(o.texto)}</b>${o.detalle ? '<small>'+escapeHtml(o.detalle)+'</small>' : ''}</span>
      </label>`).join('')}</div>` : '';

    fondo.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true"${c.titulo ? ' aria-labelledby="modalTitulo"' : ''}>
        ${c.titulo ? `<h3 id="modalTitulo">${escapeHtml(c.titulo)}</h3>` : ''}
        ${c.mensaje ? `<p>${escapeHtml(c.mensaje)}</p>` : ''}
        ${c.campo ? `<input type="text" class="modal-campo" placeholder="${escapeHtml(c.campo.placeholder||'')}" value="${escapeHtml(c.campo.valor||'')}" autocomplete="off">` : ''}
        ${opcionesHtml}
        <div class="modal-botones">
          ${c.cancelar ? `<button type="button" class="btn btn-ghost modal-cancelar">${escapeHtml(c.cancelar)}</button>` : ''}
          <button type="button" class="btn ${c.peligro ? 'btn-danger' : 'btn-primary'} modal-aceptar">${escapeHtml(c.aceptar)}</button>
        </div>
      </div>`;
    document.body.appendChild(fondo);

    const campo = fondo.querySelector('.modal-campo');
    const leer = () => {
      const marcada = fondo.querySelector('input[name=modalOpcion]:checked');
      return {
        texto: campo ? campo.value.trim() : undefined,
        opcion: marcada ? marcada.value : c.opcionInicial
      };
    };
    function cerrar(resultado){
      document.removeEventListener('keydown', onKey);
      fondo.remove();
      _modalAbierto = null;
      if(activoAntes && activoAntes.focus) activoAntes.focus();
      resolve(resultado);
    }
    function aceptar(){
      if(campo && !campo.value.trim()){ campo.classList.add('input-invalid'); campo.focus(); return; }
      cerrar(Object.assign({ok:true}, leer()));
    }
    function onKey(e){
      if(e.key === 'Escape' && c.cancelar && c.descartable) cerrar({ok:false});
      if(e.key === 'Enter' && campo && document.activeElement === campo) aceptar();
    }

    fondo.querySelector('.modal-aceptar').onclick = aceptar;
    const btnCancelar = fondo.querySelector('.modal-cancelar');
    if(btnCancelar) btnCancelar.onclick = () => cerrar({ok:false});
    fondo.addEventListener('click', (e) => { if(e.target === fondo && c.cancelar && c.descartable) cerrar({ok:false}); });
    fondo.querySelectorAll('.modal-opcion input').forEach(inp => inp.addEventListener('change', () => {
      fondo.querySelectorAll('.modal-opcion').forEach(l => l.classList.toggle('on', l.contains(inp)));
    }));
    if(campo){
      campo.addEventListener('input', () => campo.classList.remove('input-invalid'));
      setTimeout(() => campo.focus(), 30);
    } else {
      setTimeout(() => fondo.querySelector('.modal-aceptar').focus(), 30);
    }
    document.addEventListener('keydown', onKey);
    _modalAbierto = {cerrar};
  });
}

async function confirmar(mensaje, opts){
  const r = await mostrarModal(Object.assign({mensaje}, opts || {}));
  return !!r.ok;
}

async function pedirTexto(mensaje, opts){
  const o = opts || {};
  const r = await mostrarModal(Object.assign({mensaje, campo:{placeholder:o.placeholder, valor:o.valor}}, o));
  return r.ok ? r.texto : null;
}
