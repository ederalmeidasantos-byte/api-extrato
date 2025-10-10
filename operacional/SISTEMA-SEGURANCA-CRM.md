# 🛡️ SISTEMA DE SEGURANÇA - CRM OPERACIONAL

## 📋 **CONTEXTO ESPECÍFICO**

Este documento detalha as medidas de segurança específicas para o sistema CRM Operacional, incluindo os arquivos críticos e procedimentos de backup.

## 🚨 **ERROS COMUNS NO CRM**

### **Erro 502 Bad Gateway:**
- Container `crm-lunasdigital` reiniciando
- Problemas de conexão com banco de dados
- Arquivos HTML corrompidos

### **Arquivos Críticos:**
- `server-crm.js` - Servidor CRM
- `buscar-cliente.html` - Interface de busca
- `crm-cliente.html` - Interface de cliente
- `formulario-cliente.html` - Formulário de cliente
- `client-manager.js` - Gerenciador de clientes

## ✅ **BACKUP ESPECÍFICO CRM**

### **Arquivos Sempre Backupados:**
```bash
# Servidor CRM
/root/api-lunas/operacional/server-crm.js

# Interfaces HTML
/root/api-lunas/operacional/*.html

# Scripts JavaScript
/root/api-lunas/operacional/*.js

# Arquivos CSS
/root/api-lunas/operacional/assets/*.css
```

### **Comando de Backup CRM:**
```bash
# Backup completo do CRM
mkdir -p /root/api-lunas/backups/crm
cp -r /root/api-lunas/operacional/* /root/api-lunas/backups/crm/
```

## 🔧 **PROCEDIMENTOS ESPECÍFICOS**

### **Antes de Modificar server-crm.js:**
1. Execute `safety-check.sh`
2. Verifique conexão com banco de dados
3. Valide endpoints da API
4. Teste funcionalidades CRM

### **Antes de Modificar HTML:**
1. Execute `safety-check.sh`
2. Verifique links e referências
3. Teste no navegador
4. Confirme funcionalidade

### **Antes de Modificar JavaScript:**
1. Execute `safety-check.sh`
2. Verifique validações
3. Teste funcionalidades
4. Confirme integração

## 🚨 **SINAIS DE ALERTA CRM**

- Container reiniciando constantemente
- Erro 502 em `http://72.60.159.149:3001`
- Clientes não carregando
- Formulários não funcionando
- Menu quebrado

## 🔄 **RESTAURAÇÃO CRM**

### **Em Caso de Erro:**
```bash
# Parar container
docker stop crm-lunasdigital

# Restaurar arquivos
cp -r /root/api-lunas/backups/crm/* /root/api-lunas/operacional/

# Reiniciar container
docker start crm-lunasdigital
```

## 📊 **MONITORAMENTO CRM**

### **Verificações Diárias:**
```bash
# Status do container
docker ps | grep crm

# Logs recentes
docker logs crm-lunasdigital --tail 10

# Teste do CRM
curl -I http://72.60.159.149:3001/operacional/
```

## 🎯 **OBJETIVO CRM**

**Garantir que o CRM Operacional sempre funcione sem erros!**

---

**📅 Criado em:** 10/01/2025  
**🔄 Última atualização:** 10/01/2025  
**👤 Responsável:** Sistema de Segurança CRM

