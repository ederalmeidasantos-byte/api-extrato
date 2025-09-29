#!/bin/bash

# ===== SCRIPT DE DEPLOY PARA RENDER - PAINEL FGTS =====
# Este script automatiza o processo de deploy no Render

echo "🚀 ===== INICIANDO DEPLOY PAINEL FGTS ====="
echo ""

# ===== VERIFICAÇÕES PRÉ-DEPLOY =====
echo "📋 Verificando arquivos necessários..."

# Verificar se os arquivos principais existem
required_files=(
    "server-fgts.js"
    "package.json"
    "render.yaml"
    "fgts_csv.js"
    "cache-persistente.js"
    "error-logger.js"
    "index.html"
    "menu.js"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file encontrado"
    else
        echo "❌ $file NÃO encontrado!"
        echo "   Execute este script na raiz do projeto"
        exit 1
    fi
done

echo ""

# ===== VERIFICAÇÃO DE DEPENDÊNCIAS =====
echo "📦 Verificando dependências..."

if [ -f "package.json" ]; then
    echo "✅ package.json encontrado"
    
    # Verificar se as dependências necessárias estão listadas
    required_deps=(
        "express"
        "socket.io"
        "multer"
        "csv-parse"
        "axios"
        "dotenv"
        "cors"
    )
    
    for dep in "${required_deps[@]}"; do
        if grep -q "\"$dep\"" package.json; then
            echo "✅ $dep encontrado no package.json"
        else
            echo "⚠️ $dep não encontrado no package.json"
        fi
    done
else
    echo "❌ package.json não encontrado!"
    exit 1
fi

echo ""

# ===== VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE =====
echo "🔐 Verificando configuração de variáveis de ambiente..."

if [ -f "env-example.txt" ]; then
    echo "✅ env-example.txt encontrado"
    echo "   Configure as variáveis no painel do Render:"
    echo ""
    echo "   📋 Variáveis obrigatórias:"
    echo "   • LUNAS_API_KEY"
    echo "   • FGTS_USER_1"
    echo "   • FGTS_PASS_1"
    echo "   • FGTS_USER_2 (opcional)"
    echo "   • FGTS_PASS_2 (opcional)"
    echo ""
    echo "   📋 Variáveis opcionais:"
    echo "   • QUEUE_ID (padrão: 25)"
    echo "   • DEST_STAGE_ID (padrão: 4)"
    echo "   • PORT (padrão: 3000)"
    echo "   • NODE_ENV (padrão: production)"
else
    echo "⚠️ env-example.txt não encontrado"
fi

echo ""

# ===== VERIFICAÇÃO DO RENDER.YAML =====
echo "⚙️ Verificando render.yaml..."

if [ -f "render.yaml" ]; then
    echo "✅ render.yaml encontrado"
    
    # Verificar configurações importantes
    if grep -q "server-fgts.js" render.yaml; then
        echo "✅ Servidor FGTS configurado corretamente"
    else
        echo "⚠️ Verifique se o startCommand está apontando para server-fgts.js"
    fi
    
    if grep -q "healthCheckPath" render.yaml; then
        echo "✅ Health check configurado"
    else
        echo "⚠️ Health check não configurado"
    fi
else
    echo "❌ render.yaml não encontrado!"
    exit 1
fi

echo ""

# ===== TESTE LOCAL (OPCIONAL) =====
echo "🧪 Deseja testar localmente antes do deploy? (y/n)"
read -r test_local

if [ "$test_local" = "y" ] || [ "$test_local" = "Y" ]; then
    echo ""
    echo "🔧 Testando servidor localmente..."
    
    # Verificar se Node.js está instalado
    if command -v node &> /dev/null; then
        echo "✅ Node.js encontrado: $(node --version)"
        
        # Verificar se npm está instalado
        if command -v npm &> /dev/null; then
            echo "✅ npm encontrado: $(npm --version)"
            
            # Instalar dependências
            echo "📦 Instalando dependências..."
            npm install
            
            if [ $? -eq 0 ]; then
                echo "✅ Dependências instaladas com sucesso"
                
                # Testar se o servidor inicia
                echo "🚀 Testando inicialização do servidor..."
                timeout 10s node server-fgts.js &
                server_pid=$!
                sleep 3
                
                if kill -0 $server_pid 2>/dev/null; then
                    echo "✅ Servidor iniciou com sucesso!"
                    kill $server_pid
                else
                    echo "❌ Erro ao iniciar servidor"
                    echo "   Verifique os logs acima"
                fi
            else
                echo "❌ Erro ao instalar dependências"
            fi
        else
            echo "❌ npm não encontrado"
        fi
    else
        echo "❌ Node.js não encontrado"
    fi
fi

echo ""

# ===== INSTRUÇÕES DE DEPLOY =====
echo "📋 ===== INSTRUÇÕES DE DEPLOY ====="
echo ""
echo "1. 🌐 Acesse: https://render.com"
echo "2. 🔐 Faça login na sua conta"
echo "3. ➕ Clique em 'New +' → 'Web Service'"
echo "4. 🔗 Conecte seu repositório GitHub"
echo "5. ⚙️ Configure o serviço:"
echo ""
echo "   📝 Nome: painel-fgts"
echo "   🏷️ Runtime: Node"
echo "   📦 Build Command: npm install"
echo "   🚀 Start Command: npm start"
echo "   💰 Plan: Free"
echo "   🌿 Branch: main"
echo "   📁 Root Directory: ."
echo "   🔄 Auto-Deploy: Yes"
echo ""
echo "6. 🔐 Configure as variáveis de ambiente:"
echo "   • LUNAS_API_KEY=sua_chave_aqui"
echo "   • FGTS_USER_1=seu_usuario@email.com"
echo "   • FGTS_PASS_1=sua_senha"
echo "   • FGTS_USER_2=segundo_usuario@email.com (opcional)"
echo "   • FGTS_PASS_2=segunda_senha (opcional)"
echo ""
echo "7. 💾 Clique em 'Create Web Service'"
echo "8. ⏳ Aguarde o deploy (pode levar alguns minutos)"
echo "9. 🎉 Acesse seu painel em: https://painel-fgts.onrender.com"
echo ""

# ===== VERIFICAÇÃO FINAL =====
echo "✅ ===== CHECKLIST FINAL ====="
echo ""
echo "📋 Arquivos prontos para deploy:"
echo "✅ server-fgts.js (servidor principal)"
echo "✅ package.json (dependências)"
echo "✅ render.yaml (configuração Render)"
echo "✅ fgts_csv.js (lógica FGTS)"
echo "✅ cache-persistente.js (cache)"
echo "✅ error-logger.js (logs)"
echo "✅ index.html (painel frontend)"
echo "✅ menu.js (menu lateral)"
echo ""
echo "🔐 Variáveis de ambiente necessárias:"
echo "✅ LUNAS_API_KEY"
echo "✅ FGTS_USER_1"
echo "✅ FGTS_PASS_1"
echo "✅ FGTS_USER_2 (opcional)"
echo "✅ FGTS_PASS_2 (opcional)"
echo ""
echo "🚀 Seu projeto está pronto para deploy!"
echo ""
echo "📞 Suporte: Se encontrar problemas, verifique:"
echo "   • Logs do Render no painel"
echo "   • Variáveis de ambiente configuradas"
echo "   • Conectividade com APIs externas"
echo "   • Credenciais FGTS válidas"
echo ""
echo "🎯 URL do painel após deploy:"
echo "   https://painel-fgts.onrender.com"
echo ""
echo "✨ Deploy concluído! Boa sorte! 🚀"