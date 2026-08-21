# Migrar FieldSight del PC de pruebas a la VM de Netmask

Guía paso a paso, en orden. Cubre los dos contenedores independientes
que se van a desplegar en la VM: **Supabase auto-hospedado**
(`deploy/docker/supabase/`) y la **app de FieldSight**
(`deploy/docker/`). Cada uno tiene su propio dominio, su propio
nginx+certbot, y no dependen entre sí a nivel de infraestructura — solo
la app necesita saber la URL del otro para conectarse.

## 0) Requisitos antes de empezar

- Acceso SSH (o similar) a la VM, con Docker + Docker Compose ya
  instalados (según mencionaste, ya corren otros Dockers ahí).
- **Dos subdominios** de `netmask.co` (o el dominio que decidan), cada
  uno con un registro DNS tipo A apuntando a la **IP pública** de la VM.
  Ejemplo usado en esta guía:
  - `fieldsight.netmask.co` → la app
  - `fieldsight-api.netmask.co` → Supabase
  - (Puede ser cualquier nombre — solo hay que ser consistentes en los
    pasos siguientes.) Pide este registro a quien administre el DNS de
    `netmask.co` (probablemente el mismo equipo/portal donde está
    alojado el sitio principal, en Azure).
- Puertos **80 y 443** abiertos hacia la VM desde internet (Let's
  Encrypt los necesita para emitir los certificados).

## 1) Clonar el repositorio en la VM

```bash
git clone https://github.com/dnetmask/fieldsight.git
cd fieldsight
git checkout main
```

`main` es la rama que representa "listo para producción" — todo lo
probado en el PC ya está fusionado ahí.

## 2) Levantar Supabase auto-hospedado

Sigue `deploy/docker/supabase/LEEME-SUPABASE-SELFHOSTED.md` completo,
con estas diferencias respecto a la prueba en el PC:

```bash
cd deploy/docker/supabase
cp .env.example .env
sh utils/generate-keys.sh --update-env      # secretos NUEVOS, no reutilizar los del PC
sh utils/add-new-auth-keys.sh --update-env
```

En `.env`, edita:
```
SUPABASE_PUBLIC_URL=https://fieldsight-api.netmask.co
API_EXTERNAL_URL=https://fieldsight-api.netmask.co/auth/v1
SITE_URL=https://fieldsight.netmask.co
PROXY_DOMAIN=fieldsight-api.netmask.co
CERTBOT_EMAIL=admin@netmask.co
```

Activa HTTPS (certificado automático) y el respaldo:
```bash
sh run.sh config add nginx
sh run.sh config add backup
sh run.sh start
```

Carga el esquema (`supabase/schema.sql`) en el SQL Editor de Studio
(`https://fieldsight-api.netmask.co`, con el usuario/contraseña de
`DASHBOARD_USERNAME`/`DASHBOARD_PASSWORD` que generó `generate-keys.sh`
— revísalos con `sh run.sh secrets`).

## 3) Conectar y construir la app

Vuelve a la raíz del repo y edita `js/config.js` con los valores reales
que acaba de generar el paso anterior:

```js
const SUPABASE_URL = 'https://fieldsight-api.netmask.co';
const SUPABASE_ANON_KEY = '...'; // el ANON_KEY real, no el del PC de pruebas
```

**Este archivo se hornea dentro de la imagen al construirla** — hay que
editarlo *antes* del build, no después.

```bash
cd deploy/docker
cp .env.example .env   # edita APP_DOMAIN=fieldsight.netmask.co y CERTBOT_EMAIL
docker compose -f docker-compose.yml -f docker-compose.nginx.yml up --build -d
```

## 4) Redirect URLs de Supabase

En Studio (`https://fieldsight-api.netmask.co`) → **Authentication → URL
Configuration → Redirect URLs** — agrega `https://fieldsight.netmask.co`.
Sin esto, confirmación de correo y recuperar contraseña no funcionan
desde el dominio real.

## 5) Probar de punta a punta

Desde un celular real (no la VM ni el PC de pruebas): abre
`https://fieldsight.netmask.co`, confirma que carga con el candado de
HTTPS, inicia sesión, guarda una visita con foto, y revisa que aparezca
en Supabase Studio.

## Sobre seguir trabajando después de migrar

La VM es el destino final de `main`, no un lugar de desarrollo. El flujo
para cambios futuros sigue siendo el mismo, sin importar desde qué PC (o
qué cuenta de Claude Code) se trabaje:

1. Rama nueva desde `develop`, cambio, prueba local (con Docker en
   cualquier PC).
2. PR/merge a `develop`.
3. Cuando un lote de cambios ya esté validado, merge `develop → main`.
4. En la VM: `git pull origin main`, y reconstruir:
   ```bash
   docker compose -f deploy/docker/docker-compose.yml -f deploy/docker/docker-compose.nginx.yml up --build -d
   ```

## Notas

- El nginx de la app y el de Supabase son **dos contenedores
  independientes**, cada uno con su propio certificado — no comparten
  configuración ni dominio. Si más adelante cambian de dominio para
  alguno de los dos, solo hay que actualizar su `.env` respectivo y
  reiniciar ese contenedor.
- Los secretos de Supabase generados en el PC de pruebas (`.env` en
  `deploy/docker/supabase/`) **nunca deben reutilizarse aquí** — cada
  entorno necesita los suyos, generados con los mismos scripts.
