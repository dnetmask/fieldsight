# FieldSight — Documento de Requisitos de Producto (PRD)

> Convertido automáticamente desde `FieldSight_PRD.docx` para que quede
> accesible como texto plano en el repositorio. El documento original en
> Word conserva el formato completo (portada, tabla de contenido con
> números de página, colores de marca) y sigue siendo la versión de
> referencia para compartir fuera del código.

---

FIELDSIGHT

Plataforma móvil de inspección y levantamiento técnico en campo

Documento de requisitos de producto (PRD)

Telecomunicaciones · Industria · Racks, tableros y datacenters

2 de julio de 2026


## Contenido


## 1. Nombre del producto

FieldSight — plataforma móvil Android para inspección técnica, levantamiento de activos y validación de implementaciones en campo, con generación automática de informes en Word y Excel.

Tagline sugerido:

"Lo que el técnico ve en el sitio, queda documentado al instante."


## 2. Resumen ejecutivo

FieldSight es una aplicación móvil para Android, dirigida a técnicos e ingenieros de campo que trabajan en proyectos de telecomunicaciones y en entornos industriales. Permite registrar visitas técnicas, levantar información estructurada de activos, documentar implementaciones de equipos con validación "antes y después", e inspeccionar racks, tableros eléctricos, salas técnicas y datacenters mediante checklists configurables.

Toda la información se captura con evidencia fotográfica y georreferenciación desde el propio dispositivo, funciona de forma robusta con conectividad limitada o nula, y sincroniza los datos de forma diferida cuando el técnico recupera señal. A partir de la información capturada, la plataforma genera automáticamente informes profesionales en Word y Excel, con el logotipo corporativo del cliente incorporado como marca de agua.

El diseño está optimizado para teléfonos Android de gama media: formularios livianos, fotografías comprimidas automáticamente, poco consumo de batería y datos, y una interfaz pensada para usarse con guantes, bajo sol directo y con una sola mano cuando sea necesario.


## 3. Objetivos del sistema

Estandarizar la forma en que los técnicos capturan información en campo, sin depender de formatos sueltos en papel, Excel o WhatsApp.

Reducir drásticamente el tiempo entre la visita técnica y la entrega del informe final al cliente o al área interna.

Garantizar trazabilidad y evidencia verificable (foto + georreferenciación + usuario + fecha/hora) de cada hallazgo o activo registrado.

Permitir operación 100% funcional sin conexión a internet, con sincronización automática y segura cuando haya señal disponible.

Generar informes con apariencia profesional y consistente, listos para entregar a clientes, sin trabajo manual de edición.

Centralizar el histórico de activos, inspecciones e implementaciones para consulta, auditoría y análisis posterior.

Ofrecer un modelo de permisos por rol que separe la captura en campo (técnico) de la revisión y aprobación (supervisor) y de la configuración (administrador).


## 4. Alcance funcional

El alcance funcional se organiza en ocho módulos. La solución es agnóstica al tipo de estructura física del sitio: cubre activos, racks, tableros y datacenters tanto de telecomunicaciones como de entornos industriales, sin formularios ni campos exclusivos para torres.


| Módulo | Propósito |
| --- | --- |
| A. Proyectos, clientes, sedes y visitas | Organiza el trabajo de campo en visitas técnicas clasificadas y asociadas a cliente/sede. |
| B. Implementación antes/después | Documenta instalaciones e intervenciones con evidencia comparativa y checklist de validación. |
| C. Levantamiento de activos industriales | Captura estructurada de activos: identificación, ubicación funcional y evidencia fotográfica por tipo. |
| D. Inspección de racks, tableros y datacenters | Checklists configurables de condición física, eléctrica y de seguridad, con criticidad y hallazgos. |
| E. Captura y gestión de fotografías | Cámara integrada, compresión automática, metadatos y organización por categoría. |
| F. Georreferenciación | Captura de coordenadas GPS por visita, activo y evidencia, con soporte offline. |
| G. Informes Word/Excel | Generación automática de informes con marca de agua corporativa y múltiples plantillas. |
| H. Administración y parametrización | Consola para catálogos, plantillas, usuarios, permisos y campos obligatorios. |



