# Plantilla de nginx para el contenedor de FieldSight (la app en sí, no
# Supabase — ese ya tiene su propio nginx+certbot en deploy/docker/supabase/,
# totalmente independiente de este). Se usa la misma imagen
# (jonasal/nginx-certbot) para que ambos se administren igual.

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;

    server_name ${PROXY_DOMAIN};
    server_tokens off;

    ssl_certificate /etc/letsencrypt/live/${PROXY_DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${PROXY_DOMAIN}/privkey.pem;
    ssl_trusted_certificate /etc/letsencrypt/live/${PROXY_DOMAIN}/chain.pem;
    ssl_dhparam /etc/letsencrypt/dhparams/dhparam.pem;

    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    location / {
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $http_host;
        proxy_set_header X-Forwarded-Port $server_port;

        proxy_pass http://fieldsight:8080;
    }
}
