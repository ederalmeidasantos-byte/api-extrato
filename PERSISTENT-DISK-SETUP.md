# 🗄️ CONFIGURAÇÃO PERSISTENT DISK - RENDER

## 🎯 **OBJETIVO**
Configurar o Persistent Disk no Render para que os caches e dados não sejam perdidos entre deploys.

---

## ⚙️ **CONFIGURAÇÃO NO RENDER**

### **1. Acessar o Painel do Render**
1. Acesse: https://dashboard.render.com
2. Faça login na sua conta
3. Entre no projeto **painel-fgts**

### **2. Configurar Persistent Disk**
1. No painel do projeto, clique em **"Settings"**
2. Vá para a aba **"Disks"**
3. Clique em **"Add Disk"**
4. Configure:
   - **Mount Path**: `/var/data`
   - **Size**: `1 GB` (ou conforme necessário)
5. Clique em **"Add Disk"**

### **3. Aguardar Configuração**
- O Render irá configurar o Persistent Disk
- Aguarde alguns minutos para a configuração ser aplicada
- O status deve mudar para "Active"

---

## 📁 **ESTRUTURA DE DIRETÓRIOS**

O sistema automaticamente criará os seguintes diretórios:

```
/var/data/
├── cache/                    # Cache do sistema FGTS
│   ├── pendentes.json       # Lista de CPFs pendentes
│   ├── tentativas-cache.json # Tentativas de cache V8
│   ├── estado-processamento.json # Estado geral do sistema
│   ├── listas-resultados.json # Resultados por categoria
│   └── backups/             # Backups automáticos
├── extratos/                # Extratos JSON processados
│   ├── extrato_12345.json   # Extrato processado
│   ├── extrato_67890.json   # Outro extrato
│   └── ...
├── uploads/                 # Arquivos enviados
│   ├── dados_teste.csv      # CSV de teste
│   ├── documento.pdf        # PDF enviado
│   └── ...
├── logs/                    # Logs do sistema
│   ├── app.log             # Log principal
│   ├── error.log           # Log de erros
│   └── ...
└── config/                  # Configurações
    ├── app_config.json      # Configurações da aplicação
    ├── user_preferences.json # Preferências do usuário
    └── ...
```

---

## 🔧 **ARQUIVOS ATUALIZADOS**

### **✅ server.js**
- Configuração do Persistent Disk
- Criação automática de diretórios
- Multer configurado para usar `/var/data/uploads`

### **✅ cache-persistente.js**
- Já configurado para usar `/var/data/cache`
- Sistema de backup automático
- Criação automática de diretórios

### **✅ extrair_pdf.js**
- Já configurado para usar `/var/data/extratos`
- Cache de extratos persistente
- TTL configurável

### **✅ fgts_csv.js**
- Não precisa de alterações (usa cache-persistente.js)

---

## 🚀 **DEPLOY COM PERSISTENT DISK**

### **1. Fazer Deploy**
```bash
git add .
git commit -m "Configuração Persistent Disk - Cache persistente entre deploys"
git push origin main
```

### **2. Verificar Logs**
Após o deploy, verifique os logs para confirmar:
```
✅ Diretório persistente criado: /var/data/cache
✅ Diretório persistente criado: /var/data/extratos
✅ Diretório persistente criado: /var/data/uploads
✅ Diretório persistente criado: /var/data/logs
✅ Diretório persistente criado: /var/data/config
```

### **3. Testar Persistência**
1. Faça upload de um CSV
2. Processe alguns CPFs
3. Faça um novo deploy
4. Verifique se os dados persistiram

---

## 🔍 **VERIFICAÇÃO DE FUNCIONAMENTO**

### **1. Health Check**
```bash
curl https://painel-fgts.onrender.com/api/health
```

### **2. Verificar Cache**
```bash
curl https://painel-fgts.onrender.com/fgts/cache/estatisticas
```

### **3. Verificar Logs**
```bash
curl https://painel-fgts.onrender.com/fgts/logs/estatisticas
```

---

## ⚠️ **IMPORTANTE**

### **Configuração Manual Necessária**
- O Persistent Disk **DEVE** ser configurado manualmente no painel do Render
- O arquivo `render.yaml` não configura automaticamente o Persistent Disk
- Sem a configuração manual, os dados serão perdidos a cada deploy

### **Verificação de Status**
- No painel do Render, vá em **Settings → Disks**
- Verifique se o status está **"Active"**
- Se estiver **"Pending"**, aguarde a configuração

### **Tamanho do Disco**
- **1 GB**: Suficiente para cache e logs
- **5 GB**: Para uso intensivo com muitos extratos
- **10 GB**: Para uso empresarial

---

## 🎉 **BENEFÍCIOS ALCANÇADOS**

### **✅ Persistência Total**
- Cache FGTS nunca se perde
- Extratos processados mantidos
- Logs preservados entre deploys
- Configurações persistentes

### **✅ Performance Otimizada**
- Cache rápido para extratos
- Redução de processamento desnecessário
- Resposta mais rápida para usuários

### **✅ Confiabilidade Máxima**
- Sistema robusto com backups
- Recuperação automática de erros
- Monitoramento contínuo

---

## 📞 **SUPORTE**

### **Problemas Comuns**
1. **"Diretório não existe"**: Persistent Disk não configurado
2. **"Permissão negada"**: Verificar configuração do disco
3. **"Espaço insuficiente"**: Aumentar tamanho do disco

### **Comandos de Debug**
```bash
# Verificar status
curl https://painel-fgts.onrender.com/api/health

# Verificar cache
curl https://painel-fgts.onrender.com/fgts/cache/estatisticas
```

---

## 🎯 **CONCLUSÃO**

Com o Persistent Disk configurado:
- ✅ **Dados nunca se perdem** entre deploys
- ✅ **Cache mantido** entre reinicializações
- ✅ **Estado preservado** entre sessões
- ✅ **Sistema robusto** e confiável

**🚀 O sistema está pronto para produção com persistência total!**