## 5. Roles y permisos


| Rol | Acceso / alcance | Acciones permitidas | Restricciones |
| --- | --- | --- | --- |
| Administrador | Total, todos los proyectos | Configurar catálogos, plantillas, usuarios, permisos y logo corporativo; ver todo el histórico | No captura información de campo habitualmente |
| Supervisor / coordinador | Proyectos y sedes a su cargo | Revisar, aprobar/rechazar visitas, exportar informes, reasignar técnicos, ver hallazgos críticos | No configura catálogos globales del sistema |
| Técnico de campo | Sus visitas asignadas o creadas | Crear visitas, levantar activos, capturar fotos y GPS, diligenciar checklists, firmar y enviar a sincronización | No aprueba ni edita visitas ya cerradas por un supervisor |
| Consultor / auditor técnico | Lectura ampliada + anotaciones | Consultar histórico completo, dejar observaciones de auditoría, exportar informes | No modifica datos originales de campo |
| Usuario de solo lectura / aprobador | Lectura de informes finales | Ver y descargar informes ya generados | Sin acceso a edición ni a módulos de captura |



## 6. Módulos


### 6.1 Proyectos, clientes, sedes y visitas técnicas

Permite crear proyectos, asociarlos a un cliente y a una o varias sedes/ubicaciones, y generar visitas u órdenes de trabajo dentro de cada proyecto.

Cada visita registra:

Código único autogenerado.

Cliente, sede/ubicación y proyecto asociado.

Técnico responsable, fecha y hora de inicio/cierre.

Tipo de actividad: levantamiento de activos, implementación de equipos, validación antes/después, inspección de rack, inspección de tablero, inspección de datacenter, auditoría técnica, levantamiento industrial.

Estado: pendiente, en curso, completada, sincronizada, anulada.

Georreferenciación del sitio, observaciones generales y evidencias asociadas.


### 6.2 Implementación de equipos nuevos — validación antes/después

Documenta instalaciones e intervenciones técnicas comparando el estado inicial y el estado final de un equipo o instalación.

Datos de la intervención:

Tipo de implementación, descripción de la actividad, técnico ejecutor, fecha y hora.

Estado inicial y estado final (texto + selección estructurada).

Checklist de validación de la instalación.

Conformidad / no conformidad, hallazgos y acciones recomendadas.

Datos del equipo intervenido:

Nombre, tipo, marca, modelo y serial del equipo.

Ubicación, rack/gabinete/tablero asociado, área y proceso.

Observaciones técnicas.

Categorías de evidencia fotográfica antes/después:

Vista general antes · Detalle antes · Conexiones antes.

Montaje · Energización · Pruebas.

Vista general después · Detalle después · Validación final.

El informe generado presenta las fotos "antes" y "después" en formato comparativo lado a lado.


### 6.3 Levantamiento de activos industriales

Módulo orientado a levantamientos rápidos y trazables de activos, minimizando el tiempo operativo del técnico en sitio.

Campos base por activo:

Área, proceso y máquina asociada.

Ubicación específica y nombre del activo.

Tipo de activo, marca, modelo, serial y tag/identificador.

Tablero, rack o gabinete donde está instalado.

Descripción funcional, estado del activo y observaciones.

Evidencia fotográfica estructurada por activo:

Foto panorámica del tablero o rack.

Foto lateral derecha y foto lateral izquierda.

Foto frontal, foto de serial, foto de modelo.

Foto del entorno y foto de detalle técnico.

Cada fotografía queda vinculada al activo correspondiente y clasificada por tipo de evidencia, de forma automática según el botón que el técnico presiona en el formulario.


### 6.4 Inspección de racks, tableros y datacenters

Sección específica para validar condiciones técnicas de racks de comunicaciones, tableros eléctricos o de control, salas técnicas, datacenters y cuartos de equipos, mediante checklists configurables desde el módulo de administración.

Puntos de verificación mínimos:

Estado físico general; orden y limpieza; identificación y etiquetado.

Organización del cableado; separación entre energía y datos.

Estado de bandejas y organizadores; disponibilidad de espacio; ventilación.

