# FieldSight — Despliegue en Azure App Service

Este paquete trae los archivos de la app **más** los dos posibles adaptadores
de hosting. Usa solo el que corresponda a tu plan y borra el otro antes de
desplegar, para no confundir a quien lo despliegue.

```
index.html            ← la app (no se toca)
manifest.json, sw.js, icons/   ← PWA (no se tocan)
supabase_schema.sql   ← ya lo corriste en Supabase, va de referencia

web.config             ← SOLO si tu App Service es Windows/IIS
server.js, package.json ← SOLO si tu App Service es Linux/Node
```

## 0) Antes de desplegar: confirma con quien administra Azure

Pregunta qué **tipo de plan** (Sistema operativo/Runtime stack) tiene o va a
usar el App Service:

- **Windows** → conserva `web.config`, borra `server.js` y `package.json`.
- **Linux / Node** → conserva `server.js` y `package.json`, borra `web.config`.

## 1) Configurar la llave de Supabase

Ya viene incluida en `index.html` (las líneas `SUPABASE_URL` /
`SUPABASE_ANON_KEY` que configuraste antes). No es una variable de entorno
de Azure — es parte del archivo estático, y eso es intencional: es la llave
"anon public", diseñada para exponerse en el navegador. La seguridad real
la dan las políticas RLS que ya corriste en Supabase, no el secreto de esta
llave.

Si en el futuro cambias de proyecto de Supabase, solo edita esas dos líneas
en `index.html` y vuelve a desplegar.

## 2) Desplegar

La forma más simple sin usar la terminal:

1. En **Azure Portal**, entra a tu App Service.
2. Ve a **Deployment Center** (Centro de implementación).
3. Elige el método que ya usen en Netmask para desplegar (Local Git, GitHub
   Actions, o "Zip Deploy" manual).
4. Si es Zip Deploy manual: comprime el contenido de esta carpeta (los
   archivos, no la carpeta en sí) en un `.zip`, y súbelo desde
   **Advanced Tools (Kudu) → Zip Push Deploy**, o con Azure CLI:
   ```
   az webapp deploy --resource-group <tu-grupo> --name <tu-app> --src-path fieldsight.zip --type zip
   ```

## 3) Después de desplegar

- **Actualiza Supabase**: ve a Supabase → Authentication → URL Configuration
  → agrega `https://tu-app.azurewebsites.net` (o tu dominio propio) a las
  *Redirect URLs*. Sin esto, los correos de confirmación de cuenta o
  "olvidé mi contraseña" no van a funcionar desde ese dominio.
- **Verifica HTTPS**: Azure lo da por defecto en `*.azurewebsites.net`. Si
  usas dominio propio, actívalo en Custom domains + TLS/SSL settings.
- **(Recomendado) Activa "HTTPS Only"**: App Service → Configuration →
  General settings → HTTPS Only = On.
- Abre la URL en el celular de un técnico y confirma que el botón de
  "Instalar app" aparezca y que el login funcione.

## Nota sobre costos

App Service no tiene una capa realmente gratuita para producción (el plan
F1 gratuito se "duerme" tras inactividad, lo que rompe la experiencia de
PWA). Si Netmask ya paga por esa infraestructura para otros proyectos, no
hay costo adicional relevante por sumar esta app estática.
