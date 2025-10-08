#!/bin/bash

# Backup
sudo cp /etc/nginx/sites-available/lunasdigital.com.br /etc/nginx/sites-available/lunasdigital.com.br.backup6

# Encontrar linha da API
LINE=$(grep -n "location /api/" /etc/nginx/sites-available/lunasdigital.com.br | cut -d: -f1)

# Criar arquivo temporário
head -n $((LINE-1)) /etc/nginx/sites-available/lunasdigital.com.br > /tmp/nginx_new.conf

# Adicionar configuração de detalhes
cat >> /tmp/nginx_new.conf << 'EOF'
    # ================== DETALHES DE PROPOSTA ==================

    location /detalhesdaproposta/ {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

EOF

# Adicionar resto do arquivo
tail -n +$LINE /etc/nginx/sites-available/lunasdigital.com.br >> /tmp/nginx_new.conf

# Substituir arquivo
sudo cp /tmp/nginx_new.conf /etc/nginx/sites-available/lunasdigital.com.br

# Testar
sudo nginx -t

if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "✅ Configuração atualizada com sucesso!"
    echo "✅ Rota /detalhesdaproposta/ configurada!"
else
    echo "❌ Erro na configuração!"
    sudo cp /etc/nginx/sites-available/lunasdigital.com.br.backup6 /etc/nginx/sites-available/lunasdigital.com.br
    exit 1
fi