Temperatura observable o registrada; puesta a tierra; protección eléctrica.

Seguridad física; control de acceso; accesibilidad; riesgos visibles.

Cada ítem se marca como Conforme, No conforme o No aplica, admite observación y foto individual, y se le asigna una criticidad (baja, media, alta, crítica). El sistema genera automáticamente un resumen de hallazgos y no conformidades al cierre de la inspección.


### 6.5 Captura y gestión de fotografías

Captura directa desde la cámara del dispositivo (no se reemplaza por galería salvo que el administrador lo habilite explícitamente).

Compresión automática de imágenes, preservando legibilidad de seriales y etiquetas.

Miniaturas, ampliación de imagen, eliminación y reemplazo de foto antes de guardar.

Etiquetado automático por categoría según el módulo y botón de origen.

Metadatos registrados por foto:

Fecha y hora, usuario, visita/proyecto asociado.

Tipo de evidencia, coordenadas GPS y precisión.

Activo relacionado (si aplica), módulo de origen y comentario opcional.


### 6.6 Georreferenciación

Captura automática de ubicación al abrir la visita, con validación manual si el GPS tarda en resolver.

Registro de latitud, longitud, precisión y fecha/hora de captura.

Georreferenciación opcional, configurable por el administrador, a nivel de activo y de evidencia individual.

Almacenamiento local temporal cuando no hay conectividad, con sincronización posterior sin pérdida de datos.


### 6.7 Informes automáticos en Word y Excel

Ver detalle completo en la sección 14.


### 6.8 Administración, configuración y parametrización

Catálogos de tipos de activo, tipos de visita, tipos de inspección, áreas, procesos y máquinas.

Catálogo de tipos de evidencia y niveles de criticidad.

Plantillas de informe (Word y Excel) por tipo de reporte.

Carga y administración del logotipo corporativo para marca de agua.

Activación/desactivación del uso de galería como fuente de fotos.

Definición de campos obligatorios por tipo de visita.

Gestión de usuarios, roles y permisos.


## 7. Flujo de operación


### 7.1 Técnico de campo

Inicia sesión (con opción de sesión recordada para trabajo offline).

Crea una nueva visita o retoma una visita pendiente/en curso.

Captura la georreferenciación del sitio.

Registra activos, implementación antes/después o checklist de inspección, según el tipo de visita.

Toma fotografías desde la app, clasificadas automáticamente por categoría.

Completa observaciones y firma de cierre.

Guarda la visita localmente; si hay conectividad, se sincroniza en segundo plano; si no, queda en cola de sincronización.


### 7.2 Supervisor / coordinador

Recibe notificación de visitas sincronizadas pendientes de revisión.

Revisa el detalle, los hallazgos críticos y la evidencia fotográfica.

Aprueba, solicita corrección al técnico, o marca la visita como cerrada.

Genera y descarga el informe en Word y/o Excel para entrega al cliente.


### 7.3 Administrador

Configura catálogos, plantillas de informe y logotipo corporativo antes de la puesta en marcha.

Crea usuarios y asigna roles y permisos.

Da mantenimiento continuo a catálogos según necesidades de nuevos proyectos.

Consulta el log de auditoría cuando sea necesario.


## 8. Diseño de pantallas

Jerarquía de navegación propuesta (técnico de campo, rol principal de uso diario):

Login → Inicio (Dashboard) → [Nueva visita | Historial de visitas | Sincronización] → Detalle de visita → [Activos | Antes/Después | Checklist de inspección] → Captura de fotos → Firma → Confirmación de guardado.


