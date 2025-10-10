# 🛡️ SISTEMA DE SEGURANÇA - Lunas Digital

## 📋 **VISÃO GERAL**

Este documento descreve o sistema de segurança implementado para prevenir erros e garantir a estabilidade do sistema Lunas Digital.

## 🚨 **PROBLEMA RESOLVIDO**

**Erro 502 Bad Gateway** causado por:
- Container `api-simulador-lunasdigital` em loop de reinicialização
- `ReferenceError: adicionarLinksMascarados is not defined`
- Sistema de links mascarados implementado incorretamente

## ✅ **SOLUÇÃO IMPLEMENTADA**

### **Scripts de Segurança Criados:**

#### **1. Backup Automático (`safety-check.sh`)**
```bash
#!/bin/bash
echo "SISTEMA DE SEGURANCA ATIVADO"
mkdir -p /root/api-lunas/backups
cp /root/api-lunas/INSS/server-inss.js /root/api-lunas/backups/server-inss.js.backup
docker ps | grep api-simulador
echo "SISTEMA DE SEGURANCA CONCLUIDO"
```

#### **2. Restauração (`restore-backup.sh`)**
```bash
#!/bin/bash
echo "RESTAURANDO SISTEMA DO BACKUP"
docker stop api-simulador-lunasdigital
cp /root/api-lunas/backups/server-inss.js.backup /root/api-lunas/INSS/server-inss.js
docker start api-simulador-lunasdigital
echo "RESTAURACAO CONCLUIDA"
```

## 🔧 **PROCESSO DE SEGURANÇA**

### **ANTES DE QUALQUER MODIFICAÇÃO:**
```bash
./safety-check.sh
```

### **EM CASO DE ERRO:**
```bash
./restore-backup.sh
```

## 📁 **ARQUIVOS DE SEGURANÇA**

- `safety-check.sh` - Backup automático
- `restore-backup.sh` - Restauração de backup
- `GUIA-SEGURANCA.md` - Guia de uso
- `/root/api-lunas/backups/` - Diretório de backups

## ⚠️ **REGRAS OBRIGATÓRIAS**

1. **NUNCA** modifique arquivos sem backup
2. **SEMPRE** execute `safety-check.sh` antes de modificações
3. **NUNCA** adicione imports de arquivos inexistentes
4. **NUNCA** chame funções não definidas
5. **SEMPRE** teste o sistema após modificações

## 🎯 **OBJETIVO**

**Manter o sistema sempre funcionando e evitar downtime!**

---

**📅 Criado em:** 10/01/2025  
**🔄 Última atualização:** 10/01/2025  
**👤 Responsável:** Sistema de Segurança Lunas Digital

