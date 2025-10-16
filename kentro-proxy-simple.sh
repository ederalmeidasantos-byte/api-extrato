#!/bin/sh
# Script simples para proxy da Kentro usando wget com configurações SSL permissivas
QUEUE_ID="$1"
API_KEY="$2"
FILE_ID="$3"
DOWNLOAD="$4"

# Tentar com configurações SSL mais permissivas
wget -q -O - --post-data="queueId=${QUEUE_ID}&apiKey=${API_KEY}&fileId=${FILE_ID}&download=${DOWNLOAD}" \
  --header="Content-Type: application/x-www-form-urlencoded" \
  --header="User-Agent: Node.js Kentro Proxy" \
  --timeout=60 \
  --no-check-certificate \
  "https://lunasdigital.atenderbem.com/int/downloadFile"