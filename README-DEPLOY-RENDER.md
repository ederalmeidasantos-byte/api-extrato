# 🚀 Deploy Painel FGTS no Render

## 📋 **Visão Geral**

Este guia explica como fazer o deploy do Painel FGTS no Render.com, incluindo todas as configurações necessárias e troubleshooting.

---

## 🛠️ **Pré-requisitos**

### **1. Conta no Render**
- ✅ Conta gratuita no [Render.com](https://render.com)
- ✅ Repositório GitHub conectado
- ✅ Acesso ao painel de controle

### **2. Credenciais Necessárias**
- ✅ **LUNAS_API_KEY**: Chave da API Lunas CRM
- ✅ **FGTS_USER_1**: Primeiro usuário FGTS
- ✅ **FGTS_PASS_1**: Senha do primeiro usuário
- ✅ **FGTS_USER_2**: Segundo usuário FGTS (opcional)
- ✅ **FGTS_PASS_2**: Senha do segundo usuário (opcional)

---

## 🚀 **Deploy Automático**

### **Opção 1: Script Automático**
```bash
# Execute na raiz do projeto
chmod +x deploy-render.sh
./deploy-render.sh
```

### **Opção 2: Deploy Manual**

#### **1. Preparar Repositório**
```bash
# Commit das alterações
git add .
git commit -m "Deploy Painel FGTS - Correções implementadas"
git push origin main
```

#### **2. Criar Serviço no Render**
1. Acesse [Render.com](https://render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório GitHub
4. Configure o serviço:

| Campo | Valor |
|-------|-------|
| **Name** | `painel-fgts` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` |
| **Branch** | `main` |
| **Root Directory** | `.` |
| **Auto-Deploy** | `Yes` |

#### **3. Configurar Variáveis de Ambiente**
No painel do Render, vá em **"Environment"** e adicione:

```env
# Obrigatórias
LUNAS_API_KEY=sua_chave_api_lunas
FGTS_USER_1=seu_usuario_fgts_1@email.com
FGTS_PASS_1=sua_senha_fgts_1

# Opcionais
FGTS_USER_2=seu_usuario_fgts_2@email.com
FGTS_PASS_2=sua_senha_fgts_2
QUEUE_ID=25
DEST_STAGE_ID=4
NODE_ENV=production
PORT=3000
```

#### **4. Deploy**
- Clique em **"Create Web Service"**
- Aguarde o build (2-5 minutos)
- Acesse: `https://painel-fgts.onrender.com`

---

## 📁 **Estrutura de Arquivos**

```
projeto/
├── server.js                # ✅ Servidor principal integrado
├── package.json            # ✅ Dependências Node.js
├── render.yaml             # ✅ Configuração Render
├── fgts_csv.js             # ✅ Lógica FGTS
├── cache-persistente.js    # ✅ Sistema de cache
├── error-logger.js         # ✅ Sistema de logs
├── index.html              # ✅ Painel frontend
├── menu.js                 # ✅ Menu lateral
├── env-example.txt         # ✅ Exemplo de variáveis
└── deploy-render.sh        # ✅ Script de deploy
```

---

## 🔧 **Configurações Avançadas**

### **1. Health Check**
```yaml
# render.yaml
healthCheckPath: /api/health
```

### **2. Variáveis de Performance**
```env
DEFAULT_DELAY=1000
DELAY_BASE=1000
DELAY_MIN=500
DELAY_MAX=5000
TAXA_ERRO=10
```

### **3. Horário Comercial**
```env
HORARIO_INICIO=08:00
HORARIO_FIM=22:00
FUSO_HORARIO=America/Sao_Paulo
```

---

## 🧪 **Testes Pós-Deploy**

### **1. Health Check**
```bash
curl https://painel-fgts.onrender.com/api/health
```

**Resposta esperada:**
```json
{
  "status": "success",
  "message": "Painel FGTS funcionando",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "environment": "production"
}
```

### **2. Teste do Painel**
1. Acesse: `https://painel-fgts.onrender.com`
2. Verifique se o painel carrega
3. Teste upload de CSV pequeno
4. Verifique logs em tempo real

### **3. Teste de APIs**
```bash
# Teste de cache
curl https://painel-fgts.onrender.com/fgts/cache/estatisticas

# Teste de logs
curl https://painel-fgts.onrender.com/fgts/logs/erros
```

---

## 🐛 **Troubleshooting**

### **Problema: Build Falha**
```bash
# Verificar logs do build
# No painel Render → Logs → Build Logs
```

**Soluções:**
- ✅ Verificar se `package.json` está correto
- ✅ Verificar se todas as dependências estão listadas
- ✅ Verificar se Node.js versão >= 18

### **Problema: Servidor Não Inicia**
```bash
# Verificar logs do runtime
# No painel Render → Logs → Runtime Logs
```

**Soluções:**
- ✅ Verificar se `server.js` existe
- ✅ Verificar se variáveis de ambiente estão configuradas
- ✅ Verificar se portas estão corretas

### **Problema: APIs Externas Falham**
```bash
# Verificar conectividade
curl -I https://bff.v8sistema.com
curl -I https://lunasdigital.atenderbem.com
```

**Soluções:**
- ✅ Verificar credenciais FGTS
- ✅ Verificar API key Lunas
- ✅ Verificar conectividade de rede

### **Problema: Socket.IO Não Funciona**
```bash
# Verificar se Socket.IO está configurado
# No console do navegador
```

**Soluções:**
- ✅ Verificar se CORS está configurado
- ✅ Verificar se Socket.IO está instalado
- ✅ Verificar se servidor está rodando

---

## 📊 **Monitoramento**

### **1. Logs do Render**
- **Build Logs**: Logs do processo de build
- **Runtime Logs**: Logs da aplicação em execução
- **Deploy Logs**: Logs do processo de deploy

### **2. Métricas**
- **Uptime**: Tempo de funcionamento
- **Response Time**: Tempo de resposta
- **Memory Usage**: Uso de memória
- **CPU Usage**: Uso de CPU

### **3. Alertas**
- Configure alertas para:
  - Servidor offline
  - Erros críticos
  - Uso excessivo de recursos

---

## 🔄 **Atualizações**

### **Deploy Automático**
- ✅ Push para `main` → Deploy automático
- ✅ Verificar logs após cada deploy
- ✅ Testar funcionalidades críticas

### **Deploy Manual**
```bash
# 1. Fazer alterações
# 2. Commit
git add .
git commit -m "Atualização: descrição das mudanças"
git push origin main

# 3. Aguardar deploy automático
# 4. Verificar logs
# 5. Testar aplicação
```

---

## 📞 **Suporte**

### **Logs Importantes**
- **Build Logs**: Problemas de dependências
- **Runtime Logs**: Problemas de execução
- **Application Logs**: Logs da aplicação FGTS

### **Contatos**
- **Render Support**: [support@render.com](mailto:support@render.com)
- **Documentação**: [render.com/docs](https://render.com/docs)

---

## ✅ **Checklist Final**

- [ ] ✅ Servidor integrado (`server.js`)
- [ ] ✅ Package.json atualizado
- [ ] ✅ Render.yaml configurado
- [ ] ✅ Variáveis de ambiente configuradas
- [ ] ✅ Deploy realizado com sucesso
- [ ] ✅ Health check funcionando
- [ ] ✅ Painel acessível
- [ ] ✅ APIs funcionando
- [ ] ✅ Socket.IO conectado
- [ ] ✅ Logs sendo gerados

---

## 🎯 **URLs Finais**

- **Painel Principal**: `https://painel-fgts.onrender.com`
- **Health Check**: `https://painel-fgts.onrender.com/api/health`
- **Painel FGTS**: `https://painel-fgts.onrender.com/fgts`

---

**🚀 Deploy concluído com sucesso! Seu Painel FGTS está online!**
