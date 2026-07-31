# FieldSight — Guía de publicación (PWA + Supabase)

## Paso 0 — Configurar Supabase (control de usuarios y datos compartidos)

1. Entra a **https://supabase.com**, crea una cuenta gratis y un **New project**
   (elige una región cercana, ej. São Paulo o la más cercana a Colombia).
2. Ve a **SQL Editor → New query**, pega TODO el contenido del archivo
   `supabase_schema.sql` que te entregué junto a este paquete, y dale **Run**.
3. Ve a **Authentication → Providers → Email** y, si quieres que los técnicos
   puedan entrar de inmediato sin confirmar su correo, desactiva
   **"Confirm email"**.
4. Ve a **Project Settings → API**. Copia:
   - **Project URL**
   - **anon public key** (⚠️ NO la "service_role" — esa nunca debe usarse en la app)
5. Abre `index.html` con un editor de texto, busca estas dos líneas cerca
   del inicio y reemplaza los valores:
   ```
   const SUPABASE_URL = 'PEGA_AQUI_TU_SUPABASE_URL';
   const SUPABASE_ANON_KEY = 'PEGA_AQUI_TU_SUPABASE_ANON_KEY';
   ```
6. Guarda el archivo. Ya está lista para publicar.

### Convertir el primer usuario en administrador
Cuando alguien se registre por primera vez desde la app, queda con rol
`tecnico`. Para hacerlo administrador: en Supabase ve a
**Table Editor → profiles**, busca su fila y cambia la columna `rol` a
`administrador` o `supervisor`.

---

## Publicarla en 2 minutos (Netlify Drop)

1. Entra a **https://app.netlify.com/drop** desde tu computador.
2. Arrastra esta carpeta completa (`fieldsight-pwa`, ya con el `index.html`
   editado con tus llaves de Supabase) sobre la página.
3. En unos segundos te entrega una dirección web
   (`https://nombre-aleatorio.netlify.app`). Esa es la URL que compartes
   con los técnicos.
4. (Opcional) Crea una cuenta gratuita en Netlify para tener un nombre fijo
   y poder actualizar el sitio más adelante.

## Cómo lo usa el técnico

1. Abre esa URL en Chrome (Android) o Safari (iPhone).
2. Se registra con su correo y contraseña la primera vez, o inicia sesión
   si ya tiene cuenta.
3. Puede instalarla en su pantalla de inicio igual que antes (botón de
   instalación o "Agregar a pantalla de inicio").

## Qué cambió con Supabase

- Las visitas y fotos ahora se guardan en una base de datos compartida en
  la nube: **todos los usuarios ven la misma información desde cualquier
  dispositivo**, no solo la de su propio celular.
- Cada visita queda registrada con **quién la creó y cuándo**, visible en
  el detalle y el historial.
- Se necesita **conexión a internet para guardar y sincronizar** — a
  diferencia de la versión anterior, esta ya no funciona 100% sin señal
  (es el costo de tener datos compartidos y login real). Si el trabajo
  offline vuelve a ser crítico, se puede agregar una cola de sincronización
  más adelante.
- Roles: los técnicos editan sus propias visitas; supervisores y
  administradores pueden editar y eliminar cualquiera.

## Actualizar la app más adelante

Vuelve a arrastrar la carpeta actualizada a Netlify Drop sobre el mismo
sitio, o conecta una cuenta de Netlify a este repositorio/carpeta para
desplegar con un clic.

## Alternativas a Netlify

GitHub Pages, Vercel, Firebase Hosting, o el servidor web de tu empresa.
Lo único indispensable es que sirva los archivos por HTTPS.
