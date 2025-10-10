# 🚀 SISTEMA INSS LUNAS DIGITAL - DOCUMENTAÇÃO COMPLETA

## 🎯 **STATUS: SISTEMA FUNCIONANDO PERFEITAMENTE**

**Data**: 03/01/2025  
**Versão**: Estável  
**Ambiente**: Produção  
**Status**: ✅ OPERACIONAL

---

## 📋 **ÍNDICE DA DOCUMENTAÇÃO**

### **📚 Documentos Principais**
- **[📋 DOCUMENTAÇÃO-SISTEMA-INSS.md](./DOCUMENTACAO-SISTEMA-INSS.md)** - Arquitetura geral e visão completa
- **[🔌 DOCUMENTAÇÃO-APIS-INSS.md](./DOCUMENTACAO-APIS-INSS.md)** - Endpoints e funcionalidades das APIs
- **[🐳 DOCUMENTAÇÃO-DOCKER-NGINX.md](./DOCUMENTACAO-DOCKER-NGINX.md)** - Configuração Docker e Nginx
- **[🆘 MANUAL-TROUBLESHOOTING.md](./MANUAL-TROUBLESHOOTING.md)** - Solução de problemas e emergências

---

## 🏗️ **ARQUITETURA RESUMIDA**

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA INSS LUNAS                      │
├─────────────────────────────────────────────────────────────┤
│  🌐 lunasdigital.com.br → Servidor Principal (porta 3000)   │
│  🌐 inss.lunasdigital.com.br → API Simulador (porta 3002)   │
│                                                             │
│  📊 APIs Funcionais:                                        │
│     ├── POST /extrair (Kentro → ChatGPT → Cache)           │
│     ├── GET /api/calcular/:fileId (Simulação completa)     │
│     ├── POST /api/salvar-cliente (Banco de dados)          │
│     ├── POST /api/salvar-proposta (Propostas)              │
│     └── GET /detalhesdaproposta/:id (Página HTML)          │
│                                                             │
│  🔒 HTTPS com certificados SSL válidos                     │
│  💾 Cache inteligente (7 dias TTL)                        │
│  🐳 Docker com containers isolados                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 **INÍCIO RÁPIDO**

### **1. Verificar Status do Sistema**
```bash
# Status dos containers
docker ps

# Testar APIs
curl https://inss.lunasdigital.com.br/api/calcular/7539
curl -X POST https://inss.lunasdigital.com.br/extrair \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "fileId=7539&idoportunidade=36337"
```

### **2. Comandos Essenciais**
```bash
# Reiniciar sistema
docker-compose -f docker-compose-lunasdigital.yml restart

# Ver logs
docker logs api-simulador-lunasdigital --follow

# Backup
tar -czf backup-$(date +%Y%m%d).tar.gz INSS/ nginx/ var/data/
```

---

## 🔌 **APIS PRINCIPAIS**

### **POST /extrair**
- **Função**: Baixa PDF da Kentro, processa com ChatGPT
- **Cache**: 7 dias TTL
- **Timeout**: 180s (Nginx)
- **Retorna**: Dados estruturados + simuladorLink

### **GET /api/calcular/:fileId**
- **Função**: Calcula simulação de troco
- **Retorna**: Contratos elegíveis, troco total, status
- **Links**: simulador_link, proposta_resumo_link

### **POST /api/salvar-cliente**
- **Função**: Salva dados do cliente no banco
- **Retorna**: clientId gerado

### **POST /api/salvar-proposta**
- **Função**: Salva proposta de refinanciamento
- **Retorna**: propostaId gerado

---

## 🐳 **CONTAINERS DOCKER**

| Container | Porta | Função | Status |
|-----------|-------|--------|--------|
| `nginx-lunasdigital` | 80/443 | Proxy reverso | ✅ |
| `servidor-principal-lunasdigital` | 3000 | APIs gerais | ✅ |
| `api-simulador-lunasdigital` | 3002 | Simulador INSS | ✅ |
| `base-dados-lunasdigital` | 3003 | MongoDB | ✅ |

---

## 🔧 **CONFIGURAÇÕES CRÍTICAS**

### **Portas (NÃO ALTERAR)**
```yaml
nginx: 80:80, 443:443
servidor-principal: 3000:3000
api-simulador: 3002:3002  # CRÍTICO
base-dados: 3003:27017
```

### **Variáveis de Ambiente**
```bash
# api-simulador
PORT=3002
NODE_ENV=production
KENTRO_API_KEY=cd4d0509169d4e2ea9177ac66c1c9376

# servidor-principal
PORT=3000
NODE_ENV=production
```

