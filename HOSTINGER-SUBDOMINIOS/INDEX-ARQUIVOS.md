# 📁 Índice de Arquivos - Hostinger Subdomínios

## 🚀 **Scripts de Deploy**

| Arquivo | Descrição | Uso |
|---------|-----------|-----|
| `instalar-subdominios-rapido.sh` | **⚡ INSTALAÇÃO RÁPIDA** - Configura tudo automaticamente | `sudo bash instalar-subdominios-rapido.sh` |
| `deploy-hostinger-subdominios.sh` | Script principal de deploy para Hostinger | `sudo bash deploy-hostinger-subdominios.sh` |
| `configurar-subdominios.sh` | Script de configuração inicial | `sudo bash configurar-subdominios.sh` |

## 🔧 **Configurações**

| Arquivo | Descrição | Uso |
|---------|-----------|-----|
| `nginx-hostinger-subdominios.conf` | Configuração Nginx otimizada para Hostinger | Copiado automaticamente pelo deploy |
| `ecosystem-subdominios.config.cjs` | Configuração PM2 para múltiplos serviços | `pm2 start ecosystem-subdominios.config.cjs` |
| `.env-subdominios-example` | Exemplo de variáveis de ambiente | Copie para `.env` e configure |

## 📊 **Monitoramento e Backup**

| Arquivo | Descrição | Uso |
|---------|-----------|-----|
| `monitor-hostinger-subdominios.sh` | Script de monitoramento completo | `bash monitor-hostinger-subdominios.sh` |
| `backup-hostinger-subdominios.sh` | Script de backup completo | `sudo bash backup-hostinger-subdominios.sh` |

## 📚 **Documentação**

| Arquivo | Descrição | Uso |
|---------|-----------|-----|
| `README-HOSTINGER-SUBDOMINIOS.md` | **📖 GUIA PRINCIPAL** - Instruções completas | Leia antes de começar |
| `GUIA-SUBDOMINIOS-VPS.md` | Guia técnico detalhado | Consulte para troubleshooting |
| `INDEX-ARQUIVOS.md` | Este arquivo - Índice de todos os arquivos | Referência rápida |

## 🎯 **Fluxo de Instalação Recomendado**

### **1. Instalação Rápida (Recomendado)**
```bash
cd "/root/API Lunas"
sudo bash HOSTINGER-SUBDOMINIOS/instalar-subdominios-rapido.sh
```

### **2. Instalação Manual (Avançado)**
```bash
# 1. Deploy principal
sudo bash HOSTINGER-SUBDOMINIOS/deploy-hostinger-subdominios.sh

# 2. Monitorar
bash HOSTINGER-SUBDOMINIOS/monitor-hostinger-subdominios.sh

# 3. Backup
sudo bash HOSTINGER-SUBDOMINIOS/backup-hostinger-subdominios.sh
```

## 🔍 **Estrutura de Subdomínios**

```
api.seudominio.com     → Porta 3000 (API Principal)
fgts.seudominio.com    → Porta 3001 (Sistema FGTS)
inss.seudominio.com    → Porta 3002 (Sistema INSS)
admin.seudominio.com   → Porta 3003 (Painel Admin)
```

## ⚡ **Comandos Rápidos**

```bash
# Status geral
pm2 status

# Logs em tempo real
pm2 logs

# Reiniciar tudo
pm2 restart all

# Monitorar
bash HOSTINGER-SUBDOMINIOS/monitor-hostinger-subdominios.sh

# Backup
sudo bash HOSTINGER-SUBDOMINIOS/backup-hostinger-subdominios.sh
```

## 🆘 **Troubleshooting**

1. **Serviços não iniciam**: `pm2 logs --err`
2. **Nginx com erro**: `sudo nginx -t`
3. **Porta em uso**: `netstat -tlnp | grep :3000`
4. **Verificar DNS**: `nslookup api.seudominio.com`

## 📞 **Suporte**

- Consulte `README-HOSTINGER-SUBDOMINIOS.md` para instruções detalhadas
- Use `monitor-hostinger-subdominios.sh` para diagnóstico
- Execute `backup-hostinger-subdominios.sh` antes de mudanças importantes

---

**🎉 Pronto para escalar com subdomínios na Hostinger!**
