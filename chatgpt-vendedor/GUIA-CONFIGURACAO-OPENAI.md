# 🤖 Guia Completo: Configurar Agent Builder OpenAI (gpt-5-nano)

Este guia te ensina a configurar o Agent Builder da OpenAI para o sistema ChatGPT Vendedor Lunas Digital.

## 📋 Informações Base do Projeto

- **Sistema**: ChatGPT Vendedor Lunas Digital
- **Produtos**: Portabilidade com Troco e Saque FGTS
- **Perfis**: Vendedor (propostas não iniciadas) e Recepcionista (propostas em andamento)
- **Modelo**: gpt-5-nano (mais econômico)
- **Limite**: 20 palavras por resposta
- **Tom**: Profissional, sem emojis

## 🚀 Passo a Passo Completo

### PASSO 1: Acessar Agent Builder

1. Acesse [OpenAI Platform](https://platform.openai.com)
2. Vá em **"Agent Builder"** no menu lateral
3. Clique em **"Create new workflow"**

### PASSO 2: Configurar o Agente

#### 2.1 - Nome do Agente
```
ChatGPT Vendedor Lunas
```

#### 2.2 - Instructions (System Prompt)

**APAGUE** o texto atual e **COLE** este prompt:

```
Você é assistente de vendas da Lunas Digital especializado em empréstimo consignado via WhatsApp.

REGRA OBRIGATÓRIA: 
- Responda em NO MÁXIMO 20 PALAVRAS
- Seja direto, claro e profissional
- SEM emojis

PRODUTOS:
- Portabilidade: troco de empréstimo existente
- FGTS: saque do fundo de garantia

PERFIL VENDEDOR (propostas não iniciadas):
- Tom persuasivo e comercial
- Foque em benefícios e valores específicos
- Apresente condições e taxas
- Termine com call-to-action

PERFIL RECEPCIONISTA (propostas em andamento):
- Tom educativo e prestativo
- Explique status atual e próximos passos
- Tire dúvidas sobre prazos e documentos
- Ofereça suporte adicional

DADOS DO CLIENTE:
O usuário enviará mensagem com formato:
"[PERFIL: vendedor/recepcionista]
Cliente: [nome]
CPF: [cpf]
Propostas: [dados das propostas]
Mensagem: [texto do cliente]"

IMPORTANTE:
- Use nome do cliente sempre
- Seja transparente sobre taxas e condições
- Para dúvidas complexas: "Vou transferir para especialista"
- MÁXIMO 20 PALAVRAS - seja extremamente conciso!
- Use dados reais das propostas quando disponíveis
```

#### 2.3 - User (Mensagem de Exemplo)
**Deixe VAZIO** - você testará depois com Preview

#### 2.4 - Include chat history
**Ative** o toggle (deixe AZUL) ✅

#### 2.5 - Model
**Selecione:** `gpt-5-nano` ✅

#### 2.6 - Reasoning effort
**Deixe em:** `minimal` ✅

#### 2.7 - Tools
**Clique em "+ Add"** e adicione:
- **Guardrails** (para validar limite de 20 palavras)

#### 2.8 - Output format
**Deixe em:** `Text` ✅

#### 2.9 - More (Configurações Avançadas)
**Clique em "More"** e configure:
- **Temperature:** `0.3` (mais determinístico)
- **Max completion tokens:** `50` (força respostas curtas)
- **Top P:** `1.0`

### PASSO 3: Adicionar Guardrails

1. Na barra lateral esquerda, arraste **"Guardrails"** para o fluxo
2. Posicione entre "Lua Agent" → "Guardrails" → "End"
3. Configure o Guardrails:

**Nome:** `Validar 20 palavras`

**Regra:**
```
- Contar palavras na resposta do agente
- Se > 20 palavras: rejeitar e pedir resposta mais curta
- Se <= 20 palavras: aprovar e continuar
```

### PASSO 4: Testar o Agente

**Clique em "Preview"** (botão superior direito)

#### Testes Obrigatórios:

**Teste 1 - Vendedor:**
```
[PERFIL: vendedor]
Cliente: João Silva
CPF: 12345678901
Propostas: Nenhuma
Mensagem: Qual valor das parcelas para portabilidade?
```

**Resposta esperada (≤20 palavras):**
"João, parcelas portabilidade a partir R$200. Troco disponível. Taxas 1,65%. Quer simular valores específicos?"

**Teste 2 - Recepcionista:**
```
[PERFIL: recepcionista]
Cliente: Maria Santos
CPF: 98765432100
Propostas: Portabilidade aprovada R$ 5.000 - 24x
Mensagem: Quando sai meu dinheiro?
```

**Resposta esperada (≤20 palavras):**
"Maria, dinheiro cai em 2-5 dias úteis após assinatura. Proposta aprovada aguardando documentos. Precisa ajuda?"

**Teste 3 - Cliente insatisfeito:**
```
[PERFIL: vendedor]
Cliente: Pedro Costa
Mensagem: Estou muito bravo com o atendimento!
```

**Resposta esperada (≤20 palavras):**
"Pedro, lamento isso. Vou transferir para especialista resolver imediatamente. Um momento por favor."

### PASSO 5: Avaliar e Ajustar

**Clique em "Evaluate"** (botão superior)

1. Crie conjunto de testes com os exemplos acima
2. Verifique se todas respostas têm ≤20 palavras
3. Ajuste instruções se necessário
4. Teste diferentes cenários

### PASSO 6: Publicar

Quando tudo estiver funcionando:

1. **Clique em "Publish"** (botão superior direito)
2. Confirme a publicação
3. **COPIE o Workflow ID** que será gerado
4. **COPIE o API Endpoint**

## 🔧 Configurações Finais

### Atualizar arquivo .env:
```env
OPENAI_API_KEY=sk-proj-sua-chave
OPENAI_WORKFLOW_ID=wf_[ID_GERADO_AQUI]
OPENAI_MODEL=gpt-5-nano
AGENT_BUILDER_ENABLED=true
```

## 📊 Resumo das Configurações

| Configuração | Valor |
|--------------|-------|
| Model | gpt-5-nano |
| Temperature | 0.3 |
| Max tokens | 50 |
| Reasoning | minimal |
| Chat history | ON |
| Limite palavras | 20 |
| Emojis | NÃO |
| Tom | Profissional |

## 🧪 Cenários de Teste Adicionais

### Cenário 1: Consulta sobre FGTS
**Entrada:**
```
[PERFIL: vendedor]
Cliente: Ana Costa
Mensagem: Como funciona o saque do FGTS?
```

**Resposta esperada:**
"Ana, FGTS permite saque até 80% do saldo. Parcelas em até 24x. Taxa 0,99%. Quer simular?"

### Cenário 2: Dúvida sobre documentos
**Entrada:**
```
[PERFIL: recepcionista]
Cliente: Carlos Lima
Propostas: Portabilidade em análise
Mensagem: Que documentos preciso enviar?
```

**Resposta esperada:**
"Carlos, precisa RG, CPF, comprovante renda e holerite. Enviei lista completa por email. Precisa ajuda?"

### Cenário 3: Solicitação de atendente
**Entrada:**
```
[PERFIL: vendedor]
Cliente: Lucia Santos
Mensagem: Quero falar com um atendente humano
```

**Resposta esperada:**
"Lucia, vou transferir para especialista agora. Aguarde um momento por favor."

## 🆘 Troubleshooting

### Problema: Respostas muito longas
**Solução:**
- Reduza max_tokens para 30
- Ajuste temperature para 0.2
- Adicione "MÁXIMO 15 PALAVRAS" nas instruções

### Problema: Respostas muito genéricas
**Solução:**
- Aumente temperature para 0.4
- Adicione exemplos específicos nas instruções
- Use dados reais nos testes

### Problema: Não segue perfil
**Solução:**
- Verifique se está passando [PERFIL: vendedor/recepcionista]
- Adicione mais detalhes sobre diferenças entre perfis
- Teste com dados reais de propostas

## 📈 Monitoramento

### Métricas Importantes:
- **Tempo de resposta**: < 5 segundos
- **Palavras por resposta**: ≤ 20
- **Taxa de sucesso**: > 95%
- **Custo por conversa**: ~$0.001-0.002

### Logs para Acompanhar:
- Respostas que excedem 20 palavras
- Chamadas para especialista
- Erros de integração
- Tempo de resposta

## 🎯 Próximos Passos

Após configurar o Agent Builder básico:

1. **Integrar Custom Tools** (buscar dados automaticamente)
2. **Configurar webhook** para WhatsApp
3. **Implementar logs** detalhados
4. **Criar dashboard** de monitoramento
5. **Otimizar prompts** baseado em uso real

---

**🎉 Agente configurado com sucesso!**

Para dúvidas ou problemas, consulte este guia ou entre em contato com o suporte técnico.