| Pantalla | Propósito |
| --- | --- |
| Login | Autenticación y opción de trabajo offline con sesión previamente guardada. |
| Inicio / Dashboard | Accesos rápidos: nueva visita, visitas pendientes, estado de sincronización, alertas. |
| Nueva visita | Formulario corto: proyecto, cliente, sede, tipo de actividad, técnico y fecha (autocompletados donde sea posible). |
| Detalle de visita | Resumen editable de la visita en curso, con acceso a cada bloque (activos, checklist, fotos, firma). |
| Formulario de activo | Captura de campos base del activo y acceso directo a captura de fotos por categoría. |
| Antes / Después | Vista de dos columnas para registrar y comparar evidencia inicial y final de una implementación. |
| Checklist de inspección | Lista de ítems agrupados por bloque, con botones grandes Conforme / No conforme / N/A, foto y observación por ítem. |
| Captura de fotos | Acceso directo a cámara, miniaturas de lo ya tomado, opción de repetir o eliminar. |
| Firma y cierre | Panel de firma táctil, resumen final y botón de guardado. |
| Historial y sincronización | Listado de visitas por estado, con indicador de pendiente/sincronizado y reintento manual. |
| Panel de administración (web o móvil) | Gestión de catálogos, plantillas, usuarios, logotipo y permisos. |


Componentes críticos de UX:

Botones grandes (mínimo 48dp) y de alto contraste, legibles bajo luz solar directa.

Guardado automático por bloque, para no perder información si la app se cierra inesperadamente.

Indicador de avance dentro de cada visita ("3 de 5 secciones completas").

Formularios en progreso recuperables: el técnico puede salir y retomar sin perder datos.

Validaciones visibles en línea, no solo al final del formulario.


## 9. Modelo de datos

Modelo relacional simplificado, pensado para replicarse en una base local (SQLite/Room) y sincronizarse contra una base central (PostgreSQL).


### 9.1 Entidades principales


| Entidad | Campos clave |
| --- | --- |
| Usuario | id, nombre, correo, rol, proyectos_asignados, estado, último_acceso |
| Proyecto | id, nombre, cliente_id, fecha_inicio, estado |
| Cliente / Sede | id, nombre, dirección, coordenadas_referencia |
| Visita | id, código, proyecto_id, sede_id, técnico_id, tipo_actividad, estado, fecha_inicio, fecha_cierre, gps, observaciones |
| Activo | id, visita_id, área, proceso, máquina, nombre, tipo, marca, modelo, serial, tag, ubicación_tablero, estado, observaciones |
| Implementación (antes/después) | id, visita_id, equipo_id, tipo, descripción, estado_inicial, estado_final, conformidad, hallazgos, acción_recomendada |
| ChecklistInspección | id, visita_id, tipo_inspección, ítems[], resumen_no_conformidades |
| ChecklistÍtem | id, checklist_id, texto, estado(conforme/no_conforme/na), criticidad, observación, foto_id |
| Evidencia (Foto) | id, visita_id, activo_id/implementación_id/ítem_id, categoría, url_local, url_remota, gps, fecha_hora, usuario_id |
| PlantillaInforme | id, tipo_reporte, formato(word/excel), estructura_json, logo_id |
| SyncLog | id, entidad, entidad_id, acción, estado, fecha, dispositivo_id |
| AuditLog | id, usuario_id, acción, entidad, entidad_id, fecha, detalle |



### 9.2 Relaciones principales

Un Proyecto tiene muchas Visitas; una Visita pertenece a un Cliente/Sede.

Una Visita tiene muchos Activos, Implementaciones y/o Checklists, según su tipo.

Una Evidencia (foto) siempre pertenece a una Visita, y opcionalmente a un Activo, Implementación o Ítem de checklist.

Un Usuario tiene un Rol, y el Rol determina las acciones disponibles sobre cada entidad.


## 10. Reglas de negocio y validaciones

No se puede cerrar una visita sin al menos una evidencia fotográfica y, cuando el tipo de visita lo exige, sin firma de cierre.

Los campos obligatorios varían según el tipo de visita y se definen desde el módulo de administración; el formulario no permite avanzar de sección si faltan campos obligatorios.

La georreferenciación es obligatoria al abrir la visita; si el GPS no resuelve en un tiempo razonable, se permite continuar y marcar la ubicación como "pendiente de verificación".

Las fotografías se comprimen automáticamente antes de guardarse; existe un tamaño máximo por imagen para no comprometer el rendimiento en equipos de gama media.

El estado de una visita solo puede avanzar en un orden controlado: pendiente → en curso → completada → sincronizada; "anulada" puede aplicarse desde cualquier estado previo a sincronizada, con motivo obligatorio.

