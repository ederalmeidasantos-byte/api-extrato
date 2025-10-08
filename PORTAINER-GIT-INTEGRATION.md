# 🔗 Integração Git + Portainer - Deploy Automático

## 📋 **Visão Geral**

Sim! O Portainer permite integração completa com Git para:
- ✅ **Deploy automático** via webhook do GitHub
- ✅ **Atualização de stacks** diretamente do repositório
- ✅ **Credenciais Git** configuradas no Portainer
- ✅ **Build automático** quando há push no repositório

## 🚀 **Configuração da Integração Git**

### **1. Configurar Credenciais Git no Portainer**

1. **Acesse Portainer**: `http://seu-ip:9000`
2. **Vá em**: Settings → Credentials
3. **Clique**: "Add credentials"
4. **Selecione**: Git
5. **Configure**:
   - **Nome**: `github-lunas-api`
   - **Tipo**: Personal Access Token
   - **Username**: `seu-usuario-github`
   - **Token**: `seu-token-github`

### **2. Criar Personal Access Token no GitHub**

1. **GitHub** → Settings → Developer settings
2. **Personal access tokens** → Tokens (classic)
3. **Generate new token** → Generate new token (classic)
4. **Permissões necessárias**:
   - ✅ `repo` (acesso completo ao repositório)
   - ✅ `workflow` (executar GitHub Actions)
   - ✅ `admin:repo_hook` (gerenciar webhooks)

### **3. Configurar Webhook do GitHub**

1. **Repositório** → Settings → Webhooks
2. **Add webhook**:
   - **Payload URL**: `http://seu-ip:9000/api/webhooks/github`
   - **Content type**: `application/json`
   - **Events**: `Just the push event`
   - **Active**: ✅

## 🔧 **Configuração do Docker Compose**

### **Atualizar docker-compose.yml**

```yaml
version: '3.8'

services:
  api-lunas:
    build: 
      context: .
      dockerfile: Dockerfile
    container_name: api-lunas
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
      - PORT=3002
      - GIT_REPO=https://github.com/seu-usuario/api-lunas.git
      - GIT_BRANCH=master
    volumes:
      - ./var:/app/var
      - ./.env:/app/.env
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped
    networks:
      - lunas-network

  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    environment:
      - PORTAINER_WEBHOOKS_ENABLED=true
    restart: unless-stopped
    networks:
      - lunas-network

networks:
  lunas-network:
    driver: bridge

volumes:
  portainer_data:
```

## 🎯 **Deploy Automático via Webhook**

### **1. Criar Script de Deploy**

```bash
#!/bin/bash
# deploy-webhook.sh

echo "🚀 Iniciando deploy automático..."

# Pull do repositório
git pull origin master

# Rebuild do container
docker-compose up -d --build api-lunas

# Verificar status
docker-compose ps

echo "✅ Deploy concluído!"
```

### **2. Configurar Webhook no Portainer**

1. **Portainer** → Stacks → api-lunas
2. **Editor** → Adicionar webhook
3. **URL do webhook**: `http://seu-ip:9000/api/webhooks/github`
4. **Script**: `deploy-webhook.sh`

## 📊 **Fluxo de Deploy Automático**

### **Quando você faz push no GitHub:**

1. **GitHub** envia webhook para Portainer
2. **Portainer** recebe notificação
3. **Script** executa `git pull`
4. **Docker** faz rebuild da imagem
5. **Container** reinicia com nova versão
6. **Logs** mostram progresso no Portainer

### **Timeline no Portainer:**
- ✅ **Webhook recebido** - 00:00:01
- ✅ **Git pull iniciado** - 00:00:02
- ✅ **Build da imagem** - 00:00:05
- ✅ **Container reiniciado** - 00:00:30
- ✅ **Deploy concluído** - 00:00:35

## 🔍 **Monitoramento e Logs**

### **Ver Deploy em Tempo Real:**
1. **Portainer** → Containers → api-lunas
2. **Logs** → Ver logs em tempo real
3. **Timeline** → Histórico de deploys

### **Logs Importantes:**
```bash
# Logs do webhook
docker logs portainer

# Logs da aplicação
docker logs api-lunas

# Logs do deploy
docker-compose logs -f api-lunas
```

## 🛠️ **Comandos Úteis**

### **Deploy Manual:**
```bash
# Deploy via Portainer
docker-compose up -d --build api-lunas

# Deploy via Git
git pull && docker-compose up -d --build api-lunas
```

### **Verificar Status:**
```bash
# Status dos containers
docker-compose ps

# Logs em tempo real
docker-compose logs -f api-lunas

# Verificar webhook
curl -X POST http://seu-ip:9000/api/webhooks/github
```

## 🎯 **Vantagens da Integração Git**

### **Comparado ao Deploy Manual:**
- ✅ **Automático** - Push = Deploy
- ✅ **Rápido** - Sem comandos manuais
- ✅ **Seguro** - Credenciais no Portainer
- ✅ **Rastreável** - Logs de cada deploy
- ✅ **Rollback** - Voltar versão anterior

### **Funcionalidades Extras:**
- 🔄 **Auto-rebuild** - Imagem atualizada automaticamente
- 📊 **Métricas** - Performance de cada deploy
- 🔧 **Configuração** - Variáveis de ambiente
- 📋 **Histórico** - Timeline completa

## 🚀 **Próximos Passos**

1. **Configurar** credenciais Git no Portainer
2. **Criar** Personal Access Token no GitHub
3. **Configurar** webhook do repositório
4. **Testar** deploy automático
5. **Monitorar** logs e performance

## 📞 **Suporte**

Se precisar de ajuda:
- **Webhook**: Verificar logs do Portainer
- **Deploy**: Usar script `deploy-webhook.sh`
- **Configuração**: Editar `docker-compose.yml`
- **Git**: Verificar credenciais no Portainer
