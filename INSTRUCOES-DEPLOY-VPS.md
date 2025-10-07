# 🚀 INSTRUÇÕES DE DEPLOY NO VPS

## ⚠️ IMPORTANTE - LIMITAÇÕES
- **SSH não pode ser executado automaticamente** via scripts ou comandos remotos
- **Acesso manual obrigatório** ao VPS para executar comandos
- **Não é possível** executar SSH via PowerShell ou scripts locais
- **Conexão manual** necessária para deploy e manutenção

## 🔄 FLUXO DE DESENVOLVIMENTO RECOMENDADO

### 📋 **REGRA DE OURO: SEMPRE TESTAR LOCAL PRIMEIRO**

#### **1. 🏠 DESENVOLVIMENTO LOCAL (OBRIGATÓRIO)**
```bash
# 1. Fazer alterações nos arquivos locais
# Editar: server.js, fgts_csv.js, fgts/index.html, etc.

# 2. Testar localmente
node server.js

# 3. Verificar funcionamento completo
# - Abrir http://localhost:3000/fgts
# - Testar upload de CSV
# - Verificar contadores
# - Testar todas as funcionalidades

# 4. Corrigir bugs localmente
# - Debug no console local
# - Verificar logs locais
# - Ajustar código até funcionar 100%

# 5. Commit apenas quando estiver perfeito
git add .
git commit -m "Descrição das alterações testadas localmente"
git push origin master
```

#### **2. 🚀 DEPLOY NO SERVIDOR (APÓS VALIDAÇÃO LOCAL)**
```bash
# 1. Conectar ao VPS
ssh root@72.60.159.149

# 2. Navegar para o diretório
cd /root/api-lunas

# 3. Atualizar código
git pull origin master

# 4. Deploy
npm install
pm2 restart api-extrato

# 5. Verificar funcionamento online
curl http://localhost:3000
```

### ✅ **VANTAGENS DESTE FLUXO:**
- **Menos erros** em produção
- **Desenvolvimento mais rápido** (sem delays de rede)
- **Debug mais fácil** (logs locais)
- **Testes seguros** sem afetar usuários
- **Deploy mais confiável**

### 🚫 **NUNCA FAZER:**
- ❌ Subir código não testado
- ❌ Fazer alterações diretas no VPS
- ❌ Deploy sem validação local
- ❌ Commit de código com bugs

## 📋 Pré-requisitos
- Acesso SSH manual ao VPS (72.60.159.149)
- Node.js e NPM instalados
- PM2 instalado
- Nginx configurado
- **Acesso direto ao terminal do VPS**

## 🔧 Passos para Deploy

### ⚠️ FLUXO CORRETO - SEMPRE ALTERAR LOCAL E SUBIR PELO GIT

#### 1. **Desenvolvimento Local** (SEMPRE FAZER PRIMEIRO)
```bash
# Fazer alterações nos arquivos locais
# Editar server.js, fgts_csv.js, index.html, etc.

# Testar localmente
node server.js

# Fazer commit das alterações
git add .
git commit -m "Descrição das alterações"
git push origin master
```

#### 2. **Deploy no VPS** (APÓS COMMIT LOCAL)
```bash
# Conectar ao VPS
ssh root@72.60.159.149

# Navegar para o diretório do projeto
cd /root/api-lunas

# Atualizar código do Git
git pull origin master

# Executar o script de deploy
chmod +x deploy-vps-manual.sh
./deploy-vps-manual.sh
```

#### 3. **Verificar se está funcionando**
```bash
pm2 status
pm2 logs api-extrato
curl http://localhost:3000/api/health
```

### 🚫 **NÃO FAZER:**
- ❌ Editar arquivos diretamente no VPS
- ❌ Fazer alterações sem commit local
- ❌ Deploy sem atualizar do Git
- ❌ Modificar código diretamente no servidor

## 🌐 URLs de Teste
- **API Health**: http://72.60.159.149/api/health
- **Painel FGTS**: http://72.60.159.149/fgts
- **Status CPFs**: http://72.60.159.149/status-cpfs
- **Simulador**: http://72.60.159.149/simulador

## 🛠️ Comandos Úteis
```bash
# Ver status da aplicação
pm2 status

# Ver logs em tempo real
pm2 logs api-extrato

# Reiniciar aplicação
pm2 restart api-extrato

# Parar aplicação
pm2 stop api-extrato

# Ver logs de erro
pm2 logs api-extrato --err

# Ver logs de saída
pm2 logs api-extrato --out
```

## 🔍 Troubleshooting

### 🚨 SERVIDOR FORA DO AR (502 Bad Gateway)
**Sintomas**: Site retorna 502 Bad Gateway, Nginx funcionando mas aplicação não responde

**Ação Imediata** (conectar manualmente ao VPS):
```bash
# 1. Conectar ao VPS
ssh root@72.60.159.149

# 2. Verificar status da aplicação
pm2 status

# 3. Se estiver parada, reiniciar
pm2 restart api-extrato

# 4. Se não estiver listada, iniciar
cd /root/api-lunas
pm2 start ecosystem.config.cjs

# 5. Verificar logs de erro
pm2 logs api-extrato --err

# 6. Verificar se está funcionando
curl http://localhost:3000/api/health
```

