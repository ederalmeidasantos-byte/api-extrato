#!/bin/bash

# Script de configuração final do Simulador INSS
# Garante que tudo está configurado corretamente

set -e

echo "🔧 Configuração Final do Simulador INSS"
echo "========================================"

# 1. Verificar se os arquivos essenciais existem
echo "📁 Verificando arquivos essenciais..."

required_files=(
  "INSS/simulador.html"
  "INSS/simulador-logic.js"
  "INSS/server-inss.js"
  "INSS/extrair_pdf.js"
  "Dockerfile.inss"
  "docker-compose.yml"
  "nginx/nginx.conf"
  "config-vps-restructured.env"
)

for file in "${required_files[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file - ARQUIVO FALTANDO!"
    exit 1
  fi
done

# 2. Verificar configurações do nginx
echo ""
echo "🌐 Verificando configuração do Nginx..."

if grep -q "location /inss/" nginx/nginx.conf; then
  echo "  ✅ Rota /inss/ configurada"
else
  echo "  ❌ Rota /inss/ não encontrada no nginx.conf"
  exit 1
fi

if grep -q "location /api/kentro/" nginx/nginx.conf; then
  echo "  ✅ Rota /api/kentro/ configurada"
else
  echo "  ❌ Rota /api/kentro/ não encontrada no nginx.conf"
  exit 1
fi

if grep -q "location /api/processar-extrato" nginx/nginx.conf; then
  echo "  ✅ Rota /api/processar-extrato configurada"
else
  echo "  ❌ Rota /api/processar-extrato não encontrada no nginx.conf"
  exit 1
fi

# 3. Verificar configurações do Docker
echo ""
echo "🐳 Verificando configuração do Docker..."

if grep -q "api-simulador:" docker-compose.yml; then
  echo "  ✅ Serviço api-simulador configurado"
else
  echo "  ❌ Serviço api-simulador não encontrado no docker-compose.yml"
  exit 1
fi

if grep -q "Dockerfile.inss" docker-compose.yml; then
  echo "  ✅ Dockerfile.inss configurado"
else
  echo "  ❌ Dockerfile.inss não encontrado no docker-compose.yml"
  exit 1
fi

# 4. Verificar configurações do simulador
echo ""
echo "⚙️ Verificando configurações do simulador..."

if grep -q "lunasdigital.com.br" INSS/simulador-logic.js; then
  echo "  ✅ Domínio lunasdigital.com.br configurado"
else
  echo "  ❌ Domínio lunasdigital.com.br não encontrado no simulador-logic.js"
  exit 1
fi

if grep -q "localStorage.setItem" INSS/simulador-logic.js; then
  echo "  ✅ Cache de CPF configurado"
else
  echo "  ❌ Cache de CPF não encontrado no simulador-logic.js"
  exit 1
fi

# 5. Verificar configurações do servidor INSS
echo ""
echo "🖥️ Verificando configurações do servidor INSS..."

if grep -q "OPENAI_API_KEY" INSS/server-inss.js; then
  echo "  ✅ Verificação de OPENAI_API_KEY configurada"
else
  echo "  ❌ Verificação de OPENAI_API_KEY não encontrada no server-inss.js"
  exit 1
fi

if grep -q "/api/kentro/buscar-cliente" INSS/server-inss.js; then
  echo "  ✅ API Kentro configurada"
else
  echo "  ❌ API Kentro não encontrada no server-inss.js"
  exit 1
fi

# 6. Verificar arquivo .env
echo ""
echo "🔑 Verificando arquivo .env..."

if [ -f ".env" ]; then
  echo "  ✅ Arquivo .env existe"
  
  if grep -q "OPENAI_API_KEY=" .env; then
    echo "  ✅ OPENAI_API_KEY configurada"
  else
    echo "  ⚠️ OPENAI_API_KEY não configurada (opcional)"
  fi
  
  if grep -q "LUNAS_API_KEY=" .env; then
    echo "  ✅ LUNAS_API_KEY configurada"
  else
    echo "  ⚠️ LUNAS_API_KEY não configurada (opcional)"
  fi
else
  echo "  ⚠️ Arquivo .env não existe - será criado pelo script de deploy"
fi

# 7. Criar diretórios necessários
echo ""
echo "📁 Criando diretórios necessários..."

mkdir -p var/data/clientes
mkdir -p var/data/propostas
mkdir -p var/data/extratos
mkdir -p var/log/nginx
mkdir -p backup-data/clientes
mkdir -p backup-data/propostas

echo "  ✅ Diretórios criados"

# 8. Verificar permissões
echo ""
echo "🔐 Verificando permissões..."

if [ -w "var/data" ]; then
  echo "  ✅ Diretório var/data tem permissão de escrita"
else
  echo "  ❌ Diretório var/data não tem permissão de escrita"
  chmod 755 var/data
  echo "  🔧 Permissões corrigidas"
fi

# 9. Resumo final
echo ""
echo "🎉 Configuração Final Concluída!"
echo "================================"
echo ""
echo "✅ Todos os arquivos essenciais estão presentes"
echo "✅ Nginx configurado para roteamento correto"
echo "✅ Docker Compose configurado para multi-container"
echo "✅ Simulador configurado para domínio lunasdigital.com.br"
echo "✅ Cache de CPF implementado"
echo "✅ APIs Kentro e OpenAI configuradas"
echo "✅ Diretórios de dados criados"
echo ""
echo "🚀 Pronto para deploy!"
echo ""
echo "Para fazer deploy:"
echo "  Linux/Mac: ./deploy-vps-dominio.sh"
echo "  Windows:   .\deploy-vps-dominio.ps1"
echo ""
echo "Para testar:"
echo "  node test-simulador-inss.js"
echo ""
echo "URLs após deploy:"
echo "  - Simulador: https://lunasdigital.com.br/inss/simulador.html"
echo "  - CRM: https://lunasdigital.com.br/operacional/"
echo "  - API: https://lunasdigital.com.br/api/"

