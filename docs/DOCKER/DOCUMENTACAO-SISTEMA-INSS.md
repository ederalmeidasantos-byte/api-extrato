# 📋 DOCUMENTAÇÃO SISTEMA INSS - ARQUITETURA ATUAL

## 🎯 **STATUS: SISTEMA FUNCIONANDO - NÃO ALTERAR**

**Data da Documentação**: 03/01/2025  
**Versão**: Estável  
**Status**: ✅ OPERACIONAL

---

## 🏗️ **ARQUITETURA ATUAL**

### **Containers Docker**
```
┌─────────────────────────────────────────────────────────────┐
│                    DOCKER COMPOSE                           │
├─────────────────────────────────────────────────────────────┤
│  🌐 nginx-lunasdigital (porta 80/443)                       │
│     ├── lunasdigital.com.br → servidor-principal:3000      │
│     └── inss.lunasdigital.com.br → api-simulador:3002       │
│                                                             │
│  🖥️ servidor-principal-lunasdigital (porta 3000)           │
│     └── APIs gerais da Lunas Digital                       │
│                                                             │
│  📊 api-simulador-lunasdigital (porta 3002)                │
│     ├── Simulador HTML INSS                                │
│     ├── API /extrair                                       │
│     ├── API /api/calcular                                  │
│     ├── API /detalhesdaproposta                            │
│     └── API /api/salvar-cliente                            │
│                                                             │
│  🗄️ base-dados-lunasdigital (porta 3003)                   │
│     └── Banco de dados                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🌐 **ROTEAMENTO NGINX**

### **nginx.conf - Configuração Atual**
```nginx
user root;
worker_processes auto;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    upstream servidor_principal {
        server 172.18.0.6:3000; # IP do servidor-principal
    }
    
    upstream api_simulador {
        server 172.18.0.4:3002; # IP do api-simulador
    }

    # Domínio Principal
    server {
        listen 80;
        server_name lunasdigital.com.br www.lunasdigital.com.br localhost;
        
        location / {
            proxy_pass http://servidor_principal;
        }
    }

    # Subdomínio INSS - HTTP (redireciona para HTTPS)
    server {
        listen 80;
        server_name inss.lunasdigital.com.br;
        return 301 https://inss.lunasdigital.com.br$request_uri;
    }

    # Subdomínio INSS - HTTPS
    server {
        listen 443 ssl;
        server_name inss.lunasdigital.com.br;
        
        ssl_certificate /etc/letsencrypt/live/inss.lunasdigital.com.br/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/inss.lunasdigital.com.br/privkey.pem;
        
        location / {
            proxy_pass http://api_simulador;
            proxy_connect_timeout 180s;
            proxy_send_timeout 180s;
            proxy_read_timeout 180s;
        }
    }
}
```

---

## 📁 **ESTRUTURA DE ARQUIVOS**

### **Arquivos Críticos - NÃO ALTERAR**
```
📂 INSS/
├── 📄 server-inss.js          # ✅ FUNCIONANDO - Servidor API INSS
├── 📄 calculo.js              # ✅ FUNCIONANDO - Lógica de simulação
├── 📄 extrair_pdf.js          # ✅ FUNCIONANDO - Processamento ChatGPT
├── 📄 simulador-logic.js      # ✅ FUNCIONANDO - Frontend simulador
├── 📄 simulador.html          # ✅ FUNCIONANDO - Interface simulador
└── 📄 coeficientes_96.json    # ✅ FUNCIONANDO - Coeficientes bancários

📂 nginx/
└── 📄 nginx.conf              # ✅ FUNCIONANDO - Configuração roteamento

📂 var/data/
├── 📂 extratos/               # Cache de PDFs e JSONs processados
├── 📂 propostas/              # Propostas salvas pelos usuários
└── 📂 logs/                   # Logs do sistema

📄 docker-compose-lunasdigital.yml  # ✅ FUNCIONANDO - Orquestração Docker
📄 server.js                   # ✅ FUNCIONANDO - Servidor principal (sem INSS)
```

---

## 🔌 **APIS FUNCIONAIS**

### **1. Endpoint `/extrair` (POST)**
```bash
curl -X POST https://inss.lunasdigital.com.br/extrair \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "fileId=7539&idoportunidade=36337"
```

**Fluxo:**
1. ✅ Verifica cache (7 dias TTL)
2. ✅ Se não existe, baixa PDF da Kentro API
3. ✅ Processa com ChatGPT
4. ✅ Salva no cache
5. ✅ Retorna JSON com `simuladorLink`

**Resposta:**
```json
{
  "cliente": {...},
  "contratos": [...],
  "simuladorLink": "https://inss.lunasdigital.com.br/inss/simulador.html?extrato=7539"
}
```

### **2. Endpoint `/api/calcular/:fileId` (GET)**
```bash
curl https://inss.lunasdigital.com.br/api/calcular/7539
```

**Resposta:**
```json
{
  "success": true,
  "fileId": "7539",
  "matricula": "1975034969",
  "status": "aprovado",
  "contratos": [...],
  "contratos_inativos": [...],
  "resumo": {...},
  "simulador_link": "https://inss.lunasdigital.com.br/inss/simulador.html",
  "proposta_resumo_link": null
}
```

### **3. Endpoint `/detalhesdaproposta/:id` (GET)**
```bash
curl https://inss.lunasdigital.com.br/detalhesdaproposta/11
```
**Retorna:** Página HTML com detalhes da proposta

### **4. Endpoint `/api/salvar-cliente` (POST)**
```bash
curl -X POST https://inss.lunasdigital.com.br/api/salvar-cliente \
  -H "Content-Type: application/json" \
  -d '{"cpf":"70133703201","nome":"NELSON JOSE CAVASSONI DE OLIVEIRA",...}'
