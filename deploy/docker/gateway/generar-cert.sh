#!/bin/sh
# Genera un certificado TLS autofirmado para la IP pública de la VM.
# No sirve Let's Encrypt aquí porque no hay dominio -- Let's Encrypt no
# emite certificados para una IP sola. El navegador va a mostrar una
# advertencia de "sitio no seguro" la primera vez en cada teléfono; hay
# que aceptarla manualmente ("Avanzado" → "Continuar") una sola vez.
#
# Uso:
#   sh generar-cert.sh TU_IP_PUBLICA
#
# Vuelve a correrlo si cambia la IP pública, o cuando el certificado esté
# por vencer (825 días de vigencia).

set -e
IP="$1"
if [ -z "$IP" ]; then
  echo "Uso: sh generar-cert.sh TU_IP_PUBLICA" >&2
  exit 1
fi

DIR="$(dirname "$0")/certs"
mkdir -p "$DIR"

openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout "$DIR/privkey.pem" \
  -out "$DIR/fullchain.pem" \
  -subj "/CN=$IP" \
  -addext "subjectAltName=IP:$IP"

echo ""
echo "Certificado generado en $DIR (fullchain.pem / privkey.pem) para IP=$IP"
echo "Reinicia el gateway para que lo tome: docker compose -f docker-compose.yml restart"
