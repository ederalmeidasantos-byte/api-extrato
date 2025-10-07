# 📊 Status do CRM - Mapeamento Completo

## 🎯 Resumo dos Status Mapeados

**Total de Filas:** 2  
**Total de Status:** 21  
**Status Finais:** 4  
**Status Ativos:** 21

---

## 📋 **FILA 2 - PORTABILIDADE**

| ID | Nome | Descrição | Ordem | Final | Cor |
|----|------|-----------|-------|-------|-----|
| 8 | Início | Proposta iniciada na fila de portabilidade | 1 | ❌ | #3498db |
| 9 | Oferta Troco | Aguardando cliente aceitar oferta de troco | 2 | ❌ | #f39c12 |
| 10 | Digitando | Proposta sendo digitada no sistema | 3 | ❌ | #9b59b6 |
| 35 | Redigitar | Proposta precisa ser redigitada | 4 | ❌ | #e74c3c |
| 11 | Aguardando Assinatura | Aguardando cliente assinar a proposta | 5 | ❌ | #2ecc71 |
| 12 | Retenção | Proposta em retenção | 6 | ❌ | #34495e |
| 36 | Aguardando Desbloqueio | Aguardando desbloqueio do benefício | 7 | ❌ | #e67e22 |
| 13 | Aguardando Saldo CIP | Aguardando confirmação de saldo no CIP | 8 | ❌ | #1abc9c |
| 26 | Atuando Saldo | Atualizando saldo no sistema | 9 | ❌ | #16a085 |
| 14 | Aguardando Averbação | Aguardando averbação da operação | 10 | ❌ | #27ae60 |
| 15 | Pago | Proposta paga com sucesso | 11 | ✅ | #2ecc71 |

---

## 💰 **FILA 1 - FGTS**

| ID | Nome | Descrição | Ordem | Final | Cor |
|----|------|-----------|-------|-------|-----|
| 1 | Início | Proposta iniciada na fila de FGTS | 1 | ❌ | #3498db |
| 3 | Não Autorizado | Cliente não autorizado para operação | 2 | ✅ | #e74c3c |
| 43 | Simulando FGTS | Realizando simulação de FGTS | 3 | ❌ | #9b59b6 |
| 4 | Valor Liberado | Valor liberado para o cliente | 4 | ❌ | #2ecc71 |
| 37 | Empregado CLT | Cliente é empregado CLT | 5 | ❌ | #f39c12 |
| 5 | Aguardando Assinatura | Aguardando cliente assinar a proposta | 6 | ❌ | #2ecc71 |
| 6 | Proposta Paga | Proposta paga com sucesso | 7 | ✅ | #27ae60 |
| 7 | Sem Saldo | Cliente não possui saldo suficiente | 8 | ✅ | #e74c3c |
| 42 | Re-consultar | Necessário re-consultar dados do cliente | 9 | ❌ | #f39c12 |
| 44 | Aniversário | Cliente em período de aniversário | 10 | ❌ | #e67e22 |

---

## 🔄 **Fluxos de Transição**

### **Portabilidade (Fila 2)**
```
Início → Oferta Troco → Digitando → Redigitar → Aguardando Assinatura → Retenção → Aguardando Desbloqueio → Aguardando Saldo CIP → Atuando Saldo → Aguardando Averbação → Pago
```

### **FGTS (Fila 1)**
```
Início → Simulando FGTS → Valor Liberado → Empregado CLT → Aguardando Assinatura → Proposta Paga
     ↓
   Não Autorizado (Final)
     ↓
   Sem Saldo (Final)
     ↓
   Re-consultar → Aniversário
```

---

## 🎨 **Cores dos Status**

### **Cores Principais**
- 🔵 **#3498db** - Início (Azul)
- 🟠 **#f39c12** - Oferta Troco, Empregado CLT, Re-consultar (Laranja)
- 🟣 **#9b59b6** - Digitando, Simulando FGTS (Roxo)
- 🔴 **#e74c3c** - Redigitar, Não Autorizado, Sem Saldo (Vermelho)
- 🟢 **#2ecc71** - Aguardando Assinatura, Valor Liberado, Pago (Verde)
- ⚫ **#34495e** - Retenção (Cinza Escuro)
- 🟤 **#e67e22** - Aguardando Desbloqueio, Aniversário (Marrom)
- 🔷 **#1abc9c** - Aguardando Saldo CIP (Turquesa)
- 🔷 **#16a085** - Atuando Saldo (Verde Escuro)
- 🔷 **#27ae60** - Aguardando Averbação, Proposta Paga (Verde)

