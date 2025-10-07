# 🔗 Exemplo de Integração com CRM Kentro

## 🎯 **Cenário de Uso**

Um agente no CRM Kentro precisa processar um extrato bancário de um cliente para análise de proposta de empréstimo.

---

## 📋 **Passo a Passo da Integração**

### **1. Cliente Envia Extrato no WhatsApp**
```
Cliente: "Aqui está meu extrato do mês passado"
[Arquivo: extrato_banco.pdf]
```

### **2. Kentro Processa e Envia para API**
```javascript
// No sistema Kentro
const oportunidade = {
  id: 36400,
  cliente: "João Silva",
  cpf: "123.456.789-00",
  status: "digitando"
};

const fileId = "7025"; // ID gerado pela Lunas

// Chamada para API de Extração
const response = await fetch('https://api-extrato-1.onrender.com/extrair', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileId: fileId,
    idoportunidade: oportunidade.id.toString()
  })
});

const dadosExtraidos = await response.json();
```

### **3. API Processa e Retorna Dados**
```json
{
  "fileId": "7025",
  "idoportunidade": "36400",
  "cliente": {
    "nome": "João Silva",
    "cpf": "123.456.789-00",
    "email": "joao@email.com",
    "telefone": "(11) 99999-9999"
  },
  "dados_bancarios": {
    "banco": "Banco do Brasil",
    "agencia": "1234",
    "conta": "56789-0",
    "pix": "joao@email.com"
  },
  "extrato": {
    "data_inicio": "2024-01-01",
    "data_fim": "2024-01-31",
    "saldo_inicial": 1500.00,
    "saldo_final": 2000.00,
    "movimentacoes": [
      {
        "data": "2024-01-15",
        "descricao": "Salário",
        "valor": 3000.00,
        "tipo": "credito"
      },
      {
        "data": "2024-01-20",
        "descricao": "Pagamento cartão",
        "valor": -500.00,
        "tipo": "debito"
      }
    ]
  },
  "simulador_link": "https://api-extrato-1.onrender.com/simulador?id=7025"
}
```

### **4. Kentro Atualiza Oportunidade**
```javascript
// Atualizar dados da oportunidade no Kentro
await kentroAPI.atualizarOportunidade(36400, {
  dados_extrato: dadosExtraidos,
  status: "analisando",
  ultima_atualizacao: new Date().toISOString()
});

// Preencher formulário automaticamente
await kentroAPI.preencherFormulario(36400, {
  nome_cliente: dadosExtraidos.cliente.nome,
  cpf_cliente: dadosExtraidos.cliente.cpf,
  banco: dadosExtraidos.dados_bancarios.banco,
  agencia: dadosExtraidos.dados_bancarios.agencia,
  conta: dadosExtraidos.dados_bancarios.conta
});
```

---

## 🔄 **Fluxo Completo de Integração**

### **Diagrama de Sequência**
```
Cliente → WhatsApp → Kentro → API Extrato → Lunas → GPT → Kentro → Cliente
   │         │         │         │         │      │      │        │
   │         │         │         │         │      │      │        │
   │ 1. Envia PDF      │         │         │      │      │        │
   ├─────────►│         │         │         │      │      │        │
   │         │         │         │         │      │      │        │
   │         │ 2. Processa       │         │      │      │        │
   │         ├─────────────────►│         │      │      │        │
   │         │         │         │         │      │      │        │
   │         │         │ 3. Baixa PDF      │      │      │        │
   │         │         ├─────────────────►│      │      │        │
   │         │         │         │         │      │      │        │
   │         │         │ 4. Retorna PDF    │      │      │        │
   │         │         │◄─────────────────┤      │      │        │
   │         │         │         │         │      │      │        │
   │         │         │ 5. Processa GPT   │      │      │        │
   │         │         ├─────────────────►│      │      │        │
   │         │         │         │         │      │      │        │
   │         │         │ 6. Retorna JSON   │      │      │        │
   │         │         │◄─────────────────┤      │      │        │
   │         │         │         │         │      │      │        │
   │         │ 7. Atualiza CRM   │         │      │      │        │
   │         ├─────────────────►│         │      │      │        │
   │         │         │         │         │      │      │        │
   │ 8. Resposta final  │         │         │      │      │        │
   │◄──────────────────┤         │         │      │      │        │
```

