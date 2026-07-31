/* ---------------------------------------------------------
   CONFIGURACIÓN DE SUPABASE — pega aquí los datos de tu proyecto
   (Supabase → Project Settings → API). El "anon public key" es
   seguro de exponer en el navegador: la seguridad real la dan las
   políticas RLS que corriste en el SQL, no el secreto de esta llave.
   NUNCA uses aquí la "service_role key".
--------------------------------------------------------- */
const SUPABASE_URL = 'PEGA_AQUI_TU_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'PEGA_AQUI_TU_SUPABASE_ANON_KEY';
const supabaseClient = (SUPABASE_URL.startsWith('http'))
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

let currentUser = null;
let currentProfile = null;
/* ---------------------------------------------------------
   CONFIGURACIÓN
--------------------------------------------------------- */
const CAT_ACTIVO = ['Panorámica','Frontal','Lateral izquierda','Lateral derecha','Serial','Entorno','Detalle'];
const CAT_ANTES = ['Vista general','Detalle','Conexiones'];
const CAT_DESPUES = ['Vista general','Detalle','Pruebas','Validación final'];
const CRITICIDADES = ['Baja','Media','Alta','Crítica'];
const DEFAULT_TIPOS_ACTIVO = ['Switch','Router','Servidor','UPS','Aire acondicionado','Tablero eléctrico','Rack','Gabinete','Cableado estructurado','Cámara de seguridad','Otro'];

// Base de datos de protocolos industriales/OT más conocidos.
// ethernet:true = corre sobre Ethernet y admite IP/MAC.
// ethernet:false = serial/fieldbus, no aplica IP/MAC.
const DEFAULT_PROTOCOLOS = [
  {nombre:'Modbus TCP', ethernet:true},
  {nombre:'EtherNet/IP', ethernet:true},
  {nombre:'PROFINET', ethernet:true},
  {nombre:'DNP3 (TCP/IP)', ethernet:true},
  {nombre:'IEC 61850 (GOOSE/MMS)', ethernet:true},
  {nombre:'IEC 104 (60870-5-104)', ethernet:true},
  {nombre:'BACnet/IP', ethernet:true},
  {nombre:'OPC UA', ethernet:true},
  {nombre:'SNMP', ethernet:true},
  {nombre:'HTTP/HTTPS', ethernet:true},
  {nombre:'FTP/SFTP', ethernet:true},
  {nombre:'Modbus RTU', ethernet:false},
  {nombre:'Modbus ASCII', ethernet:false},
  {nombre:'PROFIBUS DP', ethernet:false},
  {nombre:'PROFIBUS PA', ethernet:false},
  {nombre:'HART', ethernet:false},
  {nombre:'Foundation Fieldbus', ethernet:false},
  {nombre:'DNP3 (Serial)', ethernet:false},
  {nombre:'IEC 101 (60870-5-101)', ethernet:false},
  {nombre:'CAN bus', ethernet:false},
  {nombre:'DeviceNet', ethernet:false},
  {nombre:'AS-Interface (AS-i)', ethernet:false},
  {nombre:'BACnet MS/TP', ethernet:false},
  {nombre:'M-Bus', ethernet:false},
  {nombre:'RS-232', ethernet:false},
  {nombre:'RS-485', ethernet:false},
  {nombre:'Otro', ethernet:false},
];

const TIPO_LABEL = {
  activos: 'Levantamiento de activos',
  implementacion: 'Implementación antes/después',
  inspeccion: 'Inspección de rack/tablero/datacenter'
};
const TIPO_BADGE = { activos:'Activos', implementacion:'Antes/Después', inspeccion:'Inspección' };

const CHECKLIST_DEF = [
  {grupo:'Físico y organización', items:[
    'Estado físico general','Orden y limpieza','Identificación y etiquetado',
    'Organización del cableado','Estado de bandejas y organizadores','Disponibilidad de espacio',
  ]},
  {grupo:'Eléctrico y ambiental', items:[
    'Separación entre energía y datos','Ventilación','Temperatura observable o registrada',
    'Puesta a tierra','Protección eléctrica',
  ]},
  {grupo:'Seguridad y acceso', items:[
    'Seguridad física','Control de acceso','Accesibilidad','Riesgos visibles',
  ]},
];

/* ---------------------------------------------------------
   ALMACENAMIENTO — usa el storage de Claude cuando está
   disponible (vista previa / enlace compartido de claude.ai).
   Si la app se abre como archivo independiente (agregada a la
   pantalla de inicio desde el navegador), no existe esa API,
   así que se guarda igual usando localStorage del navegador.
   Así el guardado funciona en ambos escenarios.
--------------------------------------------------------- */
const NS = 'fieldsight_v1__';
const cloudStorage = (typeof window.storage !== 'undefined') ? window.storage : null;
