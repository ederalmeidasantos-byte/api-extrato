# 🔄 BOAS PRÁTICAS DE DESENVOLVIMENTO - SISTEMA FGTS

## 📋 **REGRA DE OURO: SEMPRE TESTAR LOCAL PRIMEIRO**

### 🎯 **OBJETIVO**
Garantir que todas as alterações sejam testadas e validadas localmente antes de serem enviadas para produção, minimizando erros e maximizando a confiabilidade do sistema.

---

## 🏠 **1. DESENVOLVIMENTO LOCAL (OBRIGATÓRIO)**

### 📝 **Passos Obrigatórios:**

#### **1.1 Fazer Alterações**
```bash
# Editar arquivos locais
# - server.js (backend principal)
# - fgts/fgts_csv.js (lógica FGTS)
# - fgts/index.html (frontend)
# - fgts/cache-persistente.js (cache)
```

#### **1.2 Testar Localmente**
```bash
# Iniciar servidor local
node server.js

# Verificar se iniciou corretamente
# Deve mostrar: "Servidor rodando em: http://localhost:3000"
```

#### **1.3 Validação Completa**
- ✅ **Abrir:** `http://localhost:3000/fgts`
- ✅ **Testar upload** de CSV
- ✅ **Verificar contadores** (Total, Processados, etc.)
- ✅ **Testar funcionalidades** específicas alteradas
- ✅ **Verificar logs** no console
- ✅ **Testar cenários** de erro

#### **1.4 Debug e Correções**
```bash
# Se houver erros:
# 1. Verificar logs no console
# 2. Corrigir código localmente
# 3. Testar novamente
# 4. Repetir até funcionar 100%
```

#### **1.5 Commit Apenas Quando Perfeito**
```bash
# Só fazer commit quando estiver funcionando perfeitamente
git add .
git commit -m "Descrição clara das alterações testadas localmente"
git push origin master
```

---

## 🚀 **2. DEPLOY NO SERVIDOR (APÓS VALIDAÇÃO LOCAL)**

### 📝 **Passos de Deploy:**

#### **2.1 Conectar ao VPS**
```bash
# Conectar via SSH
ssh root@72.60.159.149
```

#### **2.2 Navegar e Atualizar**
```bash
# Ir para diretório do projeto
cd /root/api-lunas

# Atualizar código do Git
git pull origin master
```

#### **2.3 Deploy**
```bash
# Instalar dependências (se necessário)
npm install

# Reiniciar aplicação
pm2 restart api-extrato

# Verificar status
pm2 status
```

#### **2.4 Verificação Final**
```bash
# Testar se está funcionando
curl http://localhost:3000

# Verificar logs
pm2 logs api-extrato --lines 50
```

---

## ✅ **VANTAGENS DESTE FLUXO**

### 🎯 **Benefícios Técnicos:**
- **Menos erros** em produção
- **Desenvolvimento mais rápido** (sem delays de rede)
- **Debug mais fácil** (logs locais imediatos)
- **Testes seguros** sem afetar usuários
- **Deploy mais confiável**

### 🎯 **Benefícios Operacionais:**
- **Menos tempo** gasto corrigindo bugs em produção
- **Maior confiança** nas alterações
- **Histórico limpo** de commits
- **Rollback mais fácil** se necessário

---

## 🚫 **NUNCA FAZER**

### ❌ **Proibições Absolutas:**
- ❌ **Subir código não testado**
- ❌ **Fazer alterações diretas no VPS**
- ❌ **Deploy sem validação local**
- ❌ **Commit de código com bugs**
- ❌ **Pular etapas de teste**

### ⚠️ **Consequências de Não Seguir:**
- Bugs em produção
- Usuários afetados
- Tempo perdido corrigindo
- Perda de confiança
- Deploy instável

---

## 📁 **ESTRUTURA DE ARQUIVOS**

### 🏠 **Ambiente Local:**
```
C:\Users\srcor\API Lunas\
├── server.js              # Servidor principal
├── fgts/
│   ├── fgts_csv.js        # Lógica FGTS
│   ├── index.html         # Frontend
│   └── cache-persistente.js # Cache
└── package.json           # Dependências
```

### 🚀 **Ambiente VPS:**
```
/root/api-lunas/
├── server.js              # Servidor principal
├── fgts/
│   ├── fgts_csv.js        # Lógica FGTS
│   ├── index.html         # Frontend
│   └── cache-persistente.js # Cache
└── package.json           # Dependências
```

### 🔄 **Controle de Versão:**
- **Git:** Controle de versão e deploy automático
- **GitHub:** Repositório central
- **GitHub Actions:** Deploy automático (quando configurado)

---

## 🛠️ **FERRAMENTAS DE DEBUG LOCAL**

### 📊 **Logs Importantes:**
```bash
# Console do servidor
node server.js

# Logs específicos
console.log('🔍 DEBUG:', dados);
console.error('❌ ERRO:', erro);
```

### 🌐 **URLs de Teste:**
- **Principal:** `http://localhost:3000/`
- **FGTS:** `http://localhost:3000/fgts`
- **APIs:** `http://localhost:3000/fgts/estado`

### 🔍 **Endpoints de Debug:**
- `GET /fgts/debug-dados` - Verificar dados
- `GET /fgts/test-contadores` - Testar contadores
- `GET /fgts/estado` - Estado do processamento

---

## 📋 **CHECKLIST DE VALIDAÇÃO**

### ✅ **Antes do Commit:**
- [ ] Código funciona localmente
- [ ] Todos os testes passaram
- [ ] Logs estão limpos
- [ ] Funcionalidades específicas testadas
- [ ] Cenários de erro testados

### ✅ **Antes do Deploy:**
- [ ] Commit feito com sucesso
- [ ] Push realizado
- [ ] Código testado localmente
- [ ] Documentação atualizada (se necessário)

### ✅ **Após Deploy:**
- [ ] Servidor online
- [ ] Funcionalidades funcionando
- [ ] Logs sem erros críticos
- [ ] Usuários não afetados

---

## 🎯 **RESUMO**

**SEMPRE:** Desenvolver → Testar Local → Commit → Deploy  
**NUNCA:** Desenvolver → Deploy Direto  