Una visita cerrada y sincronizada no puede ser editada por el técnico; solo el supervisor puede solicitar una corrección, lo que la regresa a estado "en curso".

Cada ítem de checklist marcado como "No conforme" con criticidad alta o crítica exige observación obligatoria y al menos una foto.

Los informes exportados quedan versionados: una nueva exportación no sobrescribe la anterior, para mantener trazabilidad histórica.


## 11. Requisitos no funcionales


| Categoría | Requisito |
| --- | --- |
| Rendimiento | Apertura de formularios en menos de 2 segundos en gama media; captura de foto sin bloqueo de interfaz. |
| Disponibilidad offline | 100% de las funciones de captura operan sin conexión; sincronización diferida y reintentos automáticos. |
| Consumo de recursos | Bajo consumo de batería y datos móviles; uso eficiente de almacenamiento mediante compresión de imágenes. |
| Seguridad | Autenticación segura, datos locales cifrados, comunicación por HTTPS/TLS. |
| Usabilidad | Operable con una sola mano en pantallas clave; legible en exteriores; mínimo de pasos por tarea. |
| Estabilidad | Tolerancia a cierres inesperados sin pérdida de información ya guardada por bloque. |
| Mantenibilidad | Arquitectura modular que permita agregar nuevos tipos de checklist o campos sin modificar el core. |
| Escalabilidad | Soporte de crecimiento en número de proyectos, usuarios y volumen de evidencias sin rediseño de base. |
| Compatibilidad | Soporte de versiones de Android ampliamente utilizadas en el parque de dispositivos corporativo (definir versión mínima según inventario real de equipos). |



## 12. Arquitectura técnica recomendada

Arquitectura en capas, con base de datos local como fuente de verdad inmediata en el dispositivo y sincronización asíncrona hacia un backend central.


| Capa | Responsabilidad |
| --- | --- |
| App Android (cliente) | Captura de datos, cámara, GPS, base de datos local, cola de sincronización, generación opcional de vista previa de informe. |
| Base de datos local | Almacena visitas, activos, checklists y referencias a evidencias mientras no hay conectividad o mientras no se confirma sincronización. |
| Servicio de sincronización | Cola de trabajos en segundo plano; sube datos y fotos por lotes; reintentos con backoff progresivo; resuelve conflictos. |
| API backend | Expone endpoints para proyectos, visitas, activos, checklists, usuarios/roles y generación de informes; valida reglas de negocio en servidor. |
| Base de datos central | Almacenamiento relacional persistente de todo el histórico, con índices por proyecto, sede, fecha y usuario. |
| Almacenamiento de objetos | Repositorio de imágenes y de los informes Word/Excel generados, referenciado desde la base de datos central. |
| Motor de generación de informes | Servicio que toma la plantilla configurada y los datos de la visita y produce el Word/Excel final con marca de agua. |
| Consola de administración | Interfaz (web) para catálogos, plantillas, usuarios y logotipo corporativo. |



### 12.1 Patrón de desarrollo móvil

Se recomienda MVVM (Model-View-ViewModel) con inyección de dependencias, separando claramente la lógica de captura de la lógica de sincronización, de forma que cada módulo (activos, checklist, antes/después) pueda evolucionar de forma independiente.


### 12.2 Comparativa de stack tecnológico


| Opción | Costo | Complejidad | Mantenibilidad | Rendimiento en gama media | Escalabilidad |
| --- | --- | --- | --- | --- | --- |
| Android nativo (Kotlin) | Medio | Media | Alta | Muy buena | Alta |
| Flutter (multiplataforma) | Medio-bajo | Media | Alta | Buena | Alta |
| React Native | Medio-bajo | Media-alta | Media | Media | Media-alta |


Recomendación: Kotlin nativo si el uso será exclusivamente Android y el rendimiento en gama media es crítico (mejor control de memoria y cámara). Flutter es una alternativa razonable si en el futuro se planea una versión iOS con un solo equipo de desarrollo.


### 12.3 Tecnologías recomendadas (stack Android nativo)

Lenguaje: Kotlin.

