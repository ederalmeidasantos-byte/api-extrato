# 🎉 SISTEMA FGTS CONTAINERIZADO - CONFIGURAÇÃO ATUALIZADA

## ✅ CONFIGURAÇÃO ATUALIZADA PARA SUBDOMÍNIO

O Sistema FGTS foi configurado para acesso via **subdomínio direto**!

### 🔗 **NOVO ACESSO:**
**fgts.lunasdigital.com.br** (link direto)

### 📋 **CONFIGURAÇÃO NGINX ATUALIZADA:**

```nginx
server {
    listen 80;
    server_name fgts.lunasdigital.com.br;
    
    location / {
        proxy_pass http://localhost:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 🚀 **DEPLOY NO VPS:**

#### 1. Upload para VPS
```bash
scp -r fgts/ user@vps:/path/to/destination/
```

#### 2. Deploy do Container
```bash
cd fgts/
chmod +x deploy-fgts.sh
./deploy-fgts.sh
```

#### 3. Configurar Nginx
```bash
# Adicionar configuração do subdomínio
cat nginx-fgts.conf >> /etc/nginx/nginx.conf

# Recarregar Nginx
nginx -s reload
```

#### 4. Configurar DNS
No painel do Hostinger, adicionar:
- **Tipo**: A
- **Nome**: fgts
- **Valor**: IP do VPS

### ✅ **SISTEMA PRONTO:**
- **Container**: Porta 3005
- **Acesso**: fgts.lunasdigital.com.br
- **Status**: Pronto para produção

**🎯 Agora o sistema será acessível diretamente pelo link fgts.lunasdigital.com.br!**
