#!/bin/bash

# Backup do arquivo original
sudo cp /etc/nginx/sites-available/lunasdigital.com.br /etc/nginx/sites-available/lunasdigital.com.br.backup.$(date +%Y%m%d_%H%M%S)

# Adicionar a rota para detalhes de proposta
sudo sed -i '/location \/api\/ {/i\
    # ================== DETALHES DE PROPOSTA ==================\
\
    location /detalhesdaproposta/ {\
        proxy_pass http://localhost:3002;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_cache_bypass $http_upgrade;\
        proxy_read_timeout 60s;\
    }\
' /etc/nginx/sites-available/lunasdigital.com.br

# Testar configuração
sudo nginx -t

# Recarregar nginx
sudo systemctl reload nginx

echo "✅ Configuração do nginx atualizada com sucesso!"

