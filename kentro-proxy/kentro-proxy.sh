#!/bin/bash
# Script para fazer proxy da API da Kentro usando curl externo
curl -s -X POST 'https://lunasdigital.atenderbem.com/int/downloadFile' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'User-Agent: Node.js Kentro Proxy' \
  --data-urlencode "queueId=$1" \
  --data-urlencode "apiKey=$2" \
  --data-urlencode "fileId=$3" \
  --data-urlencode "download=$4" \
  --connect-timeout 30 \
  --max-time 60

