# 🚀 Deploy Automático: Git + Portainer + Docker

## 📋 **Visão Geral**

Este projeto implementa um sistema completo de **deploy automático** usando:
- 🔗 **GitHub** - Repositório de código
- 🐳 **Portainer** - Interface visual para Docker
- 🐳 **Docker** - Containerização da aplicação
- ⚡ **Webhooks** - Deploy automático via push

### **Como Funciona:**
1. **Push no GitHub** → Webhook enviado para Portainer
2. **Portainer recebe** → Executa script de deploy automático
3. **Script executa** → `git pull` + `docker build` + `docker up`
4. **Deploy concluído** → Nova versão rodando automaticamente

## 🎯 **Funcionalidades**

- ✅ **Deploy automático** via webhook do GitHub
- ✅ **Interface visual** no Portainer (similar ao Render)
- ✅ **Logs em tempo real** de cada deploy
- ✅ **Timeline de deploys** com histórico completo
- ✅ **Rollback fácil** para versões anteriores
- ✅ **Monitoramento** de CPU, memória e rede
- ✅ **Scripts multiplataforma** (Linux e Windows)

## 🏗️ **Arquitetura**

```
GitHub Repository
       ↓ (webhook)
   Portainer (VPS)
       ↓ (executa)
   Deploy Script
       ↓ (comandos)
   Docker Compose
       ↓ (build/up)
   API Lunas Container
```

## 📁 **Estrutura de Arquivos**

```
API Lunas/
├── 📄 README-GIT-PORTAINER.md          # Este arquivo
├── 📄 PORTAINER-GIT-INTEGRATION.md     # Documentação técnica
├── 📄 CONFIGURAR-WEBHOOK-GITHUB.md     # Guia de configuração
├── 🐳 docker-compose.yml               # Configuração Docker + Portainer
├── 🐳 Dockerfile                       # Imagem da aplicação
├── 🚀 deploy-webhook.sh                # Script de deploy (Linux)
├── 🚀 deploy-webhook.ps1               # Script de deploy (Windows)
└── 📁 var/                             # Dados persistentes
```

## 🚀 **Configuração Rápida**

### **1. Pré-requisitos**

- ✅ **VPS/Server** com Docker e Docker Compose
- ✅ **Repositório GitHub** com o código
- ✅ **Acesso SSH** ao servidor
- ✅ **Porta 9000** liberada (Portainer)

### **2. Instalação**

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/api-lunas.git
cd api-lunas

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações

# 3. Inicie os serviços
docker-compose up -d

# 4. Acesse o Portainer
# http://seu-ip:9000
```

### **3. Configuração do GitHub**

1. **Criar Personal Access Token**:
   - GitHub → Settings → Developer settings → Personal access tokens
   - Permissões: `repo`, `workflow`, `admin:repo_hook`

2. **Configurar Webhook**:
   - Repositório → Settings → Webhooks
   - URL: `http://seu-ip:9000/api/webhooks/github`
   - Eventos: `Just the push event`

3. **Configurar Credenciais no Portainer**:
   - Portainer → Settings → Credentials
   - Adicionar credenciais Git com o token

## 🔧 **Configuração Detalhada**

### **Docker Compose**

```yaml
version: '3.8'

services:
  api-lunas:
    build: .
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
      - ./deploy-webhook.sh:/deploy-webhook.sh:ro
      - ./deploy-webhook.ps1:/deploy-webhook.ps1:ro
    environment:
      - PORTAINER_WEBHOOKS_ENABLED=true
    restart: unless-stopped
    networks:
      - lunas-network
```

### **Script de Deploy (Linux)**

```bash
#!/bin/bash
# deploy-webhook.sh

echo "🚀 Iniciando deploy automático..."

# 1. Git pull
git pull origin master

# 2. Rebuild container
docker-compose up -d --build api-lunas

# 3. Verificar status
docker-compose ps

echo "✅ Deploy concluído!"
```

### **Script de Deploy (Windows)**

```powershell
# deploy-webhook.ps1

Write-Host "🚀 Iniciando deploy automático..."

# 1. Git pull
git pull origin master

# 2. Rebuild container
docker-compose up -d --build api-lunas

# 3. Verificar status
docker-compose ps

Write-Host "✅ Deploy concluído!"
```

## 🎮 **Como Usar**

### **Deploy Automático**

1. **Faça mudanças** no código
2. **Commit e push**:
   ```bash
   git add .
   git commit -m "nova funcionalidade"
   git push origin master
   ```
