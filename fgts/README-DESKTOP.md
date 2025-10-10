# Sistema FGTS - Aplicação Desktop

## 📋 Descrição

O Sistema FGTS foi transformado em uma aplicação desktop completa usando Electron, permitindo que você execute o sistema como um programa nativo do Windows sem necessidade de navegador web.

## 🚀 Funcionalidades

- **Interface Desktop Nativa**: Interface moderna e responsiva
- **Processamento Automático**: Consultas FGTS automatizadas
- **Sistema de Cache**: Cache persistente para otimização
- **Logs em Tempo Real**: Monitoramento completo do sistema
- **Configurações Avançadas**: Painel de configuração integrado
- **Instalador Automático**: Instalação simples com NSIS

## 📦 Instalação

### Opção 1: Executar Diretamente
1. Execute `run.bat` para instalar dependências e iniciar
2. O sistema será aberto automaticamente

### Opção 2: Criar Instalador
1. Execute `build.bat` para criar o instalador
2. Execute o arquivo `.exe` gerado em `dist/`
3. Siga o assistente de instalação

## ⚙️ Configuração

### 1. Credenciais FGTS
Configure suas credenciais no arquivo `.env`:
```env
FGTS_USER_1=seu_usuario
FGTS_PASS_1=sua_senha
FGTS_USER_2=usuario_backup
FGTS_PASS_2=senha_backup
```

### 2. APIs Externas
```env
V8_CLIENT_ID=seu_client_id
V8_USERNAME=seu_username
LUNAS_API_KEY=sua_api_key
LUNAS_API_URL=https://sua-api.com
```

## 🎯 Como Usar

1. **Iniciar Sistema**: Execute o aplicativo
2. **Configurar**: Acesse as configurações para inserir credenciais
3. **Upload CSV**: Faça upload do arquivo CSV com CPFs
4. **Processar**: O sistema processará automaticamente
5. **Monitorar**: Acompanhe os logs em tempo real

## 📊 Recursos Avançados

### Painel de Controle
- **Status do Sistema**: Monitoramento em tempo real
- **Estatísticas**: Contadores de sucesso/erro
- **Cache Management**: Gerenciamento de cache
- **Logs Detalhados**: Sistema de logs completo

### Configurações
- **Delay Personalizado**: Ajuste a velocidade de processamento
- **Horário Comercial**: Processamento apenas em horários específicos
- **Backup/Restore**: Backup das configurações
- **Teste de Conexões**: Verificação de APIs

## 🔧 Desenvolvimento

### Estrutura do Projeto
```
fgts/
├── main.js              # Processo principal do Electron
├── server.js            # Servidor Express
├── index.html           # Interface web
├── fgts_csv.js          # Lógica de processamento
├── package.json         # Dependências e scripts
├── build.bat            # Script de build
├── run.bat              # Script de execução
└── assets/              # Recursos (ícones, etc.)
```

### Scripts Disponíveis
- `npm start`: Executar aplicação
- `npm run build`: Construir para produção
- `npm run build-win`: Construir para Windows
- `npm run dev`: Modo desenvolvimento

## 🛠️ Solução de Problemas

### Erro de Dependências
```bash
# Limpar cache e reinstalar
rm -rf node_modules
npm install
```

### Erro de Porta
- Verifique se a porta 3003 está livre
- Altere a porta no arquivo `main.js` se necessário

### Problemas de Cache
- Use a função "Limpar Cache" no painel
- Reinicie a aplicação

## 📝 Logs

Os logs são salvos em:
- **Aplicação**: Console integrado
- **Arquivo**: `logs/` (se configurado)
- **Sistema**: Logs do Windows

## 🔒 Segurança

- Credenciais armazenadas localmente
- Comunicação HTTPS com APIs
- Cache criptografado
- Logs sem dados sensíveis

## 📞 Suporte

Para suporte técnico:
- Verifique os logs do sistema
- Consulte a documentação técnica
- Entre em contato com a equipe de desenvolvimento

---

**Desenvolvido por Lunas Digital**  
*Sistema automatizado para processamento FGTS*



