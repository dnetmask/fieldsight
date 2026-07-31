/* ---------------------------------------------------------
   ESTADO
--------------------------------------------------------- */
let tipoSel = null; // 'activos' | 'implementacion' | 'inspeccion' | null
let activos = [];
let implementaciones = [];
let checklistState = {};
let gpsActual = null;
let sigDrawing = false;
let currentDetailId = null;
let uidCounter = 0;
let CATALOGO_TIPOS = DEFAULT_TIPOS_ACTIVO.slice();
let CATALOGO_PROTOCOLOS = DEFAULT_PROTOCOLOS.slice();
let editingId = null;
let editingCodigo = null;
let editingCreatedAt = null;
let BTN_GUARDAR_DEFAULT = '';
function newUid(){ return 'u' + (++uidCounter) + '_' + Date.now().toString(36); }

