# 🤖 Guia de Configuração Agent Builder - ChatGPT Vendedor

Este guia explica como configurar e usar o Agent Builder da OpenAI com o sistema ChatGPT Vendedor da Lunas Digital.

## 📋 Pré-requisitos

1. **Conta OpenAI**: Tenha uma conta ativa na OpenAI
2. **API Key**: Chave de API válida da OpenAI
3. **Node.js**: Versão 18 ou superior
4. **Dependências**: Instalar dependências do projeto

## 🚀 Configuração Inicial

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure suas chaves:

```bash
cp config-example.env .env
```

Edite o arquivo `.env` com suas configurações:

```env
# API Key do OpenAI (obrigatória)
OPENAI_API_KEY=sk-proj-sua-chave-aqui

# ID do Assistente (será gerado automaticamente)
OPENAI_ASSISTANT_ID=asst_sua-chave-aqui

# Configurações do Agent Builder
AGENT_BUILDER_ENABLED=true
AGENT_BUILDER_MODEL=gpt-4o-mini
AGENT_BUILDER_TEMPERATURE=0.7
AGENT_BUILDER_MAX_TOKENS=1000
```

### 3. Configurar Agent Builder

Execute o script de configuração automática:

```bash
npm run setup-agent
```

Este comando irá:
- ✅ Verificar sua API key
- 📝 Criar um novo assistente na OpenAI
- 🔧 Configurar ferramentas e instruções
- 📄 Atualizar o arquivo .env com o ID do assistente
- 🧪 Testar a configuração

## 🧪 Testando a Configuração

### Teste Completo

```bash
npm run test-agent
```

### Teste de Performance

```bash
npm run test-performance
```

### Teste de Cenários

```bash
npm run test-scenarios
```

## 🔧 Funcionalidades do Agent Builder

### Ferramentas Disponíveis

O assistente possui as seguintes ferramentas:

1. **buscar_dados_cliente**: Busca dados do cliente no CRM
2. **verificar_propostas**: Verifica propostas ativas do cliente
3. **simular_portabilidade**: Simula valores para portabilidade
4. **simular_fgts**: Simula valores para saque FGTS

### Instruções do Assistente

O assistente está configurado com instruções específicas para:

- ✅ Atendimento via WhatsApp
- 💰 Produtos: Portabilidade e Saque FGTS
- 📊 Acesso aos dados do cliente
- 🎯 Respostas personalizadas e objetivas
- 📞 Direcionamento para especialistas quando necessário

## 📊 Monitoramento e Logs

### Verificar Status

```bash
curl https://lunasdigital.com.br/api/status
```

### Logs do Sistema

```bash
pm2 logs api-extrato
```

### Logs do Agent Builder

Os logs incluem:
- 🧵 Criação de threads
- 💬 Mensagens enviadas/recebidas
- 🔧 Execução de ferramentas
- ⏱️ Tempo de resposta
- 📊 Uso de tokens

## 🛠️ Comandos Úteis

### Configuração

```bash
# Configurar Agent Builder
npm run setup-agent

# Limpar assistentes antigos
npm run cleanup-agent
```

### Testes

```bash
# Todos os testes
npm run test-agent

# Teste de performance
npm run test-performance

# Teste de cenários específicos
npm run test-scenarios
```

### Desenvolvimento

```bash
# Iniciar servidor
npm start

# Modo desenvolvimento
npm run dev

# Teste básico
npm test
```

## 🔄 Atualizações do Assistente

Para atualizar o assistente com novas configurações:

```bash
npm run setup-agent
```

Isso irá:
- 🔄 Atualizar instruções
- 🛠️ Atualizar ferramentas
- 📊 Atualizar configurações de modelo
- 🧪 Testar as mudanças

## 🚨 Troubleshooting

### Erro: "OPENAI_API_KEY não configurada"

```bash
# Verificar arquivo .env
cat .env | grep OPENAI_API_KEY

# Configurar API key
echo "OPENAI_API_KEY=sk-proj-sua-chave" >> .env
```

### Erro: "OPENAI_ASSISTANT_ID não configurado"

```bash
# Executar setup novamente
npm run setup-agent
```

### Erro: "Assistente não encontrado"

```bash
# Listar assistentes existentes
node -e "
import AgentBuilderIntegration from './agent-builder-integration.js';
const agent = new AgentBuilderIntegration();
agent.listAssistants();
"

# Recriar assistente
npm run cleanup-agent
npm run setup-agent
```

### Erro: "Timeout na API"

- Verificar conexão com internet
- Verificar status da API OpenAI
- Aumentar timeout se necessário

## 📈 Performance

### Otimizações Recomendadas

1. **Modelo**: Usar `gpt-4o-mini` (mais econômico)
2. **Tokens**: Limitar a 1000 tokens por resposta
3. **Timeout**: 30 segundos para API
4. **Cache**: Dados do cliente em memória
5. **Fallback**: Resposta automática em caso de erro

### Métricas de Performance

- ⏱️ Tempo de resposta: < 10 segundos
- 📊 Tokens por resposta: ~500-800
- 💰 Custo por conversa: ~$0.01-0.02
- 🎯 Taxa de sucesso: > 95%

## 🔒 Segurança

### Boas Práticas

- ✅ Validação de CPF obrigatória
- 🔐 API keys em variáveis de ambiente
- 📝 Logs de todas as interações
- ⏱️ Timeout de 30 segundos
- 🛡️ Rate limiting via Nginx

### Dados Sensíveis

- 🚫 Nunca logar dados pessoais completos
- 🔒 Criptografar dados em trânsito
- 📊 Anonimizar logs para análise
- 🗑️ Limpar dados temporários

## 📞 Suporte

### Contatos

- **Desenvolvedor**: Lunas Digital
- **Versão**: 1.0.0 com Agent Builder
- **Status**: Em Produção
- **Última Atualização**: Janeiro 2025

### Recursos Adicionais

- 📚 [Documentação OpenAI Assistants API](https://platform.openai.com/docs/assistants/overview)
- 🛠️ [OpenAI Playground](https://platform.openai.com/playground)
- 💬 [Suporte OpenAI](https://help.openai.com/)

---

**🎉 O Agent Builder está configurado e pronto para uso!**

Para dúvidas ou problemas, consulte este guia ou entre em contato com o suporte técnico.


