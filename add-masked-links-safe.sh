#!/bin/bash

# Script para adicionar sistema de links mascarados de forma segura
CONTAINER_NAME="api-simulador-lunasdigital"
FILE_PATH="/app/INSS/server-inss.js"

echo "🔧 Adicionando sistema de links mascarados de forma segura..."

# Adicionar import do sistema de links mascarados no início do arquivo
docker exec $CONTAINER_NAME sed -i '/const express = require/i\
const { adicionarLinksMascarados } = require("./masked-links-system");\
' $FILE_PATH

# Adicionar chamada para inicializar o sistema antes dos endpoints existentes
docker exec $CONTAINER_NAME sed -i '/app.post.*salvar-cliente/i\
// ================== SISTEMA DE LINKS MASCARADOS ==================\
adicionarLinksMascarados(app);\
\
' $FILE_PATH

echo "✅ Sistema de links mascarados adicionado de forma segura!"
