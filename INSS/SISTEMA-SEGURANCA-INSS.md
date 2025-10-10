# 🛡️ SISTEMA DE SEGURANÇA - INSS

## 📋 **CONTEXTO ESPECÍFICO**

Este documento detalha as medidas de segurança específicas para o sistema INSS, incluindo os arquivos críticos e procedimentos de backup.

## 🚨 **ERROS COMUNS NO INSS**

### **Erro 502 Bad Gateway:**
- Container `api-simulador-lunasdigital` reiniciando
- `ReferenceError: adicionarLinksMascarados is not defined`
- Imports de arquivos inexistentes

### **Arquivos Críticos:**
- `server-inss.js` - Servidor principal
- `formulario-cliente.js` - Formulário de cliente
- `calculo.js` - Lógica de cálculo
- `simulador-logic.js` - Lógica do simulador

## ✅ **BACKUP ESPECÍFICO INSS**

### **Arquivos Sempre Backupados:**
```bash
# Arquivo principal do servidor
/root/api-lunas/INSS/server-inss.js

# Arquivo do formulário
/root/api-lunas/INSS/formulario-cliente.js

# Arquivo de cálculo
/root/api-lunas/INSS/calculo.js

# Arquivo de lógica do simulador
/root/api-lunas/INSS/simulador-logic.js
```

### **Comando de Backup INSS:**
```bash
# Backup completo do INSS
mkdir -p /root/api-lunas/backups/inss
cp /root/api-lunas/INSS/*.js /root/api-lunas/backups/inss/
```

## 🔧 **PROCEDIMENTOS ESPECÍFICOS**

### **Antes de Modificar server-inss.js:**
1. Execute `safety-check.sh`
2. Verifique se não há imports problemáticos
3. Valide sintaxe JavaScript
4. Teste localmente se possível

### **Antes de Modificar formulario-cliente.js:**
1. Execute `safety-check.sh`
2. Verifique validações de CPF
3. Teste formulário no navegador
4. Confirme funcionalidade

### **Antes de Modificar calculo.js:**
1. Execute `safety-check.sh`
2. Verifique lógica de cálculo
3. Teste simulações
4. Confirme resultados

## 🚨 **SINAIS DE ALERTA INSS**

- Container reiniciando constantemente
- Erro 502 em `https://inss.lunasdigital.com.br`
- Logs com "ReferenceError"
- Logs com "SyntaxError"
- Simulador não carregando

## 🔄 **RESTAURAÇÃO INSS**

### **Em Caso de Erro:**
```bash
# Parar container
docker stop api-simulador-lunasdigital

# Restaurar arquivos
cp /root/api-lunas/backups/server-inss.js.backup /root/api-lunas/INSS/server-inss.js
cp /root/api-lunas/backups/formulario-cliente.js.backup /root/api-lunas/INSS/formulario-cliente.js

# Reiniciar container
docker start api-simulador-lunasdigital
```

## 📊 **MONITORAMENTO INSS**

### **Verificações Diárias:**
```bash
# Status do container
docker ps | grep api-simulador

# Logs recentes
docker logs api-simulador-lunasdigital --tail 10

# Teste do simulador
curl -I https://inss.lunasdigital.com.br/inss/simulador.html
```

## 🎯 **OBJETIVO INSS**

**Garantir que o simulador INSS sempre funcione sem erros 502!**

---

**📅 Criado em:** 10/01/2025  
**🔄 Última atualização:** 10/01/2025  
**👤 Responsável:** Sistema de Segurança INSS

