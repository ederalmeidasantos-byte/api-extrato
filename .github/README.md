# 🚀 GITHUB ACTIONS - FGTS SYSTEM

## 📋 Workflows Disponíveis

### 🔄 **Deploy Automático** (`deploy-fgts.yml`)
**Execução:** Automática em push para `master`/`main`
- ✅ Deploy automático dos arquivos
- ✅ Reinicialização do container
- ✅ Testes de verificação
- ✅ Relatório completo

### 🔧 **Deploy Manual** (`deploy-manual.yml`)
**Execução:** Manual via GitHub Actions
- ✅ Deploy controlado
- ✅ Opções de ambiente
- ✅ Forçar reinicialização
- ✅ Relatório detalhado

### 🧪 **Testes Automatizados** (`test-fgts.yml`)
**Execução:** Push ou Pull Request
- ✅ Verificação de sintaxe
- ✅ Validação de estrutura
- ✅ Testes de imports/exports
- ✅ Validação HTML

### 💾 **Backup Automático** (`backup-fgts.yml`)
**Execução:** Diária às 2:00 AM UTC + Manual
- ✅ Backup dos dados
- ✅ Backup da configuração
- ✅ Compactação automática
- ✅ Limpeza de backups antigos

## 🔐 Configuração Necessária

### Secrets do GitHub:
1. **VPS_SSH_KEY** - Chave SSH privada para acesso ao VPS
2. **VPS_HOST** - Host do VPS (opcional, padrão: `root@72.60.159.149`)
3. **VPS_PATH** - Caminho no VPS (opcional, padrão: `/root/fgts`)

### Como configurar:
1. Vá para `Settings` → `Secrets and variables` → `Actions`
2. Adicione o secret `VPS_SSH_KEY` com sua chave SSH privada
3. Os workflows estarão prontos para uso

**📖 Guia completo:** [SECRETS-CONFIG.md](./SECRETS-CONFIG.md)

## 🚀 Como Usar

### Deploy Automático:
```bash
# Faça push para master/main
git add .
git commit -m "Nova funcionalidade"
git push origin master
# Workflow executa automaticamente
```

### Deploy Manual:
1. Vá para `Actions` → `Deploy Manual FGTS`
2. Clique em `Run workflow`
3. Escolha as opções
4. Execute

### Testes:
```bash
# Push ou Pull Request
git push origin feature/nova-funcionalidade
# Testes executam automaticamente
```

### Backup:
- **Automático:** Todos os dias às 2:00 AM UTC
- **Manual:** Vá para `Actions` → `Backup Automático FGTS`

## 📊 Monitoramento

### Ver status dos workflows:
1. Vá para a aba `Actions`
2. Clique no workflow desejado
3. Veja logs detalhados

### Verificar sistema:
- **URL:** http://72.60.159.149:3005
- **Logs:** `ssh root@72.60.159.149 "docker logs fgts-lunasdigital"`

## 🛠️ Troubleshooting

### Erro de SSH:
- Verifique se `VPS_SSH_KEY` está configurado
- Teste: `ssh root@72.60.159.149 "echo 'teste'"`

### Erro de Deploy:
- Verifique se o container está rodando
- Verifique se a porta 3005 está aberta
- Verifique os logs do workflow

### Erro de Testes:
- Verifique sintaxe dos arquivos JavaScript
- Verifique se todos os arquivos existem
- Verifique imports e exports

## 📈 Status dos Workflows

| Workflow | Status | Trigger | Função |
|----------|--------|---------|--------|
| Deploy Automático | ✅ Ativo | Push master/main | Deploy automático |
| Deploy Manual | ✅ Ativo | Manual | Deploy controlado |
| Testes | ✅ Ativo | Push/PR | Validação código |
| Backup | ✅ Ativo | Diário + Manual | Backup dados |

## 🎯 Próximos Passos

1. **Configure os secrets** necessários
2. **Teste o deploy manual** primeiro
3. **Configure deploy automático** para produção
4. **Monitore os backups** automáticos
5. **Use os testes** para validação

---

**🚀 Sistema de CI/CD completo configurado!** ✨
