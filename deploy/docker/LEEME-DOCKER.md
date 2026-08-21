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

## 3) HTTPS (producción / la VM de Netmask)

El contenedor por sí solo sirve solo HTTP en el puerto 8080 — sirve para
pruebas locales, pero FieldSight necesita HTTPS en producción (login,
geolocalización y cámara del navegador lo exigen fuera de `localhost`).

Para eso existe `docker-compose.nginx.yml`: agrega un nginx con
certificado automático de Let's Encrypt (misma imagen que usa el nginx de
Supabase en `deploy/docker/supabase/`, pero **totalmente independiente**
— cada uno maneja su propio dominio y certificado por separado) y le
quita el puerto 8080 directo (todo entra por HTTPS/443).

```bash
cd deploy/docker
cp .env.example .env   # edita APP_DOMAIN y CERTBOT_EMAIL con los valores reales
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up --build -d
```

Requisitos antes de correrlo así:
- El dominio en `APP_DOMAIN` (ej. `fieldsight.netmask.co`) debe tener un
  registro DNS tipo A apuntando ya a la IP pública de la VM — Let's
  Encrypt no emite el certificado si el dominio no resuelve ahí todavía.
- Puertos 80 y 443 abiertos hacia la VM (80 lo necesita el proceso de
  validación de Let's Encrypt, aunque todo el tráfico real termine yendo
  por 443).

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
