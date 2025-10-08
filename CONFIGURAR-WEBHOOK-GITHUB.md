# 🔗 Configurar Webhook GitHub + Portainer

## 📋 **Passo a Passo Completo**

### **1. Criar Personal Access Token no GitHub**

1. **Acesse**: [GitHub Settings](https://github.com/settings/tokens)
2. **Clique**: "Generate new token" → "Generate new token (classic)"
3. **Configure**:
   - **Note**: `Portainer API Lunas`
   - **Expiration**: `No expiration` (ou 1 ano)
   - **Scopes**:
     - ✅ `repo` (acesso completo ao repositório)
     - ✅ `workflow` (executar GitHub Actions)
     - ✅ `admin:repo_hook` (gerenciar webhooks)
     - ✅ `read:org` (ler organizações)

4. **Clique**: "Generate token"
5. **COPIE** o token gerado (você só verá uma vez!)

### **2. Configurar Credenciais no Portainer**

1. **Acesse Portainer**: `http://seu-ip:9000`
2. **Vá em**: Settings → Credentials
3. **Clique**: "Add credentials"
4. **Selecione**: Git
5. **Preencha**:
   - **Name**: `github-lunas-api`
   - **Username**: `seu-usuario-github`
   - **Password**: `seu-token-github` (cole o token aqui)
6. **Clique**: "Add credentials"

### **3. Configurar Webhook no Repositório GitHub**

1. **Acesse seu repositório** no GitHub
2. **Vá em**: Settings → Webhooks
3. **Clique**: "Add webhook"
4. **Configure**:
   - **Payload URL**: `http://seu-ip:9000/api/webhooks/github`
   - **Content type**: `application/json`
   - **Secret**: `sua-chave-secreta` (opcional, mas recomendado)
   - **Events**: `Just the push event`
   - **Active**: ✅ (marcado)

5. **Clique**: "Add webhook"

### **4. Testar Webhook**

1. **No GitHub**: Vá em Settings → Webhooks
2. **Clique** no webhook criado
3. **Clique**: "Recent Deliveries"
4. **Faça um push** no repositório
5. **Verifique** se aparece uma entrega com status 200

### **5. Configurar Deploy Automático no Portainer**

1. **Acesse Portainer**: `http://seu-ip:9000`
2. **Vá em**: Stacks → api-lunas
3. **Clique**: "Editor"
4. **Adicione** na seção de volumes do Portainer:
   ```yaml
   volumes:
     - /var/run/docker.sock:/var/run/docker.sock
     - portainer_data:/data
     - ./deploy-webhook.sh:/deploy-webhook.sh:ro
     - ./deploy-webhook.ps1:/deploy-webhook.ps1:ro
   ```

5. **Adicione** na seção de environment:
   ```yaml
   environment:
     - PORTAINER_WEBHOOKS_ENABLED=true
   ```

6. **Clique**: "Update the stack"

## 🔧 **Configuração Avançada**

### **Webhook com Autenticação**

Se quiser usar autenticação no webhook:

1. **No GitHub webhook**:
   - **Secret**: `sua-chave-secreta-forte`
   
2. **No Portainer**:
   - Configure a mesma chave secreta
   - O Portainer validará a assinatura do webhook

### **Filtrar Branches**

Para deployar apenas da branch master:

1. **No GitHub webhook**:
   - **Events**: `Just the push event`
   - **Branch**: `master` (se disponível)

2. **No script de deploy**:
   ```bash
   # Verificar branch
   BRANCH=$(git rev-parse --abbrev-ref HEAD)
   if [ "$BRANCH" != "master" ]; then
       echo "❌ Deploy apenas da branch master"
       exit 0
   fi
   ```

## 🚀 **Testando a Integração**

### **1. Teste Manual**

```bash
# No VPS, execute:
curl -X POST http://localhost:9000/api/webhooks/github \
  -H "Content-Type: application/json" \
  -d '{"ref":"refs/heads/master"}'
```

### **2. Teste com Push Real**

1. **Faça uma mudança** no código
2. **Commit e push**:
   ```bash
   git add .
   git commit -m "teste webhook"
   git push origin master
   ```
3. **Verifique** no Portainer se o deploy iniciou
4. **Monitore** os logs em tempo real

### **3. Verificar Logs**

```bash
# Logs do Portainer
docker logs portainer

# Logs da aplicação
docker logs api-lunas

# Logs do deploy
docker-compose logs -f api-lunas
```

## 🛠️ **Solução de Problemas**

### **Webhook não funciona**

1. **Verificar URL**: `http://seu-ip:9000/api/webhooks/github`
2. **Verificar firewall**: Porta 9000 deve estar aberta
3. **Verificar logs**: `docker logs portainer`
4. **Testar conectividade**: `curl http://seu-ip:9000`

### **Deploy falha**

1. **Verificar permissões**: Script deve ter execução
2. **Verificar Docker**: `docker-compose ps`
3. **Verificar logs**: `docker-compose logs api-lunas`
4. **Verificar Git**: `git status`

### **Container não inicia**

1. **Verificar build**: `docker-compose build api-lunas`
2. **Verificar imagem**: `docker images`
3. **Verificar volumes**: `docker volume ls`
4. **Verificar rede**: `docker network ls`

## 📊 **Monitoramento**

### **No Portainer**

1. **Containers**: Status em tempo real
2. **Logs**: Logs de cada container
3. **Métricas**: CPU, memória, rede
4. **Timeline**: Histórico de eventos

### **Comandos Úteis**

```bash
# Status geral
docker-compose ps

# Logs em tempo real
docker-compose logs -f api-lunas

# Rebuild manual
docker-compose up -d --build api-lunas

# Verificar webhook
curl -X POST http://localhost:9000/api/webhooks/github
```

## ✅ **Checklist de Configuração**

- [ ] Personal Access Token criado no GitHub
- [ ] Credenciais configuradas no Portainer
- [ ] Webhook criado no repositório GitHub
- [ ] Scripts de deploy criados
- [ ] Docker Compose atualizado
- [ ] Teste manual realizado
- [ ] Teste com push real realizado
- [ ] Logs verificados
- [ ] Monitoramento configurado

## 🎯 **Próximos Passos**

1. **Configurar** todas as etapas acima
2. **Testar** com um push real
3. **Monitorar** o primeiro deploy
4. **Configurar** alertas (opcional)
5. **Documentar** para a equipe

## 📞 **Suporte**

Se precisar de ajuda:
- **GitHub**: Verificar webhook deliveries
- **Portainer**: Verificar logs do container
- **Docker**: Verificar status dos containers
- **Scripts**: Verificar permissões e execução