---

## 📈 **Estatísticas por Fila**

### **Portabilidade**
- **Total de Status:** 11
- **Status Ativos:** 11
- **Status Finais:** 1 (Pago)
- **Status Iniciais:** 1 (Início)

### **FGTS**
- **Total de Status:** 10
- **Status Ativos:** 10
- **Status Finais:** 3 (Não Autorizado, Proposta Paga, Sem Saldo)
- **Status Iniciais:** 1 (Início)

---

## 🔧 **Como Usar**

### **1. Obter Status por ID**
```javascript
const { obterStatusPorId } = require('./crm-status-mapping');
const status = obterStatusPorId(8);
console.log(status.nome); // "Início"
```

### **2. Obter Próximos Status**
```javascript
const { obterProximosStatus } = require('./crm-status-mapping');
const proximos = obterProximosStatus(2, 8); // Fila 2, Status 8
console.log(proximos); // Array com próximos status possíveis
```

### **3. Validar Transição**
```javascript
const { validarTransicaoStatus } = require('./crm-status-mapping');
const validacao = validarTransicaoStatus(2, 8, 9); // Fila 2, De 8, Para 9
if (validacao.valida) {
  console.log('Transição válida!');
} else {
  console.log('Erro:', validacao.erro);
}
```

### **4. Verificar Status Final**
```javascript
const { isStatusFinal } = require('./crm-status-mapping');
console.log(isStatusFinal(15)); // true (Pago)
console.log(isStatusFinal(8));  // false (Início)
```

### **5. Alterar Status com Validação**
```javascript
const integracao = new OperacionalIntegration('development');
await integracao.alterarFaseOportunidadeComValidacao(
  12345,  // ID da oportunidade
  8,      // Status atual
  9,      // Novo status
  2       // Fila (opcional)
);
```

---

## 📊 **Dashboard de Status**

### **Exemplo de Uso em Dashboard**
```javascript
const { obterFluxoCompleto } = require('./crm-status-mapping');

// Obter fluxo completo da Portabilidade
const fluxo = obterFluxoCompleto(2);
fluxo.forEach(status => {
  console.log(`${status.ordem}. ${status.nome} (${status.final ? 'Final' : 'Ativo'})`);
});
```

### **Exemplo de Validação em Formulário**
```javascript
const { validarTransicaoStatus } = require('./crm-status-mapping');

function validarMudancaStatus(filaId, statusAtual, novoStatus) {
  const validacao = validarTransicaoStatus(filaId, statusAtual, novoStatus);
  
  if (!validacao.valida) {
    alert(`Erro: ${validacao.erro}`);
    return false;
  }
  
  return true;
}
```

---

## 🚀 **Integração com API**

### **Alterar Status via API**
```javascript
const integracao = new OperacionalIntegration('development');

// Alteração simples
await integracao.alterarFaseOportunidade(12345, 9);

// Alteração com validação
await integracao.alterarFaseOportunidadeComValidacao(12345, 8, 9, 2);
```

### **Monitoramento de Status**
```javascript
// Verificar se status é final
if (integracao.verificarStatusFinal(15)) {
  console.log('Proposta finalizada!');
}

// Obter próximos status possíveis
const proximos = integracao.obterProximosStatusPossiveis(2, 8);
console.log('Próximos status:', proximos.map(s => s.nome));
```

---

## 📝 **Notas Importantes**

1. **Status Finais:** Não podem ser alterados para outros status
2. **Validação:** Sempre valide transições antes de enviar para API
3. **Ordem:** Status devem seguir a ordem definida no fluxo
4. **Filas:** Cada fila tem seu próprio conjunto de status
5. **Cores:** Use as cores definidas para manter consistência visual

---

**Desenvolvido por:** Equipe Lunas Digital  
**Data:** 01/01/2025  
**Versão:** 1.0.0  
**Status:** ✅ Produção Ready



