# Migrar FieldSight a la VM — sin dominio (IP pública + 1 puerto nateado)

Alternativa a `LEEME-MIGRACION-VM.md` (que asume un dominio real con
Let's Encrypt). Úsala si **no** van a poder crear un subdominio de
`netmask.co` — reemplaza los dos nginx separados de esa guía por **uno
solo**, que enruta por la ruta de la URL entre la app y Supabase, porque
solo hay un puerto disponible hacia la VM.

**Studio (el panel de Supabase) no queda expuesto públicamente aquí** —
se administra por túnel SSH cuando haga falta:
```bash
ssh -L 8000:localhost:8000 usuario@IP-de-la-VM
```
y abriendo `http://localhost:8000` en el navegador de tu PC.

**Certificado autofirmado, no Let's Encrypt** — Let's Encrypt no emite
certificados para una IP sola. El navegador de cada técnico va a
mostrar una advertencia de "sitio no seguro" **la primera vez** — hay
que aceptarla manualmente (en Chrome: "Avanzado" → "Continuar a
[IP] (no seguro)"). Después de aceptarla una vez, el navegador la
recuerda para ese sitio.

## 0) Datos que necesitas antes de empezar

- La **IP pública** de la VM.
- El **puerto externo** que van a natear hacia el puerto 443 de la VM
  (ej. si natean el puerto 8443 público hacia el 443 de la VM, los
  técnicos van a entrar por `https://IP_PUBLICA:8443`).
- Reemplaza `IP_PUBLICA` y `PUERTO_EXTERNO` en todos los comandos y
  valores de esta guía con los datos reales.

## 1) Clonar el repositorio en la VM

```bash
git clone https://github.com/dnetmask/fieldsight.git
cd fieldsight
git checkout main
```

## 2) Crear la red compartida (una sola vez)

```bash
docker network create fieldsight_public
```

Es lo que le permite al gateway único alcanzar tanto a la app como a
Supabase, aunque sean proyectos de Docker Compose independientes.

## 3) Levantar Supabase auto-hospedado

Sigue `deploy/docker/supabase/LEEME-SUPABASE-SELFHOSTED.md` para
generar secretos y cargar el esquema, con estas diferencias:

- **No** actives `sh run.sh config add nginx` ni `caddy` — ese HTTPS
  para Supabase lo va a dar el gateway único del paso 5, no Supabase
  directamente.
- En `.env`, como todo queda bajo un solo origen (app + Supabase juntos
  detrás del mismo gateway), las tres URLs son la MISMA base:
  ```
  SUPABASE_PUBLIC_URL=https://IP_PUBLICA:PUERTO_EXTERNO
  API_EXTERNAL_URL=https://IP_PUBLICA:PUERTO_EXTERNO/auth/v1
  SITE_URL=https://IP_PUBLICA:PUERTO_EXTERNO
  ```
- Levanta el stack y únelo a la red compartida:
  ```bash
  sh run.sh start
  docker compose -f docker-compose.yml -f docker-compose.gateway-network.yml up -d
  ```

## 4) Conectar y construir la app

Edita `js/config.js` **antes** de construir la imagen (queda horneado
dentro):
```js
const SUPABASE_URL = 'https://IP_PUBLICA:PUERTO_EXTERNO';
const SUPABASE_ANON_KEY = '...'; // el ANON_KEY real (sh run.sh secrets, dentro de deploy/docker/supabase)
```

Construye y únela a la red compartida:
```bash
cd deploy/docker
docker compose -f docker-compose.yml -f docker-compose.gateway-network.yml up -d --build
```

## 5) Generar el certificado y levantar el gateway único

```bash
cd deploy/docker/gateway
sh generar-cert.sh IP_PUBLICA
docker compose up -d
```

Deja `IP_PUBLICA:PUERTO_EXTERNO` nateado hacia el puerto **443** de la
VM (el gateway escucha ahí adentro, sin importar qué número de puerto
externo usen afuera).

## 6) Redirect URLs de Supabase

Por túnel SSH a Studio (paso de arriba) → **Authentication → URL
Configuration → Redirect URLs** → agrega
`https://IP_PUBLICA:PUERTO_EXTERNO`.

## 7) Probar de punta a punta

Desde un celular real: abre `https://IP_PUBLICA:PUERTO_EXTERNO`, acepta
la advertencia de certificado la primera vez, inicia sesión, guarda una
visita con foto y con GPS, y revisa que aparezca en Supabase (por el
túnel SSH a Studio).

## Actualizar después de un cambio

```bash
git pull origin main
docker compose -f deploy/docker/docker-compose.yml -f deploy/docker/docker-compose.gateway-network.yml up -d --build
docker compose -f deploy/docker/supabase/docker-compose.yml -f deploy/docker/supabase/docker-compose.gateway-network.yml up -d
docker compose -f deploy/docker/gateway/docker-compose.yml restart
```

## Si en algún momento sí consiguen un dominio

Se puede migrar al esquema de `LEEME-MIGRACION-VM.md` (dos dominios,
certificados reales de Let's Encrypt, sin advertencias del navegador) —
avísame y te ayudo con el cambio; no hay que rehacer nada desde cero,
solo reemplazar el gateway único por los dos nginx con certbot que ya
están armados en esa otra rama.
