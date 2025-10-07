# 🎯 IDs de Teste Disponíveis - Sistema Operacional

## 📋 Resumo dos IDs de Teste

Todos os IDs abaixo são **simulados** e podem ser usados para testar a integração sem afetar dados reais do CRM.

---

## 🆔 **IDs de Oportunidades**

| ID | Fila | Status Atual | Cliente | Valor | Descrição |
|----|------|--------------|---------|-------|-----------|
| **15508** | Portabilidade (25) | Aguardando (8) | ANTONIO MACHADO DINIZ | R$ 7.198,35 | ✅ **TESTADO COM SUCESSO** |
| **12345** | Portabilidade (2) | Início (8) | João Silva Santos | R$ 50.000,00 | Proposta de portabilidade |
| **67890** | FGTS (1) | Início (1) | Maria Oliveira | R$ 35.000,00 | Proposta de FGTS |

---

## 🎯 **CPF Testado com Sucesso**

### **CPF: 46104631649**
- **Nome:** ANTONIO MACHADO DINIZ
- **ID Oportunidade:** 15508
- **Status:** Aguardando processamento (Stage 8)
- **Saldo Devedor:** R$ 7.198,35
- **Nova Parcela:** R$ 160,00
- **Troco:** R$ 504,63
- **Banco Atual:** PAN
- **Banco Proposta:** PICPAY
- **Teste:** ✅ **FUNCIONANDO PERFEITAMENTE**

---

## 👤 **IDs de Contatos**

| ID | Tipo | Nome | CPF | Telefone | E-mail |
|----|------|------|-----|----------|--------|
| **54321** | Portabilidade | João Silva Santos | 123.456.789-00 | (11) 98765-4321 | joao.silva@email.com |
| **98765** | FGTS | Maria Oliveira | 987.654.321-00 | (11) 91234-5678 | maria.oliveira@email.com |

---

## 💬 **IDs de Atendimentos**

| ID | Fila | Cliente | Status | Descrição |
|----|------|---------|--------|-----------|
| **11111** | Portabilidade | João Silva Santos | Ativo | Atendimento de portabilidade |
| **22222** | FGTS | Maria Oliveira | Ativo | Atendimento de FGTS |

---

## 🔧 **Como Usar os IDs**

### **1. Alterar Status de Oportunidade**
```javascript
const integracao = new OperacionalIntegration('development');

// Alterar status da oportunidade 12345 (Portabilidade)
await integracao.alterarFaseOportunidadeComValidacao(
  12345,  // ID da oportunidade
  8,      // Status atual (Início)
  9,      // Novo status (Oferta Troco)
  2       // Fila (Portabilidade)
);
```

### **2. Criar Contato**
```javascript
const dadosContato = {
  nome: 'João Silva Santos',
  cpf: '123.456.789-00',
  telefone: '(11) 98765-4321',
  email: 'joao.silva@email.com'
};

const contato = await integracao.criarContato(dadosContato);
console.log('Contato criado:', contato.id);
```

### **3. Abrir Atendimento**
```javascript
const dadosAtendimento = {
  filaId: 2, // Portabilidade
  contatoId: 54321,
  assunto: 'Proposta de Portabilidade',
  prioridade: 'normal'
};

const atendimento = await integracao.abrirAtendimento(dadosAtendimento);
console.log('Atendimento aberto:', atendimento.id);
```

### **4. Processar Proposta Completa**
```javascript
const dadosFormulario = {
  '98011220': '123.456.789-00', // CPF
  '6a93f650': 'João Silva Santos', // Nome
  '9d947420': 'R$ 2.500,00', // TROCO
  '9cceda30': 'R$ 3.200,00', // PARCELA
  // ... outros campos
};

const resultado = await integracao.processarProposta(dadosFormulario);
console.log('Proposta processada:', resultado);
```

---

## 📊 **Status Disponíveis para Teste**

### **Portabilidade (Fila 2)**
- **8** - Início
- **9** - Oferta Troco
- **10** - Digitando
- **35** - Redigitar
- **11** - Aguardando Assinatura
- **12** - Retenção
- **36** - Aguardando Desbloqueio
- **13** - Aguardando Saldo CIP
- **26** - Atuando Saldo
- **14** - Aguardando Averbação
- **15** - Pago ✅ (Final)