---

## 🛠️ **Implementação Prática**

### **Código JavaScript para Kentro**
```javascript
class ExtratoIntegracao {
  constructor(apiUrl, kentroAPI) {
    this.apiUrl = apiUrl;
    this.kentroAPI = kentroAPI;
  }

  async processarExtrato(fileId, idoportunidade) {
    try {
      console.log(`🔄 Processando extrato ${fileId} para oportunidade ${idoportunidade}`);
      
      // 1. Chamar API de extração
      const response = await fetch(`${this.apiUrl}/extrair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, idoportunidade })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const dados = await response.json();
      console.log('✅ Dados extraídos:', dados);

      // 2. Atualizar oportunidade no Kentro
      await this.atualizarOportunidade(idoportunidade, dados);

      // 3. Notificar agente
      await this.notificarAgente(idoportunidade, dados);

      return dados;

    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      await this.registrarErro(idoportunidade, error);
      throw error;
    }
  }

  async atualizarOportunidade(idoportunidade, dados) {
    const campos = {
      dados_extrato: dados,
      status: 'analisando',
      ultima_atualizacao: new Date().toISOString(),
      simulador_link: dados.simulador_link
    };

    await this.kentroAPI.atualizarOportunidade(idoportunidade, campos);
    console.log(`✅ Oportunidade ${idoportunidade} atualizada`);
  }

  async notificarAgente(idoportunidade, dados) {
    const mensagem = `
📄 **Extrato Processado com Sucesso!**

**Oportunidade:** ${idoportunidade}
**Cliente:** ${dados.cliente.nome}
**CPF:** ${dados.cliente.cpf}
**Banco:** ${dados.dados_bancarios.banco}

**Próximos passos:**
1. Revisar dados extraídos
2. Validar informações
3. Prosseguir com proposta

**Link do Simulador:** ${dados.simulador_link}
    `;

    await this.kentroAPI.enviarNotificacao(idoportunidade, mensagem);
  }
}

// Uso
const integracao = new ExtratoIntegracao(
  'https://api-extrato-1.onrender.com',
  kentroAPI
);

// Processar extrato
await integracao.processarExtrato('7025', '36400');
```

---

## 📊 **Benefícios da Integração**

### **Para o Agente**
- ✅ **Automação:** Dados preenchidos automaticamente
- ✅ **Velocidade:** Processamento em segundos
- ✅ **Precisão:** IA extrai dados com alta precisão
- ✅ **Rastreabilidade:** ID da oportunidade mantém contexto

### **Para o Cliente**
- ✅ **Agilidade:** Resposta rápida à solicitação
- ✅ **Conveniência:** Não precisa preencher formulários
- ✅ **Precisão:** Dados extraídos corretamente

### **Para o Sistema**
- ✅ **Integração:** Fluxo completo automatizado
- ✅ **Auditoria:** Logs detalhados de todas as operações
- ✅ **Performance:** Cache inteligente evita reprocessamento
- ✅ **Escalabilidade:** Suporta múltiplas requisições

---

## 🔧 **Configuração no Kentro**

### **Variáveis de Ambiente**
```env
API_EXTRATO_URL=https://api-extrato-1.onrender.com
LUNAS_API_KEY=sua_chave_aqui
LUNAS_QUEUE_ID=25
```

### **Webhook de Notificação**
```javascript
// Endpoint para receber notificações
app.post('/webhook/extrato-processado', (req, res) => {
  const { idoportunidade, dados } = req.body;
  
  // Atualizar interface do agente
  io.emit('extrato-processado', { idoportunidade, dados });
  
  res.json({ success: true });
});
```

---

## 📈 **Métricas de Sucesso**

### **KPIs Principais**
- **Tempo de Processamento:** < 30 segundos
- **Taxa de Sucesso:** > 95%
- **Precisão dos Dados:** > 98%
- **Satisfação do Agente:** > 4.5/5

### **Monitoramento**
- Logs detalhados de cada operação
- Alertas para falhas de processamento
- Dashboard de performance em tempo real
- Relatórios de uso e eficiência

---

**Esta integração transforma o processamento manual de extratos em um fluxo automatizado e eficiente, melhorando significativamente a experiência tanto do agente quanto do cliente.**



