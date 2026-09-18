# CLAUDE.md

Contexto para Claude Code al trabajar en este repositorio. Léelo antes de
hacer cambios estructurales (dividir/unir archivos, cambiar el patrón de
carga de scripts, migrar a un framework, etc.).

## Qué es esto

FieldSight: app web (PWA) para que técnicos e ingenieros de campo de
**Netmask S.A.S.** (Envigado, Colombia — partner Cisco/Meraki/Fortinet)
levanten activos, documenten implementaciones "antes/después" e inspeccionen
racks/tableros/datacenters, con evidencia fotográfica y georreferenciación,
y exporten informes a Word/Excel/PDF.

El documento de producto completo está en `docs/PRD.md` (convertido desde
el PRD original en Word). Ese documento describe una visión a más largo
plazo de app nativa Android — **esta base de código es la versión web/PWA
que se está usando para validar el producto con usuarios reales primero**.
Si una tarea no aclara si es para esta versión web o para arrancar la
nativa, pregunta antes de asumir.

## Arquitectura (importante, no romper)

- **Sin build step, sin bundler, sin framework.** HTML + CSS + JS vanilla,
  cargados directo por el navegador. Es intencional: la app se ha venido
  desplegando como hosting estático puro (Netlify, Azure App Service) y
  editando/probando directamente en el navegador sin paso de compilación.
- **`js/*.js` son scripts clásicos, no módulos ES.** Se cargan en
  `index.html` vía múltiples `<script src="js/archivo.js"></script>` en un
  orden específico (ver la lista en `index.html`, cerca del cierre de
  `<body>`). Todas las funciones de nivel superior quedan **globales a
  propósito**: el HTML se genera con template strings que incluyen
  `onclick="nombreFuncion(...)"` inline, y esos atributos solo encuentran
  la función si vive en `window`. **Si conviertes esto a módulos ES
  (`import`/`export`), esos `onclick` inline se rompen silenciosamente** a
  menos que expongas cada función usada así en `window` explícitamente.
- **El orden de los `<script>` no es estrictamente necesario para que
  funcione** (todo corre después de `DOMContentLoaded`, así que el orden de
  *ejecución* de las declaraciones no importa), pero sí ayuda a la
  legibilidad — mantén el orden lógico si agregas un archivo nuevo
  (config → storage → estado → utilidades → features → exportaciones →
  init).
- **`js/storage.js` (objeto `AppStorage`) es código heredado de una versión
  anterior sin backend** (usaba `window.storage` de Claude o `localStorage`/
  IndexedDB del navegador). Desde que se integró Supabase, el resto de la
  app llama directo a `supabaseClient` (ver `js/auth.js`, `js/guardar.js`,
  `js/historial.js`, `js/detalle.js`). `AppStorage` quedó sin usar — se
  dejó por si se retoma un modo standalone sin backend. Si vas a limpiar
  código muerto, confirma con el usuario antes de borrarlo (puede
  necesitarse otra vez, ya ha ido y venido en este proyecto).

## Configuración necesaria para que la app funcione

En `js/config.js`:
```js
const SUPABASE_URL = 'PEGA_AQUI_TU_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'PEGA_AQUI_TU_SUPABASE_ANON_KEY';
```
Deben reemplazarse con los valores reales de un proyecto de Supabase
(Project Settings → API). El `anon public key` es seguro de exponer en el
navegador — la seguridad real la dan las políticas RLS en
`supabase/schema.sql`, no el secreto de esa llave. **Nunca uses aquí la
`service_role key`.**

## Modelo de datos

Fuente de verdad: `supabase/schema.sql` (ejecutado en el SQL Editor de
Supabase). Resumen:

- `profiles` — nombre y rol (`administrador` / `supervisor` / `tecnico`)
  por usuario, se crea automáticamente al registrarse (trigger).