### **Volumes Docker**
```yaml
volumes:
  - ./nginx/nginx.conf:/etc/nginx/nginx.conf
  - /etc/letsencrypt:/etc/letsencrypt:ro
  - ./INSS:/app/INSS
  - ./var/data:/app/var/data
```

---

## 🚨 **REGRAS DE SEGURANÇA**

### **❌ NÃO FAZER:**
1. **NÃO alterar** portas dos containers
2. **NÃO alterar** arquivos críticos sem backup
3. **NÃO alterar** configuração Nginx sem backup
4. **NÃO alterar** certificados SSL manualmente
5. **NÃO remover** volumes Docker
6. **NÃO alterar** estrutura de cache

### **✅ PODE FAZER:**
1. **Adicionar** novos endpoints
2. **Adicionar** funcionalidades frontend
3. **Adicionar** logs de debug
4. **Atualizar** documentação
5. **Fazer backup** antes de alterações

---

## 🔍 **DIAGNÓSTICO RÁPIDO**

### **Sistema Funcionando?**
```bash
# 1. Verificar containers
docker ps | grep -E "(api-simulador|nginx)"

# 2. Testar API
curl -s -o /dev/null -w "%{http_code}" https://inss.lunasdigital.com.br/api/calcular/7539
# Deve retornar: 200

# 3. Verificar logs
docker logs api-simulador-lunasdigital --tail 5
```

### **Problemas Comuns**
- **502 Bad Gateway**: Container API não está rodando
- **404 Not Found**: Endpoint não existe ou arquivo corrompido
- **Timeout**: Nginx timeout muito baixo ou ChatGPT demorando
- **SSL Error**: Certificado expirado ou inválido

---

## 🆘 **EMERGÊNCIA**

### **Sistema Parado**
```bash
# 1. Parar tudo
docker-compose -f docker-compose-lunasdigital.yml down

# 2. Limpar portas
sudo kill -9 $(lsof -t -i:3002) 2>/dev/null

# 3. Reiniciar
docker-compose -f docker-compose-lunasdigital.yml up -d

# 4. Verificar
docker ps
```

### **Restaurar Backup**
```bash
# 1. Parar containers
docker-compose -f docker-compose-lunasdigital.yml down

# 2. Restaurar arquivos
cp backup/server-inss.js INSS/
cp backup/nginx.conf nginx/

# 3. Reiniciar
docker-compose -f docker-compose-lunasdigital.yml up -d
```

---

## 📊 **MONITORAMENTO**

### **Logs Importantes**
```bash
# Logs em tempo real
docker logs api-simulador-lunasdigital --follow --tail 0
docker logs nginx-lunasdigital --follow --tail 0

# Logs com timestamp
docker logs api-simulador-lunasdigital --timestamps
```

### **Métricas**
- **Cache Hit Rate**: Verificar arquivos em `var/data/extratos/`
- **Tempo de Resposta**: ChatGPT ~27s, Cache ~1s
- **Uptime**: `docker ps` para verificar containers

---

## 📝 **CHANGELOG**

### **v1.0 - 03/01/2025 - ESTÁVEL**
- ✅ Arquitetura consolidada e funcionando
- ✅ INSS separado do servidor principal
- ✅ HTTPS configurado com certificados válidos
- ✅ Cache inteligente funcionando (7 dias TTL)
- ✅ APIs integradas e testadas
- ✅ Documentação completa criada
- ✅ Procedimentos de emergência definidos

---

## 📞 **SUPORTE**

### **Níveis de Prioridade**
- **🔴 CRÍTICO**: Sistema fora do ar → Ação imediata
- **🟡 ALTO**: Funcionalidade limitada → 30min para resposta
- **🟢 BAIXO**: Problemas menores → 2h para resposta

### **Recursos de Suporte**
- **Documentação**: Este README + documentos específicos
- **Logs**: `docker logs` para diagnóstico
- **Backup**: Arquivos em `backup/` antes de alterações
- **Testes**: Scripts de verificação incluídos

---

## ⚠️ **AVISO IMPORTANTE**

**Este sistema está funcionando perfeitamente em produção. Qualquer alteração deve ser feita com extremo cuidado e sempre com backup prévio.**

**Arquivos críticos que NÃO devem ser alterados sem backup:**
- `INSS/server-inss.js`
- `nginx/nginx.conf`
- `docker-compose-lunasdigital.yml`
- `config-vps-restructured.env`

**Sempre consulte a documentação específica antes de fazer alterações.**

---

**📅 Última atualização**: 03/01/2025  
**👨‍💻 Sistema**: INSS Simulador Lunas Digital  
**🌐 Ambiente**: Produção  
**✅ Status**: OPERACIONAL
