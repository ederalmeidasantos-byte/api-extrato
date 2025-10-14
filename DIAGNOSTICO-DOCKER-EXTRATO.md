# 🔍 Diagnóstico - Problemas na API de Extrato (Docker)

## ❌ **Problemas Identificados**

### **1. Configuração do Nginx Incorreta**
```nginx
# PROBLEMA: Upstream apontando para porta errada
upstream inss_backend {
    server 127.0.0.1:3003;  # ❌ Deveria ser 3002
    keepalive 32;
}
```

### **2. Configuração do Docker Compose**
```yaml
# PROBLEMA: Porta não exposta
api-simulador:
  # Porta removida - nginx faz proxy  # ❌ Comentário incorreto
  environment:
    - PORT=3002  # ✅ Correto
```

### **3. Problema de Roteamento**
- O Nginx está configurado para porta 3003
- O container está rodando na porta 3002
- **Resultado**: Requisições não chegam ao container

## 🔧 **Soluções**

### **Solução 1: Corrigir Nginx**
```nginx
# CORREÇÃO: Upstream correto
upstream inss_backend {
    server api-simulador:3002;  # ✅ Usar nome do container
    keepalive 32;
}
```

### **Solução 2: Corrigir Docker Compose**
```yaml
api-simulador:
  ports:
    - "3002:3002"  # ✅ Expor porta
  environment:
    - NODE_ENV=production
    - PORT=3002
```

### **Solução 3: Verificar Rede Docker**
```yaml
networks:
  lunas-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 🚨 **Problema Específico com ID 7656**

### **Causa Raiz**
1. **Nginx mal configurado** → Requisições não chegam ao container
2. **Container não recebe requisições** → Arquivo não é processado
3. **Arquivo não existe** → Retorna "Extrato não encontrado"

### **Fluxo Atual (Quebrado)**
```
Cliente → Nginx (porta 3003) → ❌ Nada na porta 3003
```

### **Fluxo Correto**
```
Cliente → Nginx (porta 3002) → Container INSS (porta 3002) → ✅ Funciona
```

## 🛠️ **Script de Correção**

### **1. Corrigir Nginx**
```bash
# Editar nginx-inss.conf
sed -i 's/127.0.0.1:3003/api-simulador:3002/g' nginx-inss.conf
```

### **2. Corrigir Docker Compose**
```bash
# Adicionar porta no docker-compose.yml
sed -i '/# Porta removida/a\    ports:\n      - "3002:3002"' docker-compose.yml
```

### **3. Reiniciar Containers**
```bash
docker-compose down
docker-compose up -d
```

## 📋 **Verificação Pós-Correção**

### **1. Verificar Containers**
```bash
docker ps
# Deve mostrar:
# - api-lunas-api-simulador-1 (porta 3002)
# - api-lunas-nginx-1 (porta 9999)
```

### **2. Testar API**
```bash
curl http://localhost:3002/extrato/7656/raw
# Deve retornar dados ou erro específico
```

### **3. Verificar Logs**
```bash
docker logs api-lunas-api-simulador-1
# Deve mostrar requisições chegando
```

## 🎯 **Resumo do Problema**

| Componente | Status Atual | Status Correto |
|------------|--------------|----------------|
| Container INSS | ✅ Rodando na 3002 | ✅ Rodando na 3002 |
| Nginx Upstream | ❌ Apontando para 3003 | ✅ Apontando para 3002 |
| Docker Compose | ❌ Porta não exposta | ✅ Porta 3002 exposta |
| Roteamento | ❌ Quebrado | ✅ Funcionando |

## 🚀 **Próximos Passos**

1. **Corrigir configurações** (Nginx + Docker Compose)
2. **Reiniciar containers**
3. **Testar API com ID 7656**
4. **Verificar logs**
5. **Confirmar funcionamento**

---

**Status**: Problema identificado ✅  
**Solução**: Configuração Docker/Nginx ❌  
**Prioridade**: Alta 🔴