- `visitas` — una fila por visita de campo. Columnas planas para lo que se
  filtra/lista (`proyecto`, `cliente`, `sede`, `tecnico`, `fecha`, `tipo`,
  `created_by`, `creado_por_nombre`, `created_at`, etc.) + una columna
  `data jsonb` con el resto (`gps`, `activos[]`, `implementaciones[]`,
  `checklist{}`, `observaciones`, `firma`). La función `filaAVisita()` en
  `js/historial.js` reconstruye el objeto plano que el resto del código
  espera — si cambias el esquema, actualiza esa función.
- `catalogo_tipos_activo`, `catalogo_protocolos` — catálogos editables
  compartidos entre usuarios (dropdown "+ Agregar nuevo...").
- Bucket de Storage `fotos` (privado) — cada foto es un objeto binario real,
  referenciado desde `data.activos[].fotos[].key` (o `fotosAntes`/
  `fotosDespues`/`checklist[].fotoKey`) como ruta `visitaId/uid.jpg`.

## Decisiones y trade-offs a tener en cuenta

- **La app requiere conexión (a internet o a la red interna) para
  guardar/leer** (Supabase). Se sacrificó el modo 100% offline de una
  versión anterior a cambio de datos compartidos entre usuarios y login
  real. Si se pide recuperar funcionamiento offline, la solución correcta
  es una cola de sincronización (capturar local, subir cuando vuelve la
  señal) — no volver a `localStorage` puro, que ya causó un bug de cuota
  llena en campo.
- **Supabase auto-hospedado**: Netmask decidió correr Supabase dentro de
  su propia infraestructura (no el Supabase cloud) para tener control
  total de los datos. El paquete de despliegue (copia sin modificar del
  oficial de Supabase, + un override propio de backups) vive en
  `deploy/docker/supabase/` — ver
  `deploy/docker/supabase/LEEME-SUPABASE-SELFHOSTED.md`. Es un stack de
  11 servicios, no un solo contenedor; no editar `docker-compose.yml` ni
  `volumes/` de esa carpeta a mano, son la copia oficial.
- **Exportación a Word (`js/export-word.js`)**: genera un `.docx` real
  (formato OOXML) construido a mano con JSZip, sin librería `docx` externa,
  para no depender de bundlers. Si hay que tocar el formato del documento,
  ojo con las plantillas XML inline (namespaces, relaciones de imágenes).
- **Exportación a Excel (`js/export-excel.js`)**: usa SheetJS (Community).
  No soporta incrustar imágenes reales en el `.xlsx` sin la versión Pro —
  por eso el Excel es solo datos tabulares; las fotos van en Word/PDF/ZIP.
- **Marca**: el logo real de Netmask es `icons/Logo_Netmask_1500x300px.png`
  (login, encabezado, portada del Word) y los íconos de la PWA
  (`icons/icon-*.png`, `favicon-64.png`) son la "N" del logo en blanco
  sobre el azul de marca. Colores: navy `#0A2540`, azul `#0072CE` — la
  variable CSS del azul se llama `--orange` por razones históricas.
- **Diálogos**: usar `confirmar()`, `pedirTexto()` o `mostrarModal()` de
  `js/modal.js`. Nunca `confirm()`/`prompt()`/`alert()` nativos — se ven
  ajenos a la app y en iOS instalada rompen la sensación de "app".
- **Service worker (`sw.js`)**: precachea todo lo propio y las librerías
  de CDN para que la app abra sin señal. **Si agregas un `<script>` a
  `index.html`, agrégalo también a `CORE_ASSETS` y sube `CACHE_NAME`.**
  Nunca debe interceptar `/auth`, `/rest`, `/storage`, etc.: en
  producción la API de Supabase vive en el mismo origen que la app
  (un solo gateway), y cachearla sirve datos viejos y acumula fotos.
- **Historial**: paginado de a 30 con búsqueda y filtros aplicados en el
  servidor; la lista solo pide columnas planas, nunca `data`. Las fotos
  de una visita se descargan con `resolverFotosPorGrupo()` (tope de 5 en
  paralelo, por el rate-limit del gateway).