### Se a aplicação não iniciar:
1. Verificar logs: `pm2 logs api-extrato --err`
2. Verificar se as dependências estão instaladas: `npm list`
3. Verificar se o Node.js está funcionando: `node --version`
4. Verificar se as variáveis de ambiente estão configuradas

### Se retornar 502 Bad Gateway:
1. Verificar se a aplicação está rodando: `pm2 status`
2. Verificar se a porta 3000 está sendo usada: `netstat -tlnp | grep 3000`
3. Verificar configuração do Nginx: `nginx -t`
4. Reiniciar Nginx: `systemctl restart nginx`

### Se houver problemas de permissão:
```bash
chmod 755 /var/data
chmod 755 /var/data/cache
chmod 755 /var/data/uploads
chmod 755 /var/data/logs
chmod 755 /var/data/config
```

### ⚠️ LIMITAÇÕES DE ACESSO REMOTO
- **Não é possível** executar SSH automaticamente via scripts
- **Não é possível** reiniciar o servidor remotamente
- **Acesso manual obrigatório** para correções
- **Use terminal local** para conectar ao VPS

## 📊 Monitoramento
- **Status da aplicação**: `pm2 status`
- **Uso de memória**: `pm2 monit`
- **Logs em tempo real**: `pm2 logs api-extrato --follow`

## 🔄 Atualizações Futuras

### 📋 **FLUXO CORRETO DE ATUALIZAÇÃO:**

#### 1. **Desenvolvimento Local** (OBRIGATÓRIO)
```bash
# Fazer alterações nos arquivos
# Editar: server.js, fgts_csv.js, index.html, etc.

# Testar localmente
node server.js

# Verificar se está funcionando
curl http://localhost:3000/api/health
```

#### 2. **Commit e Push** (OBRIGATÓRIO)
```bash
# Adicionar arquivos modificados
git add .

# Fazer commit com descrição clara
git commit -m "Descrição das alterações realizadas"

# Enviar para o repositório
git push origin master
```

#### 3. **Deploy no VPS** (APÓS COMMIT)
```bash
# Conectar ao VPS
ssh root@72.60.159.149

# Ir para o diretório do projeto
cd /root/api-lunas

# Atualizar código do Git
git pull origin master

# Executar deploy
./deploy-vps-manual.sh

# Verificar funcionamento
pm2 status
curl http://localhost:3000/api/health
```

### 🚫 **NUNCA FAZER:**
- ❌ Editar arquivos diretamente no VPS
- ❌ Fazer alterações sem testar localmente
- ❌ Deploy sem commit local
- ❌ Modificar código no servidor de produção

---

## 🔍 **TROUBLESHOOTING AVANÇADO**

### 🚨 **502 BAD GATEWAY - RESOLUÇÃO COMPLETA**

**Sintomas:** `502 Bad Gateway nginx/1.18.0 (Ubuntu)`

#### **Diagnóstico Rápido:**
```bash
# 1. Verificar PM2
pm2 status

# 2. Verificar aplicação
curl -I http://localhost:3000

# 3. Verificar logs
pm2 logs api-extrato --lines 20
```

#### **Solução Completa:**
```bash
# 1. Resolver conflitos Git
cd /root/api-lunas
git stash
rm -f 'API Lunas/fgts.html'  # Remover conflitos
git pull origin master

# 2. Instalar dependências
cd '/root/api-lunas/API Lunas'
npm install

# 3. Reiniciar aplicação
pm2 restart api-extrato

# 4. Verificar funcionamento
curl -I http://localhost:3000
```

### 🔑 **PROBLEMAS COM CHAVE SSH**

**Sintomas:**
- GitHub Actions não executa
- Deploy automático falha
- Erro de autenticação SSH

#### **Geração de Nova Chave SSH:**
```bash
# No Windows (PowerShell)
ssh-keygen -t ed25519 -C "seu_email@exemplo.com"
# Pressionar Enter para caminho padrão
# Deixar senha vazia (Enter duas vezes)
```

#### **Configuração:**
1. **Copiar chave pública:**
   ```bash
   Get-Content C:\Users\srcor\.ssh\id_ed25519.pub
   ```

2. **Adicionar no Hostinger:**
   - Painel → Chaves SSH → Adicionar chave
   - Colar chave pública
   - Nome: "GitHub Actions Key"

3. **Atualizar GitHub:**
   - Settings → Secrets and variables → Actions
   - Editar `VPS_SSH_KEY`
   - Colar chave privada completa

#### **Teste de Conexão:**
```bash
# Testar SSH local
ssh -i C:\Users\srcor\.ssh\id_ed25519 root@72.60.159.149 "echo 'Conexão OK'"
```

### 📊 **MONITORAMENTO CONTÍNUO**

#### **Verificações Diárias:**
```bash
# Status da aplicação
pm2 status

# Uso de recursos
pm2 monit

# Logs recentes
pm2 logs api-extrato --lines 50
```

#### **Verificações Semanais:**
```bash
# Atualizar dependências
cd '/root/api-lunas/API Lunas'
npm audit fix

# Limpar logs antigos
pm2 flush

# Backup do cache
cp -r /var/data/cache /var/data/backup-$(date +%Y%m%d)
```

---

## 📞 Suporte
Se encontrar problemas, verificar:
- Logs da aplicação
- Status do PM2
- Configuração do Nginx
- Variáveis de ambiente
- Conectividade com APIs externas
- **Nova seção:** Troubleshooting avançado acima
