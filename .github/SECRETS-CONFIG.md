# 🔐 CONFIGURAÇÃO DE SECRETS - GITHUB ACTIONS

## 📋 Secrets Necessários

Para que os workflows funcionem, você precisa configurar os seguintes secrets no GitHub:

### 1. **VPS_SSH_KEY**
**Descrição:** Chave SSH privada para acessar o VPS
**Como obter:**
```bash
# No seu computador local, gere uma chave SSH se não tiver:
ssh-keygen -t rsa -b 4096 -C "github-actions@lunasdigital.com"

# Copie a chave pública para o VPS:
ssh-copy-id root@72.60.159.149

# Copie a chave privada para o GitHub Secret:
cat ~/.ssh/id_rsa
```

**Como configurar no GitHub:**
1. Vá para: `Settings` → `Secrets and variables` → `Actions`
2. Clique em `New repository secret`
3. Nome: `VPS_SSH_KEY`
4. Valor: Cole o conteúdo da chave privada (`~/.ssh/id_rsa`)

### 2. **VPS_HOST** (Opcional)
**Descrição:** Host do VPS (já configurado nos workflows)
**Valor padrão:** `root@72.60.159.149`

### 3. **VPS_PATH** (Opcional)
**Descrição:** Caminho no VPS (já configurado nos workflows)
**Valor padrão:** `/root/fgts`

## 🔧 Configuração do VPS

### Autorizar chave SSH no VPS:
```bash
# Conectar no VPS
ssh root@72.60.159.149

# Criar diretório .ssh se não existir
mkdir -p ~/.ssh

# Adicionar chave pública (substitua pela sua chave pública)
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC..." >> ~/.ssh/authorized_keys

# Configurar permissões
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Verificar acesso:
```bash
# Teste de conexão
ssh root@72.60.159.149 "echo 'Conexão SSH funcionando!'"
```

## 🚀 Workflows Disponíveis

### 1. **Deploy Automático** (`deploy-fgts.yml`)
- **Trigger:** Push para `master` ou `main`
- **Função:** Deploy automático quando há mudanças na pasta `fgts/`
- **Status:** ✅ Pronto para usar

### 2. **Deploy Manual** (`deploy-manual.yml`)
- **Trigger:** Execução manual
- **Função:** Deploy controlado com opções
- **Status:** ✅ Pronto para usar

### 3. **Testes Automatizados** (`test-fgts.yml`)
- **Trigger:** Push ou Pull Request
- **Função:** Testes de sintaxe e estrutura
- **Status:** ✅ Pronto para usar

## 📊 Como Usar

### Deploy Automático:
1. Faça push para `master` ou `main`
2. Workflow executa automaticamente
3. Verifique o status em `Actions`

### Deploy Manual:
1. Vá para `Actions` → `Deploy Manual FGTS`
2. Clique em `Run workflow`
3. Escolha as opções desejadas
4. Clique em `Run workflow`

### Testes:
1. Faça push ou crie Pull Request
2. Testes executam automaticamente
3. Verifique se todos passaram

## 🛠️ Troubleshooting

### Erro de SSH:
```bash
# Verificar se a chave está correta
ssh -T root@72.60.159.149

# Verificar permissões
ls -la ~/.ssh/
```

### Erro de Deploy:
- Verifique se o container está rodando
- Verifique se a porta 3005 está aberta
- Verifique os logs do container

### Erro de Testes:
- Verifique a sintaxe dos arquivos JavaScript
- Verifique se todos os arquivos necessários existem
- Verifique se os imports estão corretos

## 📝 Logs e Monitoramento

### Ver logs do workflow:
1. Vá para `Actions`
2. Clique no workflow executado
3. Clique no job específico
4. Veja os logs detalhados

### Ver logs do container:
```bash
ssh root@72.60.159.149 "docker logs fgts-lunasdigital --tail 50"
```

---

**🔐 Configure os secrets e os workflows estarão prontos para uso!** 🚀