- **Cambios de esquema**: `supabase/schema.sql` es la fuente de verdad
  para instalaciones nuevas. Para bases que ya existen, agrega además un
  archivo fechado en `supabase/actualizaciones/` con el SQL idempotente
  que hay que correr en Studio.
- **Compresión de fotos** (`js/fotos.js`, función `comprimirFoto`): reduce
  progresivamente la calidad JPEG hasta quedar bajo un tamaño objetivo.
  Si se ajusta, probar con fotos reales de campo (buena luz y mala luz),
  no solo con imágenes de prueba.

## Despliegue

- **Producción real: `deploy/docker/` en una VM de Netmask**, detrás de un
  solo gateway nginx con certificado autofirmado (no hay dominio) que
  enruta por ruta entre la app y Supabase auto-hospedado. Guía paso a
  paso: `deploy/docker/LEEME-MIGRACION-VM-SIN-DOMINIO.md`. `js/config.js`
  se edita en la VM con los valores reales antes de construir la imagen
  (queda horneado dentro) y nunca se commitea con ellos.
- `deploy/azure/` — para Azure App Service (Windows: usa `web.config`;
  Linux/Node: usa `server.js` + `package.json` — nunca ambos a la vez).
  Ver `deploy/azure/LEEME-AZURE.md`.
- `deploy/netlify/` — despliegue estático simple (Netlify Drop). Ver
  `deploy/netlify/LEEME.md`.
- Tras publicar en cualquier dominio nuevo, hay que agregarlo en
  **Supabase → Authentication → URL Configuration → Redirect URLs**, o los
  flujos de confirmación de correo / recuperar contraseña no funcionan.

## Testing

Dos capas, ambas corren en GitHub Actions (`.github/workflows/pruebas.yml`)
en cada push a `main`/`develop` y en cada PR. El `package.json` raíz existe
solo para esto: la app sigue sin build ni dependencias en ejecución.

- **Unitarias** — `npm test` (runner nativo de Node, `tests/unit/*.test.js`,
  sin frameworks). `tests/helpers/sandbox.js` carga los `js/*.js` tal cual
  (scripts clásicos con globales) en un contexto aislado, con dobles de
  `document`, `supabaseClient`, `fetch`, etc. Las funciones quedan como
  `sb.nombre`; los `let/const` de nivel superior se leen con
  `evaluar(sb, 'NOMBRE')`; los arrays/objetos que salen del sandbox se
  comparan con `plano(x)` (otro realm). El `.docx` y el `.xlsx` se generan
  de verdad (JSZip/SheetJS desde npm) y se inspecciona su estructura; el
  service worker se simula con dobles de `caches`/`fetch`.
- **End-to-end** — `npm run test:e2e` (Playwright, Chromium, viewport de
  celular). `tests/servidor-estatico.js` sirve el repo sin caché e inyecta
  la URL de Supabase en `js/config.js`; `tests/e2e/supabase-falso.js`
  responde por Supabase interceptando la red (`page.route`), así que no
  hacen falta Docker ni credenciales. Cubre login, historial (paginación,
  búsqueda, fechas), modal propio, botón de foto, GPS y **abrir la app sin
  red** desde el service worker. La primera vez: `npm install` y
  `npx playwright install chromium`.
- Al agregar una función pura o un flujo nuevo, agrégale su prueba en la
  capa que corresponda; una prueba e2e nueva que necesite datos del
  servidor se resuelve ampliando `supabase-falso.js`, no apuntando a un
  Supabase real.

## Historial

El desarrollo previo de este proyecto ocurrió de forma iterativa en una
conversación de chat con Claude (no en este repositorio de git). Este
commit inicial es una fotografía de ese estado, reorganizada en módulos
para trabajar mejor con Claude Code — no asumas que hay commits anteriores
con contexto adicional.
