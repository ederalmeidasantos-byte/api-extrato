# 🚀 CONFIGURAÇÃO PERSISTENT DISK NO RENDER

## 📋 **GUIA COMPLETO PARA SEU PROJETO**

Baseado nas suas instruções do Render, aqui está o guia específico para configurar o Persistent Disk de 1GB com `/var/data/`.

---

## ✅ **STATUS ATUAL**

### **O que já está implementado:**
- ✅ Sistema completo de Persistent Disk no `server.js`
- ✅ Rotas para cache, extratos, uploads, logs e config
- ✅ Criação automática de diretórios em `/var/data/`
- ✅ Interface de teste (`test-persistent-disk.html`)
- ✅ Endpoints de teste e status

### **O que precisa ser feito:**
- 🔧 Configurar Persistent Disk no painel do Render
- 🚀 Fazer deploy das modificações
- 🧪 Testar o funcionamento

---

## 🔧 **CONFIGURAÇÃO NO RENDER**

### **Passo 1: Acessar o Painel do Render**
1. Acesse: https://dashboard.render.com
2. Entre no seu projeto `painel-fgts`
3. Vá em **Settings** → **Disks**

### **Passo 2: Adicionar Persistent Disk**
1. Clique em **"Add Disk"**
2. Configure:
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB`
3. Clique em **"Add Disk"**

### **Passo 3: Deploy Automático**
- O Render fará deploy automaticamente após adicionar o disco
- Aguarde o deploy completar (2-3 minutos)

---

## 🚀 **DEPLOY DAS MODIFICAÇÕES**

### **Opção 1: Deploy Automático (Recomendado)**
Se você tem auto-deploy habilitado:
```bash
# Fazer commit das mudanças
git add .
git commit -m "feat: implementar Persistent Disk com /var/data/"
git push origin main
```

### **Opção 2: Deploy Manual**
1. No painel do Render
2. Vá em **Manual Deploy**
3. Clique em **"Deploy latest commit"**

---

## 🧪 **TESTE DO PERSISTENT DISK**

### **Teste 1: Verificar Status**
```bash
curl https://seu-projeto.onrender.com/api/status/persistent-disk
```

**Resposta esperada:**
```json
{
  "persistentPath": "/var/data",
  "directories": {
    "cache": {
      "exists": true,
      "path": "/var/data/cache",
      "fileCount": 0,
      "totalSizeBytes": 0,
      "totalSizeMB": "0.00"
    },
    "extratos": {
      "exists": true,
      "path": "/var/data/extratos",
      "fileCount": 0,
      "totalSizeBytes": 0,
      "totalSizeMB": "0.00"
    }
    // ... outros diretórios
  }
}
```

### **Teste 2: Teste Completo**
```bash
curl https://seu-projeto.onrender.com/api/test/persistent-disk
```

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Persistent Disk funcionando corretamente!",
  "testResults": {
    "cache": {"success": true, "path": "/var/data/cache/test_1234567890.json"},
    "extratos": {"success": true, "path": "/var/data/extratos/test_1234567890.json"}
    // ... outros testes
  }
}
```

### **Teste 3: Interface Web**
Acesse: `https://seu-projeto.onrender.com/test-persistent-disk.html`

---

## 📁 **ESTRUTURA CRIADA**

Após o deploy, você terá:

```
/var/data/
├── cache/          # Cache de resultados
├── extratos/       # Extratos JSON processados  
├── uploads/        # Arquivos CSV, PDFs, etc.
├── logs/           # Logs do sistema
└── config/         # Configurações
```

---

## 🔄 **MIGRAÇÃO DOS ARQUIVOS EXISTENTES**

### **Arquivos que serão migrados:**
- `cache/` → `/var/data/cache/`
- `extratos/` → `/var/data/extratos/`
- `uploads/` → `/var/data/uploads/`
- `logs/` → `/var/data/logs/`

