# 🐳 DOCUMENTAÇÃO DOCKER & NGINX - CONFIGURAÇÃO ATUAL

## 🎯 **STATUS: CONFIGURAÇÃO FUNCIONANDO - NÃO ALTERAR**

**Data**: 03/01/2025  
**Ambiente**: Produção  
**Status**: ✅ OPERACIONAL

---

## 🐳 **DOCKER COMPOSE - CONFIGURAÇÃO ATUAL**

### **Arquivo: `docker-compose-lunasdigital.yml`**

```yaml
version: '3.8'

services:
  # 🌐 NGINX - Proxy Reverso
  nginx-lunasdigital:
    image: nginx:alpine
    container_name: nginx-lunasdigital
    ports:
      - "80:80"      # HTTP
      - "443:443"    # HTTPS
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - servidor-principal
      - api-simulador
    restart: unless-stopped
    networks:
      - lunas-network

  # 🖥️ SERVIDOR PRINCIPAL
  servidor-principal:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: servidor-principal-lunasdigital
    ports:
      - "3000:3000"
    env_file:
      - config-vps-restructured.env
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_SERVICE_URL=http://base-dados:3003
      - CONTAINER_NAME=servidor-principal
    depends_on:
      - base-dados
    restart: unless-stopped
    networks:
      - lunas-network
    volumes:
      - ./var/data:/app/var/data

  # 📊 API SIMULADOR INSS
  api-simulador:
    build:
      context: .
      dockerfile: Dockerfile.inss
    container_name: api-simulador-lunasdigital
    ports:
      - "3002:3002"  # ⚠️ CRÍTICO: Porta externa 3002
    env_file:
      - config-vps-restructured.env
    environment:
      - NODE_ENV=production
      - PORT=3002    # ⚠️ CRÍTICO: Porta interna 3002
      - DB_SERVICE_URL=http://base-dados:3003
      - CONTAINER_NAME=api-simulador
    depends_on:
      - base-dados
    restart: unless-stopped
    networks:
      - lunas-network
    volumes:
      - ./INSS:/app/INSS
      - ./var/data:/app/var/data

  # 🗄️ BANCO DE DADOS
  base-dados:
    image: mongo:latest
    container_name: base-dados-lunasdigital
    ports:
      - "3003:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped
    networks:
      - lunas-network

volumes:
  mongodb_data:

networks:
  lunas-network:
    driver: bridge
```

---

## 🌐 **NGINX - CONFIGURAÇÃO ATUAL**

### **Arquivo: `nginx/nginx.conf`**

```nginx
user root;
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # ⚠️ CRÍTICO: IPs dos containers (podem mudar)
    upstream servidor_principal {
        server 172.18.0.6:3000; # IP do servidor-principal
    }
    
    upstream api_simulador {
        server 172.18.0.4:3002; # IP do api-simulador
    }

    # 🌐 DOMÍNIO PRINCIPAL - lunasdigital.com.br
    server {
        listen 80;
        server_name lunasdigital.com.br www.lunasdigital.com.br localhost;
        
        location / {
            proxy_pass http://servidor_principal;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # 🔄 REDIRECIONAMENTO HTTP → HTTPS - inss.lunasdigital.com.br
    server {
        listen 80;
        server_name inss.lunasdigital.com.br;
        return 301 https://inss.lunasdigital.com.br$request_uri;
    }

    # 🔒 SUBDOMÍNIO INSS - HTTPS
    server {
        listen 443 ssl;
        server_name inss.lunasdigital.com.br;
        
        # ⚠️ CRÍTICO: Certificados SSL
        ssl_certificate /etc/letsencrypt/live/inss.lunasdigital.com.br/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/inss.lunasdigital.com.br/privkey.pem;
        
        # Configurações SSL
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        
        # ⚠️ CRÍTICO: Timeouts para ChatGPT
        location / {
            proxy_pass http://api_simulador;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts para processamento ChatGPT
            proxy_connect_timeout 180s;
            proxy_send_timeout 180s;
            proxy_read_timeout 180s;
        }
    }
}
```

---

## 🔧 **CONFIGURAÇÕES CRÍTICAS**

### **Portas Docker**
```yaml
# ⚠️ NÃO ALTERAR ESTAS PORTAS
nginx-lunasdigital:     80:80, 443:443
servidor-principal:     3000:3000
api-simulador:          3002:3002  # CRÍTICO
base-dados:             3003:27017
```

### **Variáveis de Ambiente**
```bash
# api-simulador-lunasdigital
NODE_ENV=production
PORT=3002                    # ⚠️ CRÍTICO
DB_SERVICE_URL=http://base-dados:3003
CONTAINER_NAME=api-simulador
KENTRO_API_KEY=cd4d0509169d4e2ea9177ac66c1c9376

# servidor-principal-lunasdigital
NODE_ENV=production
PORT=3000                    # ⚠️ CRÍTICO
DB_SERVICE_URL=http://base-dados:3003
CONTAINER_NAME=servidor-principal
```

### **Volumes Docker**
```yaml
# ⚠️ CRÍTICO: Estes volumes devem existir
volumes:
  - ./nginx/nginx.conf:/etc/nginx/nginx.conf
  - /etc/letsencrypt:/etc/letsencrypt:ro
  - ./INSS:/app/INSS
  - ./var/data:/app/var/data
```

---

## 🌐 **ROTEAMENTO NGINX**

### **Domínio Principal**
```
lunasdigital.com.br → servidor-principal:3000
```

### **Subdomínio INSS**
```
inss.lunasdigital.com.br → api-simulador:3002
```

### **Redirecionamentos**
```
HTTP → HTTPS (inss.lunasdigital.com.br)
```

---

## 🔒 **CERTIFICADOS SSL**

### **Localização**
```
/etc/letsencrypt/live/inss.lunasdigital.com.br/
├── fullchain.pem
├── privkey.pem
├── cert.pem
└── chain.pem
```

### **Renovação Automática**
```bash
# Certbot já configurado
certbot renew --dry-run
```

---

## 🚀 **COMANDOS DE GERENCIAMENTO**

### **Iniciar Sistema**
```bash
docker-compose -f docker-compose-lunasdigital.yml up -d
```

### **Parar Sistema**
```bash
docker-compose -f docker-compose-lunasdigital.yml down
```

### **Reiniciar Container Específico**
```bash
docker restart api-simulador-lunasdigital
docker restart nginx-lunasdigital
docker restart servidor-principal-lunasdigital
```

### **Ver Logs**
```bash
docker logs api-simulador-lunasdigital --follow
docker logs nginx-lunasdigital --follow
docker logs servidor-principal-lunasdigital --follow
```

### **Verificar Status**
```bash
docker ps
docker network ls
docker volume ls
```

---

## 🔍 **DIAGNÓSTICO DE PROBLEMAS**

### **Container não inicia**
```bash
# Verificar logs
docker logs api-simulador-lunasdigital

# Verificar portas em uso
netstat -tulpn | grep :3002
```

### **Nginx não funciona**
```bash
# Verificar configuração
nginx -t

# Verificar certificados
ls -la /etc/letsencrypt/live/inss.lunasdigital.com.br/

# Verificar logs
docker logs nginx-lunasdigital
```

### **APIs não respondem**
```bash
# Testar conectividade interna
docker exec api-simulador-lunasdigital curl http://localhost:3002/extrair

# Verificar rede Docker
docker network inspect lunas-network
```

---

## 📊 **MONITORAMENTO**

### **Comandos de Status**
```bash
# Status geral
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Uso de recursos
docker stats --no-stream

# Espaço em disco
df -h
du -sh /var/lib/docker/
```

### **Logs Importantes**
```bash
# Logs em tempo real
docker logs api-simulador-lunasdigital --follow --tail 0
docker logs nginx-lunasdigital --follow --tail 0

# Logs com timestamp
docker logs api-simulador-lunasdigital --timestamps
```

---

## 🆘 **PROCEDIMENTOS DE EMERGÊNCIA**

### **Se Nginx parar**
```bash
# Verificar configuração
docker exec nginx-lunasdigital nginx -t

# Reiniciar
docker restart nginx-lunasdigital

# Se não funcionar, restaurar backup
cp backup/nginx.conf nginx/
docker restart nginx-lunasdigital
```

### **Se API Simulador parar**
```bash
# Verificar logs
docker logs api-simulador-lunasdigital --tail 50

# Reiniciar
docker restart api-simulador-lunasdigital

# Se não funcionar, restaurar backup
cp backup/server-inss.js INSS/
docker restart api-simulador-lunasdigital
```

### **Se certificado SSL expirar**
```bash
# Renovar certificado
certbot renew

# Reiniciar Nginx
docker restart nginx-lunasdigital
```

---

## ⚠️ **REGRAS DE SEGURANÇA**

### **❌ NÃO FAZER:**
1. **NÃO alterar** portas dos containers
2. **NÃO alterar** configuração Nginx sem backup
3. **NÃO alterar** variáveis de ambiente críticas
4. **NÃO remover** volumes Docker
5. **NÃO alterar** certificados SSL manualmente
6. **NÃO alterar** rede Docker

### **✅ PODE FAZER:**
1. **Adicionar** novos containers
2. **Adicionar** novos volumes
3. **Adicionar** logs de debug
4. **Atualizar** documentação
5. **Fazer backup** antes de alterações

---

## 📝 **BACKUP E RESTAURAÇÃO**

### **Arquivos Críticos para Backup**
```bash
# Configurações
cp docker-compose-lunasdigital.yml backup/
cp nginx/nginx.conf backup/
cp INSS/server-inss.js backup/

# Dados
tar -czf backup/var-data-$(date +%Y%m%d).tar.gz var/data/
```

### **Restauração**
```bash
# Restaurar configurações
cp backup/docker-compose-lunasdigital.yml .
cp backup/nginx.conf nginx/
cp backup/server-inss.js INSS/

# Restaurar dados
tar -xzf backup/var-data-YYYYMMDD.tar.gz

# Reiniciar containers
docker-compose -f docker-compose-lunasdigital.yml restart
```

---

## 📋 **CHECKLIST DE MANUTENÇÃO**

### **Diário**
- [ ] Verificar status dos containers (`docker ps`)
- [ ] Verificar logs de erro (`docker logs`)

### **Semanal**
- [ ] Verificar espaço em disco (`df -h`)
- [ ] Verificar certificados SSL (`certbot certificates`)
- [ ] Backup dos dados (`tar -czf backup/...`)

### **Mensal**
- [ ] Atualizar documentação
- [ ] Revisar logs antigos
- [ ] Testar procedimentos de emergência

---

**⚠️ IMPORTANTE: Esta configuração está funcionando perfeitamente. Qualquer alteração deve ser feita com extremo cuidado e sempre com backup prévio.**

**Última atualização**: 03/01/2025
