# 🚀 Configurações de Deploy - VPS Hostinger Lunas Digital

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Configuração SSH](#configuração-ssh)
- [Métodos de Deploy](#métodos-de-deploy)
- [GitHub Actions](#github-actions)
- [Configuração do Servidor](#configuração-do-servidor)
- [Troubleshooting](#troubleshooting)
- [Comandos Úteis](#comandos-úteis)

---

## 🌐 Visão Geral

Este documento contém todas as configurações necessárias para fazer deploy da aplicação API Lunas no VPS Hostinger.

**Servidor:** `lunasdigital.com.br`  
**Usuário:** `root`  
**Porta SSH:** `22` (padrão)  
**Tipo de Chave:** `ED25519`

---

## 🔑 Configuração SSH

### 1. Gerar Chave SSH ED25519

```bash
# Gerar nova chave ED25519
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"

# Pressione Enter para usar localização padrão
# Digite uma senha forte (opcional)
```

### 2. Configurar Chave no Servidor

```bash
# Copiar chave pública para o servidor
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@lunasdigital.com.br

# Ou manualmente:
cat ~/.ssh/id_ed25519.pub | ssh root@lunasdigital.com.br "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3. Testar Conexão

```bash
# Testar conexão SSH
ssh root@lunasdigital.com.br "echo 'Conexão SSH funcionando!'"
```

---

## 🚀 Métodos de Deploy

### Método 1: Git + SSH (Recomendado)

```bash
# 1. Desenvolvimento local
# Fazer alterações no código

# 2. Commit e Push
git add .
git commit -m "Descrição das alterações"
git push origin master

# 3. Deploy no VPS
ssh root@lunasdigital.com.br "cd /root/api-lunas/API\ Lunas && git pull origin master && pm2 restart api-extrato"
```

### Método 2: SCP (Para arquivos específicos)

```bash
# Copiar arquivo específico
scp server.js root@lunasdigital.com.br:/root/api-lunas/API\ Lunas/

# Copiar pasta inteira
scp -r operacional/ root@lunasdigital.com.br:/root/api-lunas/API\ Lunas/

# Copiar com preservação de permissões
scp -rp operacional/ root@lunasdigital.com.br:/root/api-lunas/API\ Lunas/
```

### Método 3: Edição Direta no Servidor

```bash
# Conectar no VPS
ssh root@lunasdigital.com.br

# Navegar para o diretório
cd /root/api-lunas/API\ Lunas/

# Editar arquivo
nano server.js
# ou
vim server.js

# Reiniciar serviço
pm2 restart api-extrato
```

### Método 4: GitHub Actions (Automático)

O projeto já possui workflows configurados para deploy automático.

---

## ⚙️ GitHub Actions

### Configuração dos Secrets

No GitHub, vá em `Settings > Secrets and variables > Actions` e configure:

| Secret | Valor | Descrição |
|--------|-------|-----------|
| `VPS_SSH_KEY` | Conteúdo da chave privada ED25519 | Chave SSH para acesso ao servidor |
| `VPS_HOST` | `lunasdigital.com.br` | IP ou domínio do servidor |
| `VPS_USER` | `root` | Usuário SSH |
| `VPS_PATH` | `/root/api-lunas` | Caminho do projeto no servidor |

### Workflow Principal (.github/workflows/deploy-vps.yml)

```yaml
name: 🚀 Deploy VPS Hostinger

on:
  push:
    branches: [ master, main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: 📥 Checkout código
      uses: actions/checkout@v4
      
    - name: 🔧 Configurar SSH
      run: |
        mkdir -p ~/.ssh
        echo "${{ secrets.VPS_SSH_KEY }}" > ~/.ssh/id_ed25519
        chmod 600 ~/.ssh/id_ed25519
        ssh-keyscan -H ${{ secrets.VPS_HOST }} >> ~/.ssh/known_hosts
        
    - name: 🚀 Deploy no VPS
      run: |
        # 1. Verificar status atual
        ssh -i ~/.ssh/id_ed25519 ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} "pm2 status"
        
        # 2. Parar aplicação
        ssh -i ~/.ssh/id_ed25519 ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} "pm2 stop api-extrato || true"
        
        # 3. Atualizar código
        ssh -i ~/.ssh/id_ed25519 ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} "cd '${{ secrets.VPS_PATH }}/API Lunas' && git pull origin master"
        
        # 4. Instalar dependências
        ssh -i ~/.ssh/id_ed25519 ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} "cd '${{ secrets.VPS_PATH }}/API Lunas' && npm install --production"
        
        # 5. Reiniciar aplicação
        ssh -i ~/.ssh/id_ed25519 ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} "cd '${{ secrets.VPS_PATH }}/API Lunas' && pm2 restart api-extrato || pm2 start ecosystem.config.cjs"
        
        # 6. Verificar status final
        ssh -i ~/.ssh/id_ed25519 ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} "pm2 status"
```

---

## 🖥️ Configuração do Servidor

### Estrutura de Diretórios

```
/root/api-lunas/
├── API Lunas/
│   ├── server.js
│   ├── package.json
│   ├── ecosystem.config.cjs
│   ├── operacional/
│   ├── INSS/
│   ├── fgts/
│   └── ...
└── logs/
```

### Configuração do PM2

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [{
    name: 'api-extrato',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### Configuração do Nginx

```nginx
# /etc/nginx/sites-available/lunasdigital.com.br
server {
    listen 80;
    server_name lunasdigital.com.br www.lunasdigital.com.br;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔧 Troubleshooting

### Problema: SSH não conecta

```bash
# Verificar se a chave está correta
ssh -i ~/.ssh/id_ed25519 -v root@lunasdigital.com.br

# Verificar permissões da chave
chmod 600 ~/.ssh/id_ed25519
chmod 700 ~/.ssh
```

### Problema: PM2 não inicia

```bash
# Verificar logs do PM2
pm2 logs api-extrato

# Reiniciar PM2
pm2 restart api-extrato

# Se não existir, criar
pm2 start ecosystem.config.cjs
```

### Problema: Aplicação não responde

```bash
# Verificar se a porta está aberta
netstat -tlnp | grep :3000

# Verificar logs da aplicação
tail -f logs/combined.log

# Verificar status do PM2
pm2 status
```

### Problema: Git pull falha

```bash
# Verificar se há conflitos
git status

# Fazer stash das alterações locais
git stash

# Tentar pull novamente
git pull origin master
```

---

## 📚 Comandos Úteis

### Comandos SSH

```bash
# Conectar no servidor
ssh root@lunasdigital.com.br

# Executar comando remoto
ssh root@lunasdigital.com.br "comando"

# Copiar arquivo para servidor
scp arquivo.js root@lunasdigital.com.br:/caminho/destino/

# Copiar arquivo do servidor
scp root@lunasdigital.com.br:/caminho/arquivo.js ./
```

### Comandos PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs api-extrato

# Reiniciar
pm2 restart api-extrato

# Parar
pm2 stop api-extrato

# Deletar
pm2 delete api-extrato

# Salvar configuração
pm2 save

# Configurar para iniciar no boot
pm2 startup
```

### Comandos Git

```bash
# Status
git status

# Adicionar arquivos
git add .

# Commit
git commit -m "Mensagem"

# Push
git push origin master

# Pull
git pull origin master

# Ver histórico
git log --oneline
```

### Comandos de Sistema

```bash
# Ver uso de memória
free -h

# Ver uso de disco
df -h

# Ver processos
ps aux | grep node

# Ver portas em uso
netstat -tlnp

# Reiniciar nginx
systemctl restart nginx

# Ver status do nginx
systemctl status nginx
```

---

## 🎯 Fluxo de Deploy Recomendado

### 1. Desenvolvimento Local
```bash
# Fazer alterações no código
# Testar localmente
npm start
```

### 2. Commit e Push
```bash
git add .
git commit -m "Descrição das alterações"
git push origin master
```

### 3. Deploy Automático
- O GitHub Actions fará o deploy automaticamente
- Ou execute manualmente via SSH

### 4. Verificação
```bash
# Verificar se está funcionando
curl https://lunasdigital.com.br/api/health

# Verificar logs
ssh root@lunasdigital.com.br "pm2 logs api-extrato --lines 50"
```

---

## 📞 Suporte

Em caso de problemas:

1. **Verificar logs:** `pm2 logs api-extrato`
2. **Verificar status:** `pm2 status`
3. **Verificar conectividade:** `curl https://lunasdigital.com.br`
4. **Verificar SSH:** `ssh root@lunasdigital.com.br "echo 'OK'"`

---

**📅 Última atualização:** 04/01/2025  
**👨‍💻 Desenvolvido por:** Sistema Lunas Digital  
**🔗 Repositório:** https://github.com/ederalmeidasantos-byte/api-lunas
