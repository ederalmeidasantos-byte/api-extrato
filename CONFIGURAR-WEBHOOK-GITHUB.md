# 🔗 Configuração do Webhook GitHub → Portainer

## 📋 **Visão Geral**

Este guia configura o deploy automático quando você faz push no GitHub.

## 🚀 **Passo a Passo**

### **1. Configurar Personal Access Token**

1. **Acesse GitHub** → Settings → Developer settings → Personal access tokens
2. **Clique** em "Generate new token (classic)"
3. **Configure**:
   - Note: "API Lunas Deploy"
   - Expiration: "No expiration" (ou conforme necessário)
   - Scopes: Marque `repo`, `workflow`, `admin:repo_hook`
4. **Copie** o token gerado (ex: `ghp_xxxxxxxxxxxxxxxxxxxx`)

### **2. Configurar Credenciais no Portainer**

1. **Acesse Portainer**: `http://seu-ip:9000`
2. **Vá em**: Settings → Credentials
3. **Clique** em "Add credential"
4. **Configure**:
   - Name: "GitHub API Lunas"
   - Type: "Git"
   - Username: "seu-usuario-github"
   - Password: "ghp_xxxxxxxxxxxxxxxxxxxx" (token)
5. **Salve** a credencial

### **3. Configurar Webhook no GitHub**

1. **Acesse** seu repositório no GitHub
2. **Vá em**: Settings → Webhooks
3. **Clique** em "Add webhook"
4. **Configure**:
   - Payload URL: `http://seu-ip:9000/api/webhooks/github`
   - Content type: `application/json`
   - Secret: (deixe vazio)
   - Which events: "Just the push event"
   - Active: ✅ Marcado
5. **Clique** em "Add webhook"

### **4. Testar Deploy Automático**

1. **Faça uma mudança** no código
2. **Commit e push**:
   ```bash
   git add .
   git commit -m "teste deploy automático"
   git push origin master
   ```
3. **Acompanhe** no Portainer:
   - Vá em Containers → api-lunas-container
   - Veja logs em tempo real
   - Verifique se a API atualizou

## 🧪 **Testes de Validação**

### **Teste 1: Conectividade**
```bash
# Testar Portainer
curl http://seu-ip:9000

# Testar API
curl http://seu-ip:3000/api/sincronizar-clientes
```

### **Teste 2: Webhook Manual**
```bash
# Simular webhook
curl -X POST http://seu-ip:9000/api/webhooks/github \
  -H "Content-Type: application/json" \
  -d '{"ref":"refs/heads/master"}'
```

### **Teste 3: Deploy Completo**
1. **Modifique** um arquivo
2. **Push** para GitHub
3. **Verifique** se o container reiniciou
4. **Teste** se a API está funcionando

## 🔍 **Solução de Problemas**

### **Webhook não dispara**
- ✅ Verificar se a URL está correta
- ✅ Verificar se o repositório tem push events
- ✅ Verificar logs do GitHub (Settings → Webhooks → Recent Deliveries)

### **Deploy falha**
- ✅ Verificar logs do Portainer
- ✅ Verificar se o script tem permissão de execução
- ✅ Verificar se o Git está configurado corretamente

### **API não funciona**
- ✅ Verificar logs do container
- ✅ Verificar se as portas estão abertas
- ✅ Verificar se o banco de dados está acessível

## 📊 **Monitoramento**

### **No Portainer**
- **Containers**: Status em tempo real
- **Logs**: Logs de cada container
- **Métricas**: CPU, memória, rede
- **Timeline**: Histórico de eventos

### **Comandos Úteis**
```bash
# Status geral
docker-compose ps

# Logs em tempo real
docker-compose logs -f api-lunas-container

# Verificar webhook
curl -X POST http://localhost:9000/api/webhooks/github
```

## ✅ **Checklist de Configuração**

- [ ] Personal Access Token criado
- [ ] Credenciais configuradas no Portainer
- [ ] Webhook configurado no GitHub
- [ ] Scripts de deploy testados
- [ ] Deploy automático funcionando
- [ ] API respondendo corretamente
- [ ] Busca de clientes funcionando

## 🎉 **Conclusão**

Após seguir todos os passos, você terá:
- ✅ **Deploy automático** via push no GitHub
- ✅ **Interface visual** no Portainer
- ✅ **Monitoramento** completo
- ✅ **Rollback** fácil
- ✅ **Logs** em tempo real

**Agora é só fazer push no GitHub e ver a mágica acontecer! 🚀**