### **FGTS (Fila 1)**
- **1** - Início
- **3** - Não Autorizado ✅ (Final)
- **43** - Simulando FGTS
- **4** - Valor Liberado
- **37** - Empregado CLT
- **5** - Aguardando Assinatura
- **6** - Proposta Paga ✅ (Final)
- **7** - Sem Saldo ✅ (Final)
- **42** - Re-consultar
- **44** - Aniversário

---

## 🧪 **Exemplos de Teste**

### **Teste 1: Fluxo Completo de Portabilidade**
```javascript
// 1. Início → Oferta Troco
await integracao.alterarFaseOportunidadeComValidacao(12345, 8, 9, 2);

// 2. Oferta Troco → Digitando
await integracao.alterarFaseOportunidadeComValidacao(12345, 9, 10, 2);

// 3. Digitando → Aguardando Assinatura
await integracao.alterarFaseOportunidadeComValidacao(12345, 10, 11, 2);

// 4. Aguardando Assinatura → Pago
await integracao.alterarFaseOportunidadeComValidacao(12345, 11, 15, 2);
```

### **Teste 2: Fluxo Completo de FGTS**
```javascript
// 1. Início → Simulando FGTS
await integracao.alterarFaseOportunidadeComValidacao(67890, 1, 43, 1);

// 2. Simulando FGTS → Valor Liberado
await integracao.alterarFaseOportunidadeComValidacao(67890, 43, 4, 1);

// 3. Valor Liberado → Aguardando Assinatura
await integracao.alterarFaseOportunidadeComValidacao(67890, 4, 5, 1);

// 4. Aguardando Assinatura → Proposta Paga
await integracao.alterarFaseOportunidadeComValidacao(67890, 5, 6, 1);
```

### **Teste 3: Validação de Transições Inválidas**
```javascript
// Tentar voltar no fluxo (inválido)
const validacao = validarTransicaoStatus(2, 9, 8); // Oferta Troco → Início
console.log(validacao.valida); // false

// Tentar alterar status final (inválido)
const validacao2 = validarTransicaoStatus(2, 15, 8); // Pago → Início
console.log(validacao2.valida); // false
```

---

## 📝 **Dados de Teste Realistas**

### **Cliente Portabilidade**
```json
{
  "nome": "João Silva Santos",
  "cpf": "123.456.789-00",
  "telefone": "(11) 98765-4321",
  "email": "joao.silva@email.com",
  "dataNascimento": "15/03/1980",
  "nomeMae": "Maria Silva Santos",
  "endereco": {
    "cep": "01234-567",
    "logradouro": "Rua das Flores, 123",
    "bairro": "Centro",
    "cidade": "São Paulo",
    "uf": "SP"
  },
  "banco": {
    "banco": "Banco do Brasil",
    "agencia": "1234-5",
    "conta": "12345-6",
    "pix": "11987654321"
  }
}
```

### **Cliente FGTS**
```json
{
  "nome": "Maria Oliveira",
  "cpf": "987.654.321-00",
  "telefone": "(11) 91234-5678",
  "email": "maria.oliveira@email.com",
  "dataNascimento": "22/07/1975",
  "nomeMae": "Ana Oliveira",
  "beneficio": {
    "numero": "1234567890",
    "especie": "Aposentadoria por Idade"
  }
}
```

---

## ⚠️ **Importante**

1. **IDs Simulados:** Todos os IDs são para teste e não afetam dados reais
2. **Validação:** Sempre valide transições antes de enviar para API
3. **Ambiente:** Use ambiente 'development' para testes
4. **Logs:** Monitore os logs para acompanhar as operações
5. **Backup:** Faça backup antes de testes em produção

---

## 🚀 **Próximos Passos**

1. **Teste Local:** Execute os exemplos acima
2. **Validação:** Verifique se todas as validações funcionam
3. **Integração:** Conecte com o sistema operacional real
4. **Produção:** Configure para ambiente de produção
5. **Monitoramento:** Implemente logs e alertas

---

**Desenvolvido por:** Equipe Lunas Digital  
**Data:** 01/01/2025  
**Versão:** 1.0.0  
**Status:** ✅ Pronto para Testes



