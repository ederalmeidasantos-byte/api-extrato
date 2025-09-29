# 🚀 GUIA RÁPIDO - PERSISTENT DISK E CACHE

## 📋 **REFERÊNCIA RÁPIDA**

### **Estrutura do Persistent Disk:**
```
/var/data/
├── cache/          # Cache FGTS (pendentes, tentativas, estado)
├── extratos/       # Extratos JSON processados
├── uploads/        # Arquivos enviados (CSV, PDF)
├── logs/           # Logs do sistema
└── config/         # Configurações persistentes
```

---

## 🔌 **APIS PRINCIPAIS**

### **Cache:**
```bash
POST /api/cache/save          # Salvar cache
GET  /api/cache/load/:file    # Carregar cache
GET  /api/cache/list          # Listar arquivos
```

### **Extratos:**
```bash
POST /api/extratos/save       # Salvar extrato
GET  /api/extratos/:id        # Carregar extrato
GET  /api/extratos/list       # Listar extratos
```

### **Uploads:**
```bash
POST /api/uploads/save        # Salvar upload
GET  /api/uploads/list        # Listar uploads
```

### **Logs:**
```bash
POST /api/logs/save           # Salvar log
GET  /api/logs/list           # Listar logs
```

### **Config:**
```bash
POST /api/config/save         # Salvar config
GET  /api/config/load/:file   # Carregar config
GET  /api/config/list         # Listar configs
```

### **Monitoramento:**
```bash
GET  /api/status/persistent-disk    # Status completo
GET  /api/test/persistent-disk      # Teste completo
```

---

## 📊 **STATUS E MONITORAMENTO**

### **Verificar Status:**
```bash
curl https://seu-projeto.onrender.com/api/status/persistent-disk
```

### **Testar Funcionalidade:**
```bash
curl https://seu-projeto.onrender.com/api/test/persistent-disk
```

### **Interface Web:**
```
https://seu-projeto.onrender.com/test-persistent-disk.html
```

---

## 🔧 **COMANDOS ÚTEIS**

### **Salvar Cache:**
```bash
curl -X POST https://seu-projeto.onrender.com/api/cache/save \
  -H "Content-Type: application/json" \
  -d '{"fileName": "teste.json", "data": {"teste": "dados"}}'
```

### **Salvar Extrato:**
```bash
curl -X POST https://seu-projeto.onrender.com/api/extratos/save \
  -H "Content-Type: application/json" \
  -d '{"id": "12345", "extratoData": {"banco": "BB", "saldo": 1000}}'
```

### **Salvar Upload:**
```bash
curl -X POST https://seu-projeto.onrender.com/api/uploads/save \
  -H "Content-Type: application/json" \
  -d '{"fileName": "dados.csv", "content": "nome,idade\nJoão,30", "type": "csv"}'
```

---

## ⚠️ **TROUBLESHOOTING**

### **Problemas Comuns:**

#### **404 - Rotas não funcionam:**
- ✅ Verificar se deploy foi concluído
- ✅ Verificar se Persistent Disk está configurado
- ✅ Aguardar alguns minutos após deploy

#### **Erro de permissão:**
- ✅ Verificar configuração do Persistent Disk no Render
- ✅ Reiniciar serviço
- ✅ Verificar logs de erro

#### **Cache corrompido:**
- ✅ Restaurar backup automático
- ✅ Limpar cache: `POST /fgts/cache/limpar`
- ✅ Reiniciar processamento

### **Comandos de Debug:**
```bash
# Verificar saúde do servidor
curl https://seu-projeto.onrender.com/api/health

# Verificar status do Persistent Disk
curl https://seu-projeto.onrender.com/api/status/persistent-disk

# Testar funcionalidade completa
curl https://seu-projeto.onrender.com/api/test/persistent-disk
```

---

## 📈 **MÉTRICAS IMPORTANTES**

### **Uso do Disco:**
- **Cache**: ~4KB (cresce conforme uso)
- **Extratos**: ~100-500KB por arquivo
- **Uploads**: Variável
- **Logs**: ~100-500KB por dia
- **Config**: ~100-200KB

### **Alertas:**
- **> 80%**: Aviso de espaço
- **> 90%**: Alerta crítico
- **> 95%**: Emergência

---

## 🔄 **BACKUP E RECUPERAÇÃO**

### **Backup Automático:**
- ✅ **Últimos 5 backups** por arquivo
- ✅ **Backup diário** do sistema completo
- ✅ **Snapshots** automáticos do Render

### **Recuperação:**
```bash
# Listar backups disponíveis
GET /api/cache/list

# Limpar cache corrompido
POST /fgts/cache/limpar

# Restaurar estado inicial
POST /api/cache/reset
```

---

## 🎯 **BENEFÍCIOS**

### **Persistência:**
- ✅ Dados nunca se perdem entre deploys
- ✅ Cache mantido entre reinicializações
- ✅ Estado preservado entre sessões

### **Performance:**
- ✅ Cache rápido para extratos processados
- ✅ Listas carregadas instantaneamente
- ✅ Redução de processamento desnecessário

### **Confiabilidade:**
- ✅ Sistema robusto com backups
- ✅ Recuperação automática de erros
- ✅ Monitoramento contínuo

---

## 📞 **SUPORTE**

### **Recursos:**
- **Documentação Completa**: `PERSISTENT-DISK-CACHE-SYSTEM.md`
- **Interface de Teste**: `/test-persistent-disk.html`
- **Logs do Render**: Painel → Logs
- **Status do Serviço**: Painel → Status

### **Emergência:**
```bash
# Status do sistema
curl https://seu-projeto.onrender.com/api/health

# Limpar cache (emergência)
curl -X POST https://seu-projeto.onrender.com/fgts/cache/limpar
```

**Sistema funcionando perfeitamente!** 🚀✨