```

---

## 🔧 **CONFIGURAÇÕES CRÍTICAS**

### **Docker Compose - Portas**
```yaml
services:
  nginx-lunasdigital:
    ports:
      - "80:80"
      - "443:443"
  
  servidor-principal-lunasdigital:
    ports:
      - "3000:3000"
  
  api-simulador-lunasdigital:
    ports:
      - "3002:3002"  # ⚠️ CRÍTICO: Porta externa 3002
    environment:
      - PORT=3002    # ⚠️ CRÍTICO: Porta interna 3002
```

### **Variáveis de Ambiente**
```bash
# api-simulador-lunasdigital
NODE_ENV=production
PORT=3002
DB_SERVICE_URL=http://base-dados:3003
CONTAINER_NAME=api-simulador
KENTRO_API_KEY=cd4d0509169d4e2ea9177ac66c1c9376
```

### **Volumes Docker**
```yaml
volumes:
  - ./INSS:/app/INSS                    # ⚠️ CRÍTICO: Código INSS
  - ./var/data:/app/var/data            # ⚠️ CRÍTICO: Cache e dados
  - ./nginx/nginx.conf:/etc/nginx/nginx.conf  # ⚠️ CRÍTICO: Config Nginx
```

---

## 🚨 **REGRAS DE SEGURANÇA**

### **❌ NÃO FAZER:**
1. **NÃO alterar** `INSS/server-inss.js` sem backup
2. **NÃO alterar** `nginx/nginx.conf` sem backup
3. **NÃO alterar** `docker-compose-lunasdigital.yml` sem backup
4. **NÃO alterar** portas dos containers
5. **NÃO alterar** estrutura de volumes Docker
6. **NÃO remover** certificados SSL
7. **NÃO alterar** arquivos de cache em `var/data/`

### **✅ PODE FAZER:**
1. **Adicionar** novos endpoints no `server-inss.js`
2. **Adicionar** novas funcionalidades no frontend
3. **Adicionar** novos arquivos de dados
4. **Adicionar** logs para debug
5. **Atualizar** documentação

---

## 🔍 **COMANDOS DE DIAGNÓSTICO**

### **Verificar Status dos Containers**
```bash
docker ps
docker logs api-simulador-lunasdigital --tail 20
docker logs nginx-lunasdigital --tail 20
```

### **Testar APIs**
```bash
# Testar extrair
curl -X POST https://inss.lunasdigital.com.br/extrair \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "fileId=7539&idoportunidade=36337"

# Testar calcular
curl https://inss.lunasdigital.com.br/api/calcular/7539
```

### **Verificar Cache**
```bash
ls -la /root/api-lunas/var/data/extratos/
ls -la /root/api-lunas/var/data/propostas/
```

---

## 📊 **MONITORAMENTO**

### **Logs Importantes**
- **API Simulador**: `docker logs api-simulador-lunasdigital --follow`
- **Nginx**: `docker logs nginx-lunasdigital --follow`
- **Servidor Principal**: `docker logs servidor-principal-lunasdigital --follow`

### **Métricas de Performance**
- **Cache Hit Rate**: Verificar arquivos em `var/data/extratos/`
- **Tempo de Resposta**: ChatGPT ~27s, Cache ~1s
- **Uptime**: `docker ps` para verificar containers rodando

---

## 🆘 **PROCEDIMENTOS DE EMERGÊNCIA**

### **Se algo parar de funcionar:**

1. **Verificar containers:**
   ```bash
   docker ps
   docker restart api-simulador-lunasdigital
   ```

2. **Verificar logs:**
   ```bash
   docker logs api-simulador-lunasdigital --tail 50
   ```

3. **Restaurar backup:**
   ```bash
   # Restaurar arquivos críticos do backup
   cp backup/server-inss.js INSS/
   cp backup/nginx.conf nginx/
   docker restart api-simulador-lunasdigital nginx-lunasdigital
   ```

4. **Reiniciar tudo:**
   ```bash
   docker-compose -f docker-compose-lunasdigital.yml down
   docker-compose -f docker-compose-lunasdigital.yml up -d
   ```

---

## 📝 **CHANGELOG**

### **v1.0 - 03/01/2025 - ESTÁVEL**
- ✅ Arquitetura consolidada
- ✅ INSS separado do servidor principal
- ✅ HTTPS configurado
- ✅ Cache funcionando
- ✅ APIs integradas
- ✅ Documentação completa

---

## 👥 **CONTATOS**

**Sistema**: INSS Simulador Lunas Digital  
**Ambiente**: Produção  
**Última Atualização**: 03/01/2025  

**⚠️ IMPORTANTE: Este sistema está funcionando perfeitamente. Qualquer alteração deve ser feita com extremo cuidado e sempre com backup prévio.**
