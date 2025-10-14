# 🧪 Teste Rápido - API de Extrato no VPS

## 📋 **Comandos para executar no VPS**

### **1. Conectar ao VPS**
```bash
ssh root@seu-vps.com
```

### **2. Verificar containers**
```bash
docker ps
```

### **3. Verificar logs do container INSS**
```bash
docker logs api-lunas-api-simulador-1
```

### **4. Verificar arquivos de extrato**
```bash
ls -la /var/data/extratos/
```

### **5. Verificar arquivo específico (ID 7656)**
```bash
ls -la /var/data/extratos/extrato_7656.*
```

### **6. Testar API localmente no container**
```bash
docker exec api-lunas-api-simulador-1 curl -s "http://localhost:3002/extrato/7656/raw"
```

### **7. Processar extrato novamente**
```bash
docker exec api-lunas-api-simulador-1 curl -X POST "http://localhost:3002/extrair" \
  -H "Content-Type: application/json" \
  -d '{"fileId": "7656"}'
```

### **8. Verificar resposta da API externa**
```bash
curl -s "https://inss.lunasdigital.com.br/extrato/7656/raw"
```

## 🔍 **Diagnóstico Rápido**

### **Problema mais comum:**
- **Arquivo não existe**: `extrato_7656.json` não foi criado
- **Causa**: Erro no processamento do PDF ou API Kentro

### **Solução rápida:**
```bash
# Processar extrato novamente
docker exec api-lunas-api-simulador-1 curl -X POST "http://localhost:3002/extrair" \
  -H "Content-Type: application/json" \
  -d '{"fileId": "7656"}'
```

### **Verificar se funcionou:**
```bash
# Verificar se arquivo foi criado
ls -la /var/data/extratos/extrato_7656.json

# Testar API
curl -s "https://inss.lunasdigital.com.br/extrato/7656/raw"
```

## 🚨 **Se ainda não funcionar:**

### **1. Verificar logs detalhados**
```bash
docker logs api-lunas-api-simulador-1 | tail -50
```

### **2. Verificar conectividade com Kentro**
```bash
docker exec api-lunas-api-simulador-1 curl -s "https://lunasdigital.atenderbem.com/int/downloadFile"
```

### **3. Reiniciar container**
```bash
docker-compose restart api-simulador
```

### **4. Verificar espaço em disco**
```bash
df -h /var/data
```

## 📊 **Status Esperado**

### **✅ Funcionando:**
- Container rodando
- Arquivo `extrato_7656.json` existe
- API retorna dados JSON

### **❌ Com problema:**
- Container parado
- Arquivo não existe
- API retorna "Extrato não encontrado"

---

**Execute os comandos na ordem para diagnosticar o problema!** 🚀
