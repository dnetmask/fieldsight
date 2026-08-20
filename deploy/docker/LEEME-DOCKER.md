# FieldSight — Despliegue con Docker (hosting interno en Netmask)

Este es el adaptador de hosting pensado para correr FieldSight como
contenedor dentro de la infraestructura de Netmask, una vez termine la
etapa de validación con usuarios. Sigue el mismo patrón que
`deploy/azure/server.js`: un servidor Express mínimo que sirve los
archivos estáticos (no hay build step, es la misma app tal cual corre en
el navegador).

## 1) Configurar la llave de Supabase

Igual que en los otros despliegues: edita `js/config.js` (`SUPABASE_URL` /
`SUPABASE_ANON_KEY`) **antes** de construir la imagen — quedan
horneadas dentro de la imagen como archivos estáticos, no como variable
de entorno de Docker. Es la llave "anon public", diseñada para exponerse
en el navegador; la seguridad real la dan las políticas RLS de
`supabase/schema.sql`.

## 2) Construir y correr

Desde la raíz del repo (el contexto de build necesita `index.html`,
`css/`, `js/`, `icons/`, etc.):

```bash
docker compose -f deploy/docker/docker-compose.yml up --build -d
```

O sin compose:

```bash
docker build -f deploy/docker/Dockerfile -t fieldsight-web .
docker run -d --name fieldsight-web -p 8080:8080 --restart unless-stopped fieldsight-web
```

La app queda disponible en `http://localhost:8080` (o el host/puerto que
mapee quien administre el servidor). Hay un endpoint `/healthz` para
chequeos de salud (load balancer, Docker healthcheck, etc.).

## 3) HTTPS

El contenedor sirve solo HTTP en el puerto 8080. Para producción,
FieldSight necesita HTTPS (login, geolocalización y cámara del navegador
lo exigen) — hay que ponerlo detrás de un reverse proxy que termine TLS
(nginx, Traefik, el API Management o Application Gateway que ya use
Netmask, etc.). No lo resuelve esta imagen.

## 4) Después de desplegar

- **Actualiza Supabase**: Authentication → URL Configuration → agrega la
  URL pública final (la del reverse proxy, con `https://`) a las
  *Redirect URLs*. Sin esto, confirmación de correo / recuperar
  contraseña no funcionan desde ese dominio.
- Abre la URL en el celular de un técnico y confirma que el botón de
  "Instalar app" aparezca y que el login funcione.

## Notas

- La imagen no incluye `docs/`, `supabase/schema.sql` ni los otros
  adaptadores de `deploy/` — solo lo necesario para servir la app.
- Si cambian la versión de Node, ajusten el `FROM node:20-alpine` del
  `Dockerfile` y el `engines` de `package.json`.
