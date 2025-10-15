#!/bin/bash

echo "🔧 Configurando Nginx para inss.lunasdigital.com.br..."

# Copiar configuração do Nginx
sudo cp nginx/inss.lunasdigital.com.br.conf /etc/nginx/sites-enabled/inss.lunasdigital.com.br

# Testar configuração
echo "🧪 Testando configuração do Nginx..."
if sudo nginx -t; then
    echo "✅ Configuração do Nginx válida"
    
    # Reiniciar Nginx
    echo "🔄 Reiniciando Nginx..."
    sudo systemctl restart nginx
    
    # Verificar status
    if sudo systemctl is-active --quiet nginx; then
        echo "✅ Nginx reiniciado com sucesso"
        echo "🌐 Simulador disponível em: https://inss.lunasdigital.com.br/inss/simulador.html"
    else
        echo "❌ Erro ao reiniciar Nginx"
        sudo systemctl status nginx
        exit 1
    fi
else
    echo "❌ Configuração do Nginx inválida"
    exit 1
fi