### **Como migrar:**
1. **Teste primeiro** com alguns arquivos
2. **Use as novas rotas** para salvar arquivos
3. **Verifique** se os arquivos persistem após deploy

---

## 📊 **MONITORAMENTO**

### **Verificar Uso do Disco:**
```bash
# Status detalhado
curl https://seu-projeto.onrender.com/api/status/persistent-disk

# Listar arquivos em cada diretório
curl https://seu-projeto.onrender.com/api/cache/list
curl https://seu-projeto.onrender.com/api/extratos/list
curl https://seu-projeto.onrender.com/api/uploads/list
```

### **Logs do Render:**
- Acesse o painel do Render
- Vá em **Logs**
- Procure por mensagens como:
  - `✅ Diretório persistente criado: /var/data/cache`
  - `💾 Cache salvo: /var/data/cache/arquivo.json`

---

## ⚠️ **LIMITAÇÕES IMPORTANTES**

### **Com Persistent Disk:**
- ❌ **Não pode escalar** para múltiplas instâncias
- ❌ **Sem zero-downtime deploys** (alguns segundos de indisponibilidade)
- ❌ **Não acessível durante build** (só em runtime)

### **Sem Persistent Disk:**
- ✅ **Pode escalar** horizontalmente
- ✅ **Zero-downtime deploys**
- ❌ **Arquivos são perdidos** a cada deploy

---

## 🎯 **EXEMPLOS DE USO**

### **Salvar Cache:**
```javascript
// Via API
fetch('/api/cache/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'resultados_fgts.json',
    data: { resultados: [...] }
  })
});
```

### **Salvar Extrato:**
```javascript
// Via API
fetch('/api/extratos/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: '12345',
    extratoData: { banco: 'BB', saldo: 1000 }
  })
});
```

### **Salvar Upload:**
```javascript
// Via API
fetch('/api/uploads/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'dados.csv',
    content: 'nome,idade\nJoão,30',
    type: 'csv'
  })
});
```

---

## 🔧 **TROUBLESHOOTING**

### **Problema: "Diretório não existe"**
**Solução:** Verificar se o Persistent Disk foi configurado corretamente no Render

### **Problema: "Arquivos não persistem"**
**Solução:** Verificar se está salvando em `/var/data/` e não em caminhos locais

### **Problema: "Erro de permissão"**
**Solução:** O Render gerencia permissões automaticamente

### **Problema: "Deploy falha"**
**Solução:** Verificar logs do Render para erros específicos

---

## ✅ **CHECKLIST FINAL**

### **Configuração:**
- [ ] ✅ Persistent Disk adicionado no Render (1GB, `/var/data`)
- [ ] ✅ Deploy realizado com sucesso
- [ ] ✅ Diretórios criados automaticamente

### **Teste:**
- [ ] ✅ Status retorna diretórios existentes
- [ ] ✅ Teste completo executa sem erros
- [ ] ✅ Interface web carrega corretamente

### **Funcionalidade:**
- [ ] ✅ Cache salva e carrega arquivos
- [ ] ✅ Extratos persistem entre deploys
- [ ] ✅ Uploads funcionam corretamente
- [ ] ✅ Logs são salvos persistentemente

---

## 🎉 **RESULTADO ESPERADO**

Após seguir este guia:

1. **✅ Persistent Disk configurado** no Render
2. **✅ Sistema funcionando** com `/var/data/`
3. **✅ Arquivos persistem** entre deploys
4. **✅ Cache, extratos, uploads** salvos permanentemente
5. **✅ Interface de teste** disponível

**Seu projeto agora tem armazenamento persistente de 1GB!** 🚀

---

## 📞 **SUPORTE**

Se encontrar problemas:
1. **Verifique os logs** do Render
2. **Teste localmente** primeiro
3. **Use a interface de teste** para debug
4. **Consulte este guia** para troubleshooting

**Boa sorte com o Persistent Disk!** 🎯✨
