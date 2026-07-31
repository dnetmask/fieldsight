# FieldSight

Plataforma web (PWA) de inspección y levantamiento técnico en campo —
construida para **Netmask S.A.S.** (Envigado, Colombia).

Permite a técnicos e ingenieros registrar visitas de campo: levantamiento
de activos (con protocolos OT/IP/MAC), implementaciones con validación
antes/después, e inspecciones de racks/tableros/datacenters — con fotos,
GPS, firma digital, y exportación de informes a Word, Excel, PDF y ZIP.

📄 Documento de producto completo: [`docs/PRD.md`](docs/PRD.md)
🤖 Contexto para trabajar con Claude Code: [`CLAUDE.md`](CLAUDE.md)

## Estructura del proyecto

```
fieldsight/
├── index.html              # markup (sin lógica)
├── css/styles.css          # estilos
├── js/                     # lógica, un archivo por responsabilidad
│   ├── config.js           # constantes + llaves de Supabase
│   ├── storage.js          # capa de almacenamiento heredada (sin uso activo)
│   ├── auth.js              # login / registro
│   ├── catalogos.js         # tipos de activo / protocolos (editables)
│   ├── activos.js, implementaciones.js, checklist.js
│   ├── guardar.js, historial.js, detalle.js
│   ├── export-word.js, export-excel.js, export-zip.js
│   └── ...
├── manifest.json, sw.js, icons/   # PWA (instalable, funciona offline la UI)
├── supabase/schema.sql      # esquema de base de datos + políticas RLS
├── deploy/
│   ├── azure/               # Azure App Service (Windows o Linux)
│   └── netlify/             # Netlify Drop
└── docs/
    ├── PRD.md               # documento de producto (texto plano)
    └── FieldSight_PRD.docx  # versión formateada del PRD
```

## Puesta en marcha rápida

1. **Crear el backend (Supabase)**
   - Cuenta gratis en [supabase.com](https://supabase.com) → *New project*.
   - SQL Editor → pega y ejecuta `supabase/schema.sql`.
   - Authentication → Providers → Email → desactiva "Confirm email" si
     quieres que los usuarios entren sin confirmar correo (uso interno).
   - Project Settings → API → copia **Project URL** y **anon public key**.

2. **Configurar la app**
   - Edita `js/config.js` y pega esos dos valores en `SUPABASE_URL` /
     `SUPABASE_ANON_KEY`.

3. **Probar localmente**
   - Sirve la carpeta con cualquier servidor estático, por ejemplo:
     ```
     npx serve fieldsight
     ```
     (Abrir `index.html` con doble clic *no* funciona bien para la PWA —
     el manifest y el service worker necesitan `http://`, no `file://`.)

4. **Publicar**
   - Ver `deploy/azure/LEEME-AZURE.md` o `deploy/netlify/LEEME.md` según
     dónde se vaya a alojar.
   - Después de publicar, agrega la URL final en Supabase →
     Authentication → URL Configuration → Redirect URLs.

## Primer usuario administrador

Cualquiera que se registre desde la app queda con rol `tecnico`. Para
convertir al primero en administrador: Supabase → Table Editor →
`profiles` → edita su fila → cambia `rol` a `administrador`.

## Estado del proyecto

Versión web validada con usuarios reales en campo. La visión de producto
completa (incluyendo una futura app nativa Android) está en
[`docs/PRD.md`](docs/PRD.md). Antes de cambios arquitectónicos grandes, lee
[`CLAUDE.md`](CLAUDE.md).