UI: Jetpack Compose con componentes livianos, o Views/XML tradicionales si se prioriza el máximo rendimiento en equipos muy limitados.

Base de datos local: Room (SQLite).

Cámara: CameraX, con compresión con la librería nativa de Bitmap/WebP.

Tareas en segundo plano y sincronización: WorkManager.

Red: Retrofit u Okhttp con soporte de reintentos.

Inyección de dependencias: Hilt.

Backend sugerido: Node.js (NestJS) o .NET, con PostgreSQL como base de datos central.

Almacenamiento de objetos: S3 compatible (AWS S3 o MinIO autoalojado).

Generación de Word/Excel: librerías del lado del servidor (por ejemplo, docx y exceljs en Node.js) a partir de la plantilla configurada.


## 13. Estrategia offline/online

Local-first: toda la captura ocurre contra la base de datos local; la app nunca bloquea al técnico por falta de conectividad.

Cola de sincronización: cada visita, activo, checklist o foto pendiente de subir queda registrado en una cola con estado (pendiente, en progreso, sincronizado, error).

Sincronización en segundo plano mediante WorkManager, con reintento automático y backoff progresivo cuando falla la subida.

Sincronización por lotes: primero los datos estructurados (texto), luego las imágenes, para que el registro exista en servidor aunque las fotos tarden más en subir por su tamaño.

Resolución de conflictos: cada registro de campo pertenece a un único técnico/dispositivo mientras no está cerrado, por lo que el modelo evita ediciones concurrentes; los catálogos administrados por el backoffice se sincronizan de servidor hacia el dispositivo (no al revés) para evitar conflictos.

Indicador visible en la app del estado de sincronización general y por visita, con opción de reintento manual.

Cifrado de la base de datos local para proteger la información mientras permanece en el dispositivo.


## 14. Informes Excel y Word

La plataforma debe soportar al menos ocho tipos de informe: por visita, por activo, de implementación, de antes/después, de inspección, de hallazgos, resumen ejecutivo y detallado técnico. Todos parten de una plantilla base configurable desde el módulo de administración.


### 14.1 Estructura del informe Word

Portada: logotipo del cliente/empresa, nombre del proyecto, sede, técnico responsable, fecha y tipo de informe.

Datos generales de la visita: proyecto, cliente, sede, georreferenciación, técnico y fecha.

Resumen ejecutivo: hallazgos principales y estado general en pocas líneas.

Detalle de activos levantados, en tablas con sus campos clave.

Checklist de inspección, con resultado (conforme/no conforme/N/A) y criticidad por ítem.

Hallazgos y no conformidades, agrupados por criticidad.

Evidencias fotográficas, organizadas por categoría, con leyenda y coordenadas.

Comparativo antes/después, en tablas de dos columnas.

Conclusiones y recomendaciones.

Firmas o validación final, cuando aplique.

Marca de agua: el logotipo corporativo se inserta en el fondo de cada página, con baja opacidad, sin interferir con la lectura del contenido.


### 14.2 Estructura del informe Excel


| Hoja | Contenido |
| --- | --- |
| Resumen | Datos generales de la visita, indicadores clave (n.º de activos, n.º de no conformidades, criticidades). |
| Activos | Una fila por activo levantado, con todas las columnas del formulario de activo. |
| Checklist | Una fila por ítem de inspección, con estado, criticidad y observación. |
| Hallazgos | Listado consolidado de no conformidades, ordenado por criticidad. |
| Evidencias | Índice de fotografías con su categoría, activo relacionado y enlace/nombre de archivo. |


El logotipo corporativo se incorpora en el encabezado de cada hoja y, opcionalmente, como marca de agua de baja opacidad en la hoja de Resumen.


### 14.3 Lógica de la marca de agua

El logotipo se carga una única vez desde el módulo de administración y queda asociado a la plantilla del cliente/proyecto.

En Word, se inserta como imagen de fondo en el encabezado de página, con opacidad reducida y posición centrada.

En Excel, se inserta como imagen fija en el encabezado de impresión de cada hoja.

El motor de generación de informes reutiliza la misma plantilla para todos los tipos de reporte de un mismo cliente, garantizando consistencia visual.


