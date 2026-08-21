#!/bin/sh
# Genera un certificado TLS autofirmado para una o más IPs de la VM.
# No sirve Let's Encrypt aquí porque no hay dominio -- Let's Encrypt no
# emite certificados para una IP sola. El navegador va a mostrar una
# advertencia de "sitio no seguro" la primera vez en cada teléfono; hay
# que aceptarla manualmente ("Avanzado" → "Continuar") una sola vez.
#
# Uso:
#   sh generar-cert.sh IP_PUBLICA [IP_INTERNA ...]
#
# Pasa más de una IP si además de por la IP pública (para técnicos en
# campo) alguien podría entrar por la IP interna de la VM (ej. conectado
# al wifi de la oficina de Netmask) -- sin esto, el navegador mostraría
# un segundo error de "la dirección no coincide" en ese caso, encima de
# la advertencia normal de certificado autofirmado.
#
# Vuelve a correrlo si cambia alguna IP, o cuando el certificado esté
# por vencer (825 días de vigencia).

set -e
if [ "$#" -lt 1 ]; then
  echo "Uso: sh generar-cert.sh IP_PUBLICA [IP_INTERNA ...]" >&2
  exit 1
fi

DIR="$(dirname "$0")/certs"
mkdir -p "$DIR"

SAN=""
for ip in "$@"; do
  if [ -z "$SAN" ]; then SAN="IP:$ip"; else SAN="$SAN,IP:$ip"; fi
done

openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout "$DIR/privkey.pem" \
  -out "$DIR/fullchain.pem" \
  -subj "/CN=$1" \
  -addext "subjectAltName=$SAN"

echo ""
echo "Certificado generado en $DIR para: $*"
echo "Reinicia el gateway para que lo tome: docker compose -f docker-compose.yml restart"
