# 🛡️ GUIA DE SEGURANÇA - Sistema Lunas Digital

## ⚠️ **REGRAS OBRIGATÓRIAS**

### **1. ANTES DE QUALQUER MODIFICAÇÃO:**

```bash
# SEMPRE execute o script de segurança primeiro
./safety-check.sh
```

### **2. VALIDAÇÃO DE CÓDIGO:**

```bash
# Valide o código antes de aplicar
./validate-code.sh
```

### **3. EM CASO DE ERRO:**

```bash
# Restaure o backup mais recente
./restore-backup.sh TIMESTAMP
```

## 🚫 **O QUE NUNCA FAZER:**

1. **❌ NUNCA modifique arquivos sem backup**
2. **❌ NUNCA adicione imports de arquivos inexistentes**
3. **❌ NUNCA chame funções não definidas**
4. **❌ NUNCA reinicie containers sem verificar logs**
5. **❌ NUNCA aplique modificações sem validação**

## ✅ **PROCESSO SEGURO DE MODIFICAÇÃO:**

### **Passo 1: Backup**
```bash
./safety-check.sh
```

### **Passo 2: Modificação**
- Faça as alterações necessárias
- Teste localmente se possível

### **Passo 3: Validação**
```bash
./validate-code.sh
```

### **Passo 4: Aplicação**
- Só aplique se a validação passar
- Monitore os logs após aplicação

### **Passo 5: Teste**
- Teste o sistema imediatamente
- Verifique se não há erros 502/500

## 🔍 **CHECKLIST DE SEGURANÇA:**

- [ ] Backup criado antes da modificação
- [ ] Sintaxe JavaScript validada
- [ ] Imports verificados
- [ ] Funções definidas antes de serem chamadas
- [ ] Container funcionando antes da modificação
- [ ] Logs verificados após modificação
- [ ] Sistema testado após modificação

## 🚨 **SINAIS DE ALERTA:**

- Container reiniciando constantemente
- Erros 502 Bad Gateway
- Logs com "ReferenceError"
- Logs com "SyntaxError"
- Logs com "Cannot find module"

## 📞 **AÇÕES DE EMERGÊNCIA:**

### **Se o sistema quebrar:**

1. **Pare o container:**
   ```bash
   docker stop api-simulador-lunasdigital
   ```

2. **Restaure o backup:**
   ```bash
   ./restore-backup.sh TIMESTAMP_DO_BACKUP
   ```

3. **Verifique o funcionamento:**
   ```bash
   docker logs api-simulador-lunasdigital --tail 10
   ```

## 📁 **ARQUIVOS DE SEGURANÇA:**

- `safety-check.sh` - Backup automático
- `validate-code.sh` - Validação de código
- `restore-backup.sh` - Restauração de backup
- `/root/api-lunas/backups/` - Diretório de backups

## 🎯 **OBJETIVO:**

**Manter o sistema sempre funcionando e evitar downtime!**

---

**⚠️ LEMBRE-SE: É melhor prevenir do que remediar!**