3. **Acompanhe** no Portainer:
   - Acesse `http://seu-ip:9000`
   - Vá em Containers → api-lunas
   - Veja logs em tempo real

### **Deploy Manual**

```bash
# Via Docker Compose
docker-compose up -d --build api-lunas

# Via script
./deploy-webhook.sh

# Via PowerShell
.\deploy-webhook.ps1
```

### **Monitoramento**

1. **Portainer Interface**:
   - Containers: Status em tempo real
   - Logs: Logs de cada container
   - Métricas: CPU, memória, rede
   - Timeline: Histórico de eventos

2. **Comandos Úteis**:
   ```bash
   # Status geral
   docker-compose ps
   
   # Logs em tempo real
   docker-compose logs -f api-lunas
   
   # Verificar webhook
   curl -X POST http://localhost:9000/api/webhooks/github
   ```

## 🔍 **Testes e Validação**

### **Teste 1: Conectividade**

```bash
# Testar Portainer
curl http://seu-ip:9000

# Testar API
curl http://seu-ip:3002/health

# Testar webhook
curl -X POST http://seu-ip:9000/api/webhooks/github
```

### **Teste 2: Deploy Manual**

```bash
# Testar script de deploy
./deploy-webhook.sh

# Verificar logs
docker-compose logs api-lunas

# Verificar status
docker-compose ps
```

### **Teste 3: Deploy Automático**

1. **Fazer push** no repositório
2. **Verificar webhook** no GitHub (Settings → Webhooks)
3. **Acompanhar logs** no Portainer
4. **Verificar** se a aplicação atualizou

## 🛠️ **Solução de Problemas**

### **Webhook não funciona**

```bash
# Verificar logs do Portainer
docker logs portainer

# Verificar conectividade
curl http://seu-ip:9000

# Verificar firewall
sudo ufw status
```

### **Deploy falha**

```bash
# Verificar logs da aplicação
docker logs api-lunas

# Verificar build
docker-compose build api-lunas

# Verificar permissões
chmod +x deploy-webhook.sh
```

### **Container não inicia**

```bash
# Verificar imagem
docker images

# Verificar volumes
docker volume ls

# Verificar rede
docker network ls
```

## 📊 **Monitoramento e Métricas**

### **No Portainer**

- **CPU Usage**: Uso de processador
- **Memory Usage**: Uso de memória
- **Network I/O**: Tráfego de rede
- **Disk I/O**: Uso de disco

### **Logs Importantes**

```bash
# Logs do webhook
docker logs portainer

# Logs da aplicação
docker logs api-lunas

# Logs do deploy
docker-compose logs -f api-lunas
```

## 🎯 **Vantagens vs Deploy Manual**

| Aspecto | Deploy Manual | Git + Portainer |
|---------|---------------|-----------------|
| **Velocidade** | Lento (comandos manuais) | Rápido (automático) |
| **Interface** | Terminal | Visual (Portainer) |
| **Logs** | Comando por comando | Timeline visual |
| **Rollback** | Complicado | Um clique |
| **Monitoramento** | Limitado | Completo |
| **Histórico** | Não rastreável | Timeline completa |

## 🚀 **Próximos Passos**

1. **Configurar** todas as etapas acima
2. **Testar** com um push real
3. **Configurar** alertas (opcional)
4. **Documentar** para a equipe
5. **Expandir** para outros projetos

## 📞 **Suporte**

### **Documentação Adicional**

- `PORTAINER-GIT-INTEGRATION.md` - Documentação técnica completa
- `CONFIGURAR-WEBHOOK-GITHUB.md` - Guia passo a passo

### **Comandos de Emergência**

```bash
# Parar tudo
docker-compose down

# Rebuild completo
docker-compose up -d --build --force-recreate

# Ver logs de erro
docker-compose logs --tail=50 api-lunas
```

## ✅ **Checklist de Configuração**

- [ ] VPS configurado com Docker
- [ ] Repositório GitHub criado
- [ ] Personal Access Token gerado
- [ ] Webhook configurado no GitHub
- [ ] Credenciais configuradas no Portainer
- [ ] Scripts de deploy testados
- [ ] Deploy automático funcionando
- [ ] Monitoramento configurado
- [ ] Documentação atualizada

---

**🎉 Parabéns! Seu sistema de deploy automático está pronto!**

Agora você pode fazer push no GitHub e ver a mágica acontecer automaticamente no Portainer! 🚀
