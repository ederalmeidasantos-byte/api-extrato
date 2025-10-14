# Deploy Sem Domínio - Disparador WhatsApp Kentro

## 🚀 Configuração para Acesso Direto por IP

O sistema foi configurado para funcionar **sem domínio**, apenas com IP direto do servidor.

### 📋 Configurações Aplicadas

#### 1. Nginx Configurado
- **server_name**: `_` (aceita qualquer IP)
- **Porta**: `80` (HTTP padrão)
- **Location**: `/whatsapp/` → proxy para porta 3004

#### 2. CORS Atualizado
- **ALLOWED_ORIGINS**: `http://IP_DO_SERVIDOR:3004,http://IP_DO_SERVIDOR:80`
- Aceita acesso direto por IP

### 🌐 URLs de Acesso

Após o deploy, você poderá acessar:

#### Interface Web
```
http://IP_DO_SERVIDOR/whatsapp/
```

#### API Direta
```
http://IP_DO_SERVIDOR/whatsapp/api/status
http://IP_DO_SERVIDOR/whatsapp/api/disparar
```

#### Acesso Direto ao Container (se necessário)
```
http://IP_DO_SERVIDOR:3004/
```

### 🔧 Deploy na VPS

#### 1. Substituir IP_DO_SERVIDOR
```bash
# Editar arquivo de configuração
nano config-vps-restructured.env

# Substituir IP_DO_SERVIDOR pelo IP real da VPS
# Exemplo: se o IP for 192.168.1.100
ALLOWED_ORIGINS=http://localhost:3004,http://192.168.1.100:3004,http://192.168.1.100:80
```

#### 2. Build e Deploy
```bash
# Build da imagem
docker-compose build whatsapp-dispatcher

# Iniciar serviço
docker-compose up -d whatsapp-dispatcher

# Reiniciar Nginx para aplicar configurações
docker-compose restart nginx
```

#### 3. Verificação
```bash
# Verificar se container está rodando
docker-compose ps whatsapp-dispatcher

# Testar acesso direto
curl http://IP_DO_SERVIDOR:3004/api/status

# Testar via Nginx
curl http://IP_DO_SERVIDOR/whatsapp/api/status
```

### 📱 Como Usar

1. **Acesse a interface**: `http://IP_DO_SERVIDOR/whatsapp/`
2. **Cole os números** no campo textarea
3. **Configure** templateId e queueId se necessário
4. **Clique em "Iniciar Disparo"**
5. **Acompanhe** o progresso em tempo real

### 🔒 Segurança

- ✅ CORS configurado apenas para IPs permitidos
- ✅ Rate limiting ativo no Nginx
- ✅ Validação de números brasileiros
- ✅ Mascaramento de números nos logs
- ✅ Timeout de 30s para API Kentro

### 🛠️ Troubleshooting

#### Se não conseguir acessar:

1. **Verificar firewall**:
   ```bash
   # Verificar se porta 80 está aberta
   netstat -tulpn | grep :80
   ```

2. **Verificar containers**:
   ```bash
   docker-compose ps
   docker-compose logs whatsapp-dispatcher
   docker-compose logs nginx
   ```

3. **Testar conectividade**:
   ```bash
   # Testar container direto
   curl http://localhost:3004/api/status
   
   # Testar via Nginx
   curl http://localhost/whatsapp/api/status
   ```

4. **Verificar configuração Nginx**:
   ```bash
   docker-compose exec nginx nginx -t
   ```

### 📊 Monitoramento

#### Logs em Tempo Real
```bash
# Logs do disparador
docker-compose logs -f whatsapp-dispatcher

# Logs do Nginx
docker-compose logs -f nginx
```

#### Status da API
```bash
# Via curl
curl http://IP_DO_SERVIDOR/whatsapp/api/status

# Via browser
http://IP_DO_SERVIDOR/whatsapp/api/status
```

### ✅ Checklist Final

- [ ] IP do servidor configurado no `ALLOWED_ORIGINS`
- [ ] Nginx configurado com `server_name _`
- [ ] Container `whatsapp-dispatcher` rodando
- [ ] Porta 80 acessível externamente
- [ ] Interface carregando em `http://IP/whatsapp/`
- [ ] API respondendo em `http://IP/whatsapp/api/status`
- [ ] Teste de disparo realizado com sucesso

---

**Sistema pronto para uso sem domínio! 🎉**

Acesse: `http://IP_DO_SERVIDOR/whatsapp/`
