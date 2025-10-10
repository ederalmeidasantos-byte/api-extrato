#!/bin/bash

# Script de teste para Lunas Digital com Subdomínios
# Testa todos os endpoints após configuração

set -e

echo "🧪 Testando Lunas Digital - Subdomínios"
echo "======================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar endpoint
test_endpoint() {
    local url=$1
    local name=$2
    local expected_status=${3:-200}
    
    echo -n "Testando $name... "
    
    if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "$expected_status"; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FALHOU${NC}"
        return 1
    fi
}

# Função para testar API
test_api() {
    local url=$1
    local name=$2
    
    echo -n "Testando API $name... "
    
    response=$(curl -s -w "%{http_code}" "$url" -o /dev/null)
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ OK${NC}"
        return 0
    else
        echo -e "${RED}❌ FALHOU (Status: $response)${NC}"
        return 1
    fi
}

echo "🔍 Testando endpoints locais..."
echo "==============================="

# Testar localmente
test_endpoint "http://localhost:3000/health" "API Principal (3000)"
test_endpoint "http://localhost:3001/health" "CRM (3001)"
test_endpoint "http://localhost:3002/health" "INSS (3002)"
test_endpoint "http://localhost:3003/health" "Base de Dados (3003)"

echo ""
echo "🌐 Testando subdomínios (se DNS configurado)..."
echo "==============================================="

# Testar subdomínios
test_endpoint "http://lunasdigital.com.br/health" "Site Principal"
test_endpoint "http://api.lunasdigital.com.br/health" "API Principal"
test_endpoint "http://crm.lunasdigital.com.br/health" "CRM"
test_endpoint "http://inss.lunasdigital.com.br/health" "INSS"
test_endpoint "http://admin.lunasdigital.com.br/health" "Admin"

echo ""
echo "📄 Testando páginas HTML..."
echo "==========================="

# Testar páginas HTML
test_endpoint "http://inss.lunasdigital.com.br/simulador.html" "Simulador INSS"
test_endpoint "http://crm.lunasdigital.com.br/" "CRM Interface"

echo ""
echo "🔧 Verificando serviços PM2..."
echo "=============================="

# Verificar PM2
if command -v pm2 &> /dev/null; then
    echo "Status dos serviços PM2:"
    pm2 status
else
    echo -e "${YELLOW}⚠️ PM2 não encontrado${NC}"
fi

echo ""
echo "🌐 Verificando Nginx..."
echo "======================"

# Verificar Nginx
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx está rodando${NC}"
    
    # Testar configuração
    if nginx -t 2>/dev/null; then
        echo -e "${GREEN}✅ Configuração do Nginx válida${NC}"
    else
        echo -e "${RED}❌ Erro na configuração do Nginx${NC}"
    fi
else
    echo -e "${RED}❌ Nginx não está rodando${NC}"
fi

echo ""
echo "📊 Verificando portas..."
echo "======================="

# Verificar portas
for port in 80 3000 3001 3002 3003; do
    if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✅ Porta $port está aberta${NC}"
    else
        echo -e "${RED}❌ Porta $port não está aberta${NC}"
    fi
done

echo ""
echo "🔍 Verificando DNS..."
echo "===================="

# Verificar DNS
domains=("lunasdigital.com.br" "api.lunasdigital.com.br" "crm.lunasdigital.com.br" "inss.lunasdigital.com.br" "admin.lunasdigital.com.br")

for domain in "${domains[@]}"; do
    echo -n "Verificando $domain... "
    
    if nslookup "$domain" 2>/dev/null | grep -q "72.60.159.149"; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${YELLOW}⚠️ Não resolve para 72.60.159.149${NC}"
    fi
done

echo ""
echo "📋 Resumo dos Testes"
echo "==================="

# Contar sucessos
local_tests=0
local_passed=0

# Testar localmente
if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/health" | grep -q "200"; then
    ((local_passed++))
fi
((local_tests++))

if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3001/health" | grep -q "200"; then
    ((local_passed++))
fi
((local_tests++))

if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3002/health" | grep -q "200"; then
    ((local_passed++))
fi
((local_tests++))

if curl -s -o /dev/null -w "%{http_code}" "http://localhost:3003/health" | grep -q "200"; then
    ((local_passed++))
fi
((local_tests++))

echo "Testes locais: $local_passed/$local_tests passaram"

if [ $local_passed -eq $local_tests ]; then
    echo -e "${GREEN}🎉 Todos os testes locais passaram!${NC}"
    echo -e "${GREEN}✅ Sistema está funcionando corretamente${NC}"
else
    echo -e "${RED}⚠️ Alguns testes falharam${NC}"
    echo -e "${YELLOW}Verifique os logs: pm2 logs${NC}"
fi

echo ""
echo "📞 Próximos passos:"
echo "1. Configure o DNS conforme configurar-dns-lunasdigital.md"
echo "2. Aguarde a propagação DNS (até 24h)"
echo "3. Teste novamente com: ./test-lunasdigital-subdominios.sh"
echo "4. Configure SSL se necessário"

