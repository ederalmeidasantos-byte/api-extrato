#!/bin/bash

# ===== SCRIPT DE DEPLOY AUTOMÁTICO - RENDER =====
# Script para facilitar o deploy de projetos no Render

echo "🚀 ===== DEPLOY AUTOMÁTICO - RENDER ====="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_message() {
    echo -e "${2}${1}${NC}"
}

# Verificar se está em um repositório Git
if [ ! -d ".git" ]; then
    print_message "❌ Erro: Este não é um repositório Git!" $RED
    print_message "Execute 'git init' primeiro." $YELLOW
    exit 1
fi

# Verificar se está no branch correto
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    print_message "⚠️ Aviso: Você está no branch '$CURRENT_BRANCH'" $YELLOW
    print_message "Recomendamos usar 'main' ou 'master' para deploy." $YELLOW
    read -p "Continuar mesmo assim? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_message "❌ Deploy cancelado." $RED
        exit 1
    fi
fi

# Verificar se há mudanças não commitadas
if [ -n "$(git status --porcelain)" ]; then
    print_message "⚠️ Há mudanças não commitadas:" $YELLOW
    git status --short
    echo ""
    read -p "Deseja fazer commit das mudanças? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Digite a mensagem do commit: " commit_message
        if [ -z "$commit_message" ]; then
            commit_message="Deploy automático - $(date '+%Y-%m-%d %H:%M:%S')"
        fi
        git add .
        git commit -m "$commit_message"
        print_message "✅ Commit realizado: $commit_message" $GREEN
    else
        print_message "❌ Deploy cancelado. Faça commit das mudanças primeiro." $RED
        exit 1
    fi
fi

# Verificar se package.json existe
if [ ! -f "package.json" ]; then
    print_message "❌ Erro: package.json não encontrado!" $RED
    print_message "Crie um package.json antes de fazer deploy." $YELLOW
    exit 1
fi

# Verificar se server.js existe
if [ ! -f "server.js" ]; then
    print_message "❌ Erro: server.js não encontrado!" $RED
    print_message "Crie um server.js antes de fazer deploy." $YELLOW
    exit 1
fi

# Verificar se .env.example existe
if [ ! -f ".env.example" ]; then
    print_message "⚠️ Aviso: .env.example não encontrado!" $YELLOW
    print_message "Recomendamos criar um .env.example com as variáveis necessárias." $YELLOW
fi

# Verificar se .gitignore existe
if [ ! -f ".gitignore" ]; then
    print_message "⚠️ Aviso: .gitignore não encontrado!" $YELLOW
    print_message "Recomendamos criar um .gitignore para ignorar arquivos desnecessários." $YELLOW
fi

# Mostrar informações do projeto
print_message "📋 Informações do Projeto:" $BLUE
echo "   Branch: $CURRENT_BRANCH"
echo "   Último commit: $(git log -1 --pretty=format:'%h - %s (%cr)')"
echo "   Arquivos modificados: $(git diff --name-only HEAD~1 2>/dev/null | wc -l)"
echo ""

# Verificar se há remote configurado
if [ -z "$(git remote -v)" ]; then
    print_message "⚠️ Aviso: Nenhum remote configurado!" $YELLOW
    print_message "Configure um remote GitHub antes de fazer deploy." $YELLOW
    read -p "Digite a URL do repositório GitHub: " github_url
    if [ -n "$github_url" ]; then
        git remote add origin "$github_url"
        print_message "✅ Remote configurado: $github_url" $GREEN
    else
        print_message "❌ Deploy cancelado. Configure um remote primeiro." $RED
        exit 1
    fi
fi

# Mostrar remote configurado
print_message "🔗 Remote configurado:" $BLUE
git remote -v
echo ""

# Fazer push para o repositório
print_message "📤 Fazendo push para o repositório..." $BLUE
if git push origin "$CURRENT_BRANCH"; then
    print_message "✅ Push realizado com sucesso!" $GREEN
else
    print_message "❌ Erro ao fazer push!" $RED
    print_message "Verifique se o repositório existe e se você tem permissão." $YELLOW
    exit 1
fi

echo ""
print_message "🎉 Deploy iniciado com sucesso!" $GREEN
echo ""
print_message "📋 Próximos passos:" $BLUE
echo "   1. Acesse https://render.com"
echo "   2. Vá em 'Dashboard' > 'New +' > 'Web Service'"
echo "   3. Conecte seu repositório GitHub"
echo "   4. Configure:"
echo "      - Name: seu-projeto-render"
echo "      - Runtime: Node"
echo "      - Build Command: npm install"
echo "      - Start Command: npm start"
echo "   5. Configure as variáveis de ambiente"
echo "   6. Clique em 'Create Web Service'"
echo ""
print_message "🌐 Após o deploy, sua URL será:" $BLUE
echo "   https://seu-projeto-render.onrender.com"
echo ""
print_message "💡 Dica: O Render fará deploy automático a cada push!" $YELLOW
echo ""
print_message "🚀 ===== DEPLOY CONCLUÍDO =====" $GREEN
