# FieldSight — imagen Docker para hosting interno en Netmask.
# Construir desde la RAÍZ del repo (el contexto necesita index.html, css/, js/, etc.):
#   docker build -f deploy/docker/Dockerfile -t fieldsight .
# o con docker-compose (ver deploy/docker/docker-compose.yml):
#   docker compose -f deploy/docker/docker-compose.yml up --build

FROM node:20-alpine

WORKDIR /app

# Dependencias del servidor estático (solo Express)
COPY deploy/docker/package.json ./package.json
RUN npm install --omit=dev

# Archivos de la app (sin build step: se copian tal cual los sirve el navegador)
COPY index.html manifest.json sw.js ./
COPY css ./css
COPY js ./js
COPY icons ./icons

# Servidor estático (mismo patrón que deploy/azure/server.js)
COPY deploy/docker/server.js ./server.js

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
