# 📝 Guia: Como Adicionar Perguntas e Respostas ao FAQ

## 🎯 Localização do Arquivo

**Arquivo principal**: `chatgpt-vendedor/sistema-faq-inteligente.js`

## 🔧 Como Adicionar Nova Categoria

### 1. Abrir o arquivo `sistema-faq-inteligente.js`

### 2. Localizar a função `carregarBaseConhecimento()` (linha ~15)

### 3. Adicionar nova categoria dentro do objeto `baseConhecimento`:

```javascript
// Exemplo: Adicionar categoria "documentos"
documentos: {
  perguntas: [
    "quais documentos",
    "preciso de documentos",
    "documentos necessarios",
    "o que levar",
    "lista de documentos"
  ],
  resposta: (dadosCliente) => {
    return `Para a portabilidade, você precisará dos seguintes documentos:

DOCUMENTOS OBRIGATÓRIOS:
- RG ou CNH (válidos)
- CPF
- Comprovante de residência (atualizado)
- Extrato do empréstimo atual
- Comprovante de renda

DOCUMENTOS ADICIONAIS:
- Comprovante de benefício INSS
- Extrato bancário (3 meses)
- Comprovante de vínculo empregatício

Todos os documentos devem estar legíveis e atualizados.`;
  }
}
```

## 🔧 Como Adicionar Perguntas a Categoria Existente

### 1. Localizar a categoria desejada (ex: "parcelas")

### 2. Adicionar novas perguntas no array `perguntas`:

```javascript
parcelas: {
  perguntas: [
    "qual a parcela",
    "quanto e a parcela",
    "valor da parcela",
    "parcela atual",
    "nova parcela",
    "quanto vou pagar",
    "valor mensal",
    // ADICIONAR AQUI:
    "quanto custa",
    "valor da prestacao",
    "quanto pago por mes"
  ],
  resposta: (dadosCliente) => {
    // ... código existente
  }
}
```

## 🔧 Como Modificar Resposta Existente

### 1. Localizar a categoria desejada

### 2. Modificar a função `resposta`:

```javascript
processo: {
  perguntas: [
    "como funciona",
    "o que e portabilidade",
    "explicar portabilidade"
  ],
  resposta: (dadosCliente) => {
    // MODIFICAR AQUI:
    return `Portabilidade de consignado é a transferência do seu empréstimo de um banco para outro com melhores condições.

VANTAGENS:
- Redução na parcela mensal
- Troco disponível
- Taxas mais baixas
- Mesmo prazo ou melhor
- Processo 100% online

PROCESSO:
1. Análise do seu perfil
2. Busca das melhores propostas
3. Escolha da proposta ideal
4. Aprovação da portabilidade
5. Transferência do contrato

Quer ver suas propostas disponíveis?`;
  }
}
```

## 📋 Exemplos Práticos

### Exemplo 1: Adicionar categoria "Cancelamento"

```javascript
cancelamento: {
  perguntas: [
    "quero cancelar",
    "cancelar proposta",
    "desistir",
    "não quero mais",
    "voltar atras"
  ],
  resposta: (dadosCliente) => {
    return `Entendo que você quer cancelar a proposta.

CANCELAMENTO:
- Você pode cancelar a qualquer momento antes da aprovação
- Após a aprovação, o contrato segue as regras do banco
- Não há custos para cancelar antes da aprovação

Posso te ajudar com mais alguma informação?`;
  }
}
```

### Exemplo 2: Adicionar categoria "Prazo"

```javascript
prazo: {
  perguntas: [
    "qual o prazo",
    "quanto tempo",
    "quando fica pronto",
    "demora quanto",
    "prazo de pagamento"
  ],
  resposta: (dadosCliente) => {
    if (!dadosCliente.propostas || dadosCliente.propostas.length === 0) {
      return "Não encontrei propostas para consultar o prazo. Posso te ajudar a simular uma proposta?";
    }
    
    const prazos = dadosCliente.propostas.map((p, i) => {
      const prazo = p.dados?.cliente?.prazo || 'N/A';
      const bancoAtual = p.dados?.cliente?.bancoAtual || 'N/A';
      const bancoNovo = p.dados?.cliente?.bancoNovo || 'N/A';
      
      return `Proposta ${i + 1}: ${prazo} meses (${bancoAtual} → ${bancoNovo})`;
    }).join('\n');
    
    return `Prazos das suas propostas:\n\n${prazos}\n\nO prazo de análise da portabilidade é de 5 a 15 dias úteis.`;
  }
}
```

## ⚙️ Configurações Avançadas

### Ajustar Confiança Mínima

```javascript
// No construtor da classe (linha ~8)
this.confiancaMinima = 0.7; // 70% de confiança mínima
```

### Adicionar Pergunta Programaticamente

```javascript
// Usar o método adicionarPergunta
sistemaFAQInteligente.adicionarPergunta(
  'parcelas', 
  'quanto custa por mes', 
  (dadosCliente) => 'Resposta personalizada aqui'
);
```

## 🚀 Como Aplicar as Mudanças

### 1. Salvar o arquivo
### 2. Fazer commit:
```bash
git add chatgpt-vendedor/sistema-faq-inteligente.js
git commit -m "Feat: Adicionar novas perguntas ao FAQ"
git push
```

### 3. Deploy no servidor:
```bash
ssh root@lunasdigital.com.br "cd '/root/api-lunas/API Lunas' && git pull && pm2 restart api-extrato"
```

## 📊 Monitorar Resultados

### Ver estatísticas:
```javascript
const stats = sistemaInteligente.obterEstatisticas();
console.log(stats);
```

### Ajustar confiança:
```javascript
sistemaInteligente.ajustarConfiancaMinima(0.8); // 80% de confiança
```

## ✅ Dicas Importantes

1. **Use palavras-chave simples** nas perguntas
2. **Teste as respostas** antes de fazer deploy
3. **Mantenha consistência** no tom das respostas
4. **Use dados reais** do cliente quando possível
5. **Seja específico** nas respostas

## 🎯 Estrutura Recomendada

```javascript
categoria: {
  perguntas: [
    "pergunta 1",
    "pergunta 2",
    "pergunta 3"
  ],
  resposta: (dadosCliente) => {
    // Verificar se tem dados
    if (!dadosCliente.propostas || dadosCliente.propostas.length === 0) {
      return "Resposta quando não tem dados";
    }
    
    // Usar dados reais do cliente
    const dados = dadosCliente.propostas.map(...);
    
    return `Resposta formatada com dados reais:
    
    ${dados}
    
    Call to action final.`;
  }
}
```