## 15. Seguridad y trazabilidad

Autenticación de usuarios mediante usuario/clave con token de sesión; opción de sesión offline con expiración controlada.

Autorización basada en roles, validada tanto en la app como en el backend (nunca confiar solo en la restricción de interfaz).

Registro de auditoría (AuditLog) de acciones sensibles: creación, edición, eliminación, exportación y sincronización de visitas.

Cifrado de la base de datos local del dispositivo y comunicación exclusivamente por HTTPS/TLS con el backend.

Copias de respaldo periódicas de la base de datos central y del almacenamiento de evidencias.

Posibilidad de revocar el acceso de un usuario o dispositivo de forma inmediata desde el módulo de administración.


## 16. Historias de usuario


| Rol | Historia | Criterio de aceptación (resumen) | Prioridad |
| --- | --- | --- | --- |
| Técnico | Quiero crear una visita para registrar una inspección | La visita queda creada con código único, estado "pendiente" y datos generales completos | Alta |
| Técnico | Quiero capturar fotos del antes y del después de una implementación | Cada foto queda clasificada como "antes" o "después" y vinculada al equipo intervenido | Alta |
| Técnico | Quiero registrar área, proceso y máquina de un activo | El activo no se puede guardar si estos campos son obligatorios y están vacíos | Alta |
| Técnico | Quiero georreferenciar el sitio automáticamente | Las coordenadas y la precisión quedan asociadas a la visita sin intervención manual | Alta |
| Técnico | Quiero diligenciar un checklist de inspección de rack/tablero | Cada ítem admite conforme/no conforme/N-A, observación y foto | Alta |
| Técnico | Quiero seguir trabajando sin conexión a internet | Toda la captura funciona igual sin señal; los datos quedan en cola de sincronización | Alta |
| Técnico | Quiero firmar el cierre de la visita | La visita no puede pasar a "completada" sin firma cuando el tipo de visita lo exige | Media |
| Supervisor | Quiero revisar los hallazgos críticos de una visita | Puedo filtrar por criticidad y ver evidencia asociada antes de aprobar | Alta |
| Supervisor | Quiero exportar un informe en Word o Excel | El informe se genera con la plantilla y logotipo del cliente sin edición manual | Alta |
| Supervisor | Quiero solicitar corrección de una visita al técnico | La visita regresa a estado "en curso" con un motivo visible para el técnico | Media |
| Administrador | Quiero configurar catálogos y plantillas de informe | Los cambios se reflejan en la app de los técnicos en la siguiente sincronización | Alta |
| Administrador | Quiero cargar el logotipo corporativo | El logotipo aparece como marca de agua en los informes generados a partir de ese momento | Media |
| Administrador | Quiero gestionar usuarios y permisos | Puedo crear, editar o revocar el acceso de un usuario y su rol | Alta |
| Auditor | Quiero consultar el histórico completo de un sitio | Puedo ver todas las visitas anteriores asociadas a una sede, con sus informes | Media |



## 17. Criterios de aceptación

Creación de visita: no permite avanzar sin cliente/sede, tipo de actividad y técnico responsable; genera código único.

Captura de activos: valida campos obligatorios definidos por el administrador antes de permitir guardar el activo.

Carga de fotos: toda foto capturada queda comprimida, clasificada por categoría y con metadatos completos (fecha, usuario, GPS).

Validación antes/después: no permite marcar una implementación como "finalizada" sin al menos una foto "antes" y una "después".

Checklist de racks/tableros/datacenters: exige observación y foto en todo ítem marcado como no conforme con criticidad alta o crítica.

Georreferenciación: registra coordenadas automáticamente al abrir la visita; permite marcarlas como "pendientes de verificación" si el GPS no resuelve a tiempo, sin bloquear el flujo.

Trabajo offline: ninguna función de captura requiere conexión; los datos y fotos quedan almacenados localmente sin pérdida.

Sincronización: los datos pendientes se suben automáticamente al recuperar conectividad, con reintento visible ante error, sin duplicar registros.

Exportación de informes: el Word y/o Excel generado incluye todas las secciones definidas en la plantilla y refleja fielmente los datos capturados.

