# Supabase auto-hospedado — Netmask

Backend (base de datos, autenticación, storage de fotos) de FieldSight,
corriendo dentro de la infraestructura de Netmask en lugar del Supabase
cloud. Se decidió así para tener control total de los datos (incluye
fotos e información de red/rack de clientes) y no depender de internet
hacia un tercero.

Esta carpeta es una copia sin modificar del paquete oficial de despliegue
de Supabase (`github.com/supabase/supabase`, rama `self-hosted/v0.8.0`,
carpeta `docker/`), más un archivo propio: `docker-compose.backup.yml`
(respaldo automático — el stack oficial no trae backups, lo dejan como
tarea manual). El resto de scripts (`run.sh`, `setup.sh`, `update.sh`,
`utils/*.sh`) son de Supabase; ver su `README.md` y `CONFIG.md` en esta
misma carpeta para referencia completa.

Es un stack pesado: **11 servicios** (Postgres, Auth, PostgREST, Realtime,
Storage, Envoy/gateway, Studio, Supavisor, imgproxy, postgres-meta, edge
functions) + el de backup que agregamos. Sensato pedir al menos **4 GB de
RAM** libres en el servidor donde corra.

## 1) Primera vez: configurar `.env`

```bash
cd deploy/docker/supabase
cp .env.example .env
```

Edita en `.env` las tres URLs principales (por ahora, con placeholders —
se ajustan cuando sepan la IP/dominio final del servidor en Netmask):

```
SUPABASE_PUBLIC_URL=http://localhost:8000
API_EXTERNAL_URL=http://localhost:8000/auth/v1
SITE_URL=http://localhost:3000
```

(`localhost` funciona si el contenedor de FieldSight corre en el **mismo**
servidor. Si termina en un servidor separado, cambia `localhost` por la
IP/dominio de ese servidor — así lo dejaron abierto a decidir después.)

## 2) Generar los secretos (nunca a mano)

```bash
sh utils/generate-keys.sh --update-env
sh utils/add-new-auth-keys.sh --update-env
```

Esto genera `POSTGRES_PASSWORD`, `JWT_SECRET`, `DASHBOARD_PASSWORD`, y las
llaves de API (`ANON_KEY`/`SERVICE_ROLE_KEY` y las nuevas
`SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY`) directamente en `.env`.
**`.env` nunca se sube a git** (ya está en `.gitignore` de esta carpeta y
en el `.gitignore` raíz del repo) — vive solo en el servidor donde corre.

Revisa lo generado con `sh run.sh secrets`.

## 3) Activar HTTPS y el respaldo automático

```bash
sh run.sh config add caddy     # o "nginx" — terminan TLS automático (Let's Encrypt)
sh run.sh config add backup    # nuestro override — ver docker-compose.backup.yml
sh run.sh config              # confirma qué queda activo
```

Sin esto, Auth (login) queda solo en HTTP — no sirve para producción real
(el navegador exige HTTPS para geolocalización/cámara en la app).

## 4) Levantar el stack

```bash
sh run.sh start      # docker compose up -d --wait
sh run.sh status      # confirmar que todo quedó healthy
```

## 5) Cargar el esquema de FieldSight

Con el stack corriendo, entra a Studio (`SUPABASE_PUBLIC_URL`, puerto
8000 por defecto) → SQL Editor → pega y ejecuta el contenido de
`../../../supabase/schema.sql` (el mismo archivo que se usaría en
Supabase cloud, no cambia nada por ser self-hosted).

## 6) Conectar FieldSight

En `js/config.js` de la app:
- `SUPABASE_URL` → el mismo valor de `SUPABASE_PUBLIC_URL` de este `.env`.
- `SUPABASE_ANON_KEY` → el `ANON_KEY` (o `SUPABASE_PUBLISHABLE_KEY`) que
  generó `utils/generate-keys.sh` — revísalo con `sh run.sh secrets`.

## Backups

Quedan en `./backups` (diarios, se retienen 14 días / 8 semanas / 6 meses
— ajustable con `BACKUP_KEEP_DAYS/WEEKS/MONTHS` en `.env`). Como nadie
en Netmask tiene esto asignado todavía, alguien debe además copiar
periódicamente esa carpeta a un lugar fuera del propio servidor (otro
disco, otro servidor, almacenamiento en la nube) — un backup que vive en
el mismo disco que la base de datos no protege contra una falla de disco
o del servidor completo.

## Actualizaciones

No editar `docker-compose.yml` ni los archivos de `volumes/` a mano — son
la copia oficial de Supabase. Para actualizar de versión, seguir el
proceso oficial (`sh update.sh`, ver `README.md` de esta carpeta) en vez
de tocar los archivos directamente.
