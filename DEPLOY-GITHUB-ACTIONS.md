# 🚀 DEPLOY AUTOMÁTICO VIA GITHUB ACTIONS

## 📋 **Visão Geral**

Sistema de deploy automático que atualiza o VPS Hostinger sempre que você fizer push para o repositório.

## 🔧 **Configuração Inicial**

### **1. Configurar Secrets no GitHub**

Acesse: `https://github.com/SEU-USUARIO/SEU-REPOSITORIO/settings/secrets/actions`

#### **🔑 Configuração da Chave SSH ED25519:**

1. **Gerar chave SSH local (se ainda não tiver):**
   ```bash
   ssh-keygen -t ed25519 -C "srcor@hotmail.com"
   # Pressionar Enter para caminho padrão
   # Deixar senha vazia (Enter duas vezes)
   ```

2. **Mostrar chave privada:**
   ```bash
   Get-Content C:\Users\srcor\.ssh\id_ed25519
   ```

3. **Adicionar chave pública na Hostinger:**
   - Acesse painel Hostinger > Chaves SSH
   - Cole a chave pública completa
   - Nome: "GitHub Actions Key - ED25519"

4. **Configurar secret no GitHub:**
   - Secret: `VPS_SSH_KEY`
   - Valor: Cole a chave privada completa (desde `-----BEGIN OPENSSH PRIVATE KEY-----`)

#### **Secrets necessários:**

| Secret | Valor | Descrição |
|--------|-------|-----------|
| `VPS_HOST` | `72.60.159.149` | IP do VPS |
| `VPS_USER` | `root` | Usuário SSH |
| `VPS_PATH` | `/root/api-lunas` | Caminho da aplicação |
| `VPS_SSH_KEY` | `[chave privada ED25519]` | Chave SSH privada ED25519 |
| `VPS_PASSWORD` | `Lunas@202525` | Senha do VPS (backup) |

### **2. Workflows Disponíveis**

#### **A) deploy-vps.yml (Recomendado)**
- Usa chave SSH
- Mais seguro
- Mais rápido

#### **B) deploy-vps-password.yml (Backup)**
- Usa senha
- Fallback caso SSH falhe
- Usa expect para automação

## 🚀 **Como Usar**

### **Deploy Automático:**
```bash
# Fazer alterações locais
git add .
git commit -m "Nova funcionalidade"
git push origin master

# O deploy acontece automaticamente!
```

### **Deploy Manual:**
1. Acesse: `Actions > Deploy VPS Hostinger`
2. Clique em `Run workflow`
3. Selecione a branch
4. Clique em `Run workflow`

## 📊 **Monitoramento**

### **Verificar Status:**
- **GitHub**: Actions > Deploy VPS Hostinger
- **VPS**: `pm2 status`
- **Aplicação**: https://lunasdigital.com.br/

### **Logs:**
- Clique no job em Actions
- Veja os logs detalhados
- Identifique erros rapidamente

## 🔍 **Troubleshooting**

### **Erro: SSH Key**
- Use o workflow com senha
- Verifique se a chave está correta

### **Erro: Aplicação não inicia**
- Verifique logs do PM2: `pm2 logs api-extrato`
- Verifique dependências: `npm install`

### **Erro: Git Pull**
- Verifique se o repositório existe no VPS
- Verifique permissões SSH

## ✅ **Vantagens**

1. **Automático**: Deploy a cada push
2. **Seguro**: Usa secrets do GitHub
3. **Rastreável**: Logs completos
4. **Reversível**: Pode voltar commits
5. **Notificações**: Status por email

## 🎯 **Próximos Passos**

1. **Configurar secrets no GitHub**
2. **Fazer push do workflow**
3. **Testar deploy automático**
4. **Configurar notificações**

---

**🎉 Sistema de Deploy Automático Configurado!**

