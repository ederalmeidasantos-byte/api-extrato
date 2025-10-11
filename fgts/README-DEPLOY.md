# 🚀 SCRIPTS DE DEPLOY AUTOMÁTICO - FGTS

## 📋 Scripts Disponíveis

### 1. **Deploy Completo** (`deploy-automatico.ps1`)
**Faz tudo automaticamente:**
- ✅ Git add, commit e push para GitHub
- ✅ Deploy dos arquivos no VPS
- ✅ Reinicialização do container
- ✅ Testes e verificações

**Como usar:**
```powershell
# Deploy com mensagem padrão
.\deploy-automatico.ps1

# Deploy com mensagem personalizada
.\deploy-automatico.ps1 -commitMessage "Correção do bug X"

# Deploy em branch específica
.\deploy-automatico.ps1 -branch "develop"
```

### 2. **Deploy Rápido** (`deploy-rapido.ps1`)
**Apenas deploy e reinicialização:**
- ✅ Deploy dos arquivos no VPS
- ✅ Reinicialização do container
- ✅ Teste básico da API

**Como usar:**
```powershell
.\deploy-rapido.ps1
```

### 3. **Deploy Batch** (`deploy-rapido.bat`)
**Versão Windows Batch:**
- ✅ Deploy dos arquivos no VPS
- ✅ Reinicialização do container
- ✅ Teste básico da API

**Como usar:**
```cmd
deploy-rapido.bat
```

## 🔧 Configurações

### VPS Settings
- **Host:** `root@72.60.159.149`
- **Path:** `/root/fgts`
- **Port:** `3005`

### Arquivos Deployados
- `server.js` - Servidor principal
- `fgts_csv.js` - Lógica FGTS
- `index.html` - Interface frontend
- `error-logger.js` - Sistema de logs
- `config-manager.js` - Gerenciador de configurações
- `cache-persistente.js` - Cache persistente
- `proxy-config.js` - Configuração de proxy

## 🚀 Como Usar

### Opção 1: PowerShell (Recomendado)
1. Abra PowerShell como Administrador
2. Navegue até a pasta: `C:\Users\srcor\API Lunas\fgts`
3. Execute: `.\deploy-automatico.ps1`

### Opção 2: Batch
1. Abra CMD
2. Navegue até a pasta: `C:\Users\srcor\API Lunas\fgts`
3. Execute: `deploy-rapido.bat`

## 📊 Verificações Automáticas

Os scripts fazem verificações automáticas:
- ✅ Status do container Docker
- ✅ Resposta da API
- ✅ Logs do sistema
- ✅ Endpoints principais

## 🛠️ Troubleshooting

### Erro de Permissão PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Erro de SSH
- Verifique se a chave SSH está configurada
- Teste: `ssh root@72.60.159.149 "echo 'teste'"`

### Erro de SCP
- Verifique se o OpenSSH está instalado
- Teste: `scp --version`

## 📝 Logs

Os scripts mostram logs detalhados:
- 🔍 **Verde:** Operações bem-sucedidas
- ⚠️ **Amarelo:** Avisos e informações
- ❌ **Vermelho:** Erros
- 📊 **Branco:** Dados e respostas

## 📁 **IMPORTANTE: Estrutura de Arquivos**

### **Lista Detalhada de Monitoramento**
- **URL**: `http://72.60.159.149:3005/fgts/lista-detalhada.html`
- **Propósito**: Monitoramento em tempo real de todos os CPFs processados
- **Funcionalidades**: Filtros, busca, paginação, tempo real

### **Arquivos de CPFs para Processar**
- **Localização**: `/var/lib/docker/volumes/fgts_fgts-data/_data/uploads/`
- **Formato**: `CPF;TELEFONE;ID`
- **Total**: 3507 CPFs por arquivo
- **⚠️ NÃO CONFUNDIR**: Com `LISTA-FGTS.csv` (que é para buscar IDs da KENTRO)

### **Documentação Completa**
- **README Estrutura**: `README-ESTRUTURA-ARQUIVOS.md` - Documentação completa sobre listas e arquivos

## 🎯 Próximos Passos

Após o deploy:
1. Acesse: http://72.60.159.149:3005
2. **Lista Detalhada**: http://72.60.159.149:3005/fgts/lista-detalhada.html
3. Verifique os contadores
4. Teste o botão "Iniciar Processamento"
5. Monitore os logs em tempo real

## 🔄 Workflow Recomendado

1. **Desenvolvimento local** - Faça suas alterações
2. **Deploy rápido** - `.\deploy-rapido.ps1` para testes
3. **Deploy completo** - `.\deploy-automatico.ps1` para produção
4. **Verificação** - Acesse o sistema e teste

---

**✨ Agora você tem deploy automático completo!** 🎉