Marca de agua: el logotipo aparece en todas las páginas del Word y en el encabezado de cada hoja del Excel, sin afectar la legibilidad del contenido.


## 18. Roadmap por fases


### MVP (Fase 1)

Módulo de visitas (creación, estados, georreferenciación).

Levantamiento de activos con evidencia fotográfica.

Checklist de inspección de racks/tableros/datacenters.

Captura y compresión de fotos con metadatos.

Trabajo offline con sincronización básica.

Generación de informe Word con plantilla única y logotipo.

Roles: administrador y técnico de campo.


### Fase 2

Módulo de implementación antes/después con vista comparativa.

Generación de informe Excel.

Rol de supervisor con flujo de aprobación/rechazo.

Firma de cierre de visita.

Panel de administración web para catálogos y plantillas.

Múltiples plantillas de informe por tipo de reporte.


### Fase 3

Rol de auditor/consultor con anotaciones sobre histórico.

Dashboard de indicadores (no conformidades por sede, tiempos de cierre, etc.).

Notificaciones push para visitas pendientes de revisión.

Exportación masiva de informes por proyecto o periodo.

Evaluación de expansión a iOS o versión web para captura ligera.


## 19. Riesgos y mitigaciones


| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| Pérdida de fotos por falta de espacio en el dispositivo | Alto | Compresión automática, alerta de espacio disponible y priorización de sincronización antes de liberar caché. |
| Conflictos de datos por edición fuera de línea prolongada | Medio | Modelo de propiedad única del registro por técnico/dispositivo mientras no está cerrado; catálogos de solo lectura en el dispositivo. |
| Baja adopción por parte de técnicos poco familiarizados con apps | Medio | UX simplificada, capacitación breve, formularios cortos y guardado automático. |
| Rendimiento deficiente en equipos muy limitados | Alto | Pruebas obligatorias en dispositivos de gama media reales antes de cada release; límites de tamaño de imagen y caché. |
| Informes inconsistentes entre clientes/proyectos | Medio | Plantillas centralizadas y versionadas desde administración, no editables por el técnico. |
| Fallas de sincronización silenciosas | Alto | Indicador visible de estado de sincronización y alerta si una visita lleva más de X horas sin sincronizar. |
| Uso indebido o pérdida de dispositivo con datos sensibles | Medio | Cifrado local, expiración de sesión offline y revocación remota de acceso. |



## 20. Recomendaciones finales


### 20.1 Rendimiento en Android de gama media

Reducir el tamaño de instalación separando módulos poco usados (App Bundle / modularización).

Comprimir imágenes antes de guardarlas localmente (no después), para no consumir almacenamiento innecesario.

Cargar los formularios de forma perezosa (lazy loading) por sección, no todo el flujo de la visita de una sola vez.

Usar Room con índices adecuados para que las consultas del historial no bloqueen la interfaz.

Delegar toda subida de archivos a WorkManager, nunca en el hilo principal.

Evitar animaciones costosas; priorizar transiciones simples y consistentes.

Aplicar shrinking y ofuscación (R8/ProGuard) para reducir el tamaño del APK final.

Probar cada versión en al menos un dispositivo real de gama media antes de publicar.


### 20.2 Despliegue e instalación sencilla en Android

Para una app de uso interno, distribuir inicialmente por Firebase App Distribution o un MDM corporativo, evitando la fricción de publicar en Google Play mientras el producto madura.

Generar un APK firmado con instrucciones simples de instalación ("permitir instalación de fuentes desconocidas") para equipos que no estén bajo MDM.

Definir una estrategia clara de versionado (número de versión visible en el login) para que soporte técnico identifique rápido la versión instalada.

Considerar actualización silenciosa de catálogos y plantillas sin requerir actualizar el APK completo, para reducir fricción de mantenimiento.


### 20.3 Recomendación general

Iniciar con el MVP definido en la sección 18, validarlo con un grupo reducido de técnicos en campo real durante 2-4 semanas, y usar esos resultados para ajustar formularios, checklists y plantillas de informe antes de escalar a más usuarios y a las fases 2 y 3.