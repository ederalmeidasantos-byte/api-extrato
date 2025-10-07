# ⚠️ IMPORTANTE - Campo CPF na Kentro

## 🎯 **Particularidade da Kentro**

A Kentro tem uma particularidade importante em relação ao campo CPF:

### **❌ NÃO FAZER:**
```javascript
// ERRADO - Não usar CPF para buscar na Kentro
const cliente = await buscarClientePorCPF('123.456.789-00');
```

### **✅ FAZER:**
```javascript
// CORRETO - Usar mainmail (e-mail) para buscar na Kentro
const cliente = await buscarClientePorEmail('joao@email.com');
```

---

## 📋 **Como Funciona**

### **1. Campo CPF no Formulário**
- **Uso:** Apenas para validação e exibição
- **Validação:** Verifica se o CPF está no formato correto
- **Exibição:** Mostra o CPF formatado na interface

### **2. Campo mainmail na Kentro**
- **Uso:** Identificador único para buscar o cliente
- **Fonte:** Sempre vem do campo e-mail do formulário
- **Busca:** Todas as operações de busca usam este campo

---

## 🔧 **Mapeamento Correto**

### **Formulário → Kentro**
```javascript
const dadosFormulario = {
  '98011220': '123.456.789-00',  // CPF (apenas validação)
  '9e7f92b0': 'joao@email.com'   // E-mail (vira mainmail)
};

const dadosMapeados = {
  cliente: {
    cpf: '123.456.789-00',        // ← Apenas para validação
    mainmail: 'joao@email.com'    // ← Usado para buscar na Kentro
  }
};
```

### **Operações na Kentro**
```javascript
// ✅ CORRETO - Buscar por mainmail
const contato = await client.getContacts({
  mainmail: 'joao@email.com'
});

// ✅ CORRETO - Criar contato com mainmail
const novoContato = await client.createContact({
  name: 'João Silva',
  mainmail: 'joao@email.com',
  cpf: '123.456.789-00'
});

// ❌ ERRADO - Buscar por CPF
const contato = await client.getContacts({
  cpf: '123.456.789-00'  // Não funciona!
});
```

---

## 📊 **Exemplos Práticos**

### **1. Buscar Cliente Existente**
```javascript
async function buscarClienteExistente(email) {
  try {
    const contatos = await client.getContacts({
      mainmail: email  // Usar e-mail, não CPF
    });
    
    if (contatos.data && contatos.data.length > 0) {
      return contatos.data[0]; // Cliente encontrado
    }
    
    return null; // Cliente não encontrado
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    return null;
  }
}
```

### **2. Criar Novo Cliente**
```javascript
async function criarNovoCliente(dadosFormulario) {
  const dadosCliente = {
    name: dadosFormulario['6a93f650'], // Nome
    mainmail: dadosFormulario['9e7f92b0'], // E-mail (vira mainmail)
    cpf: dadosFormulario['98011220'], // CPF (apenas para referência)
    phone: dadosFormulario['98167d80'], // Telefone
    // ... outros campos
  };
  
  return await client.createContact(dadosCliente);
}
```

### **3. Atualizar Cliente Existente**
```javascript
async function atualizarCliente(email, novosDados) {
  // Primeiro buscar o cliente pelo e-mail
  const cliente = await buscarClienteExistente(email);
  
  if (cliente) {
    // Atualizar usando o ID do cliente encontrado
    return await client.updateContact({
      id: cliente.id,
      ...novosDados
    });
  }
  
  throw new Error('Cliente não encontrado');
}
```

---

## 🚨 **Cuidados Importantes**

### **1. Validação Dupla**
```javascript
function validarDadosCliente(dados) {
  const erros = [];
  
  // Validar CPF (formato)
  if (!validarCPF(dados.cpf)) {
    erros.push('CPF inválido');
  }
  
  // Validar e-mail (formato e obrigatório)
  if (!dados.email || !validarEmail(dados.email)) {
    erros.push('E-mail inválido ou ausente');
  }
  
  return {
    valido: erros.length === 0,
    erros
  };
}
```

### **2. Consistência de Dados**
```javascript
function garantirConsistenciaDados(dadosFormulario) {
  return {
    // CPF para validação e exibição
    cpf: dadosFormulario['98011220'],
    
    // E-mail como identificador principal
    mainmail: dadosFormulario['9e7f92b0'],
    
    // Garantir que mainmail não está vazio
    email: dadosFormulario['9e7f92b0'] || 'sem-email@exemplo.com'
  };
}
```

### **3. Tratamento de Erros**
```javascript
async function processarCliente(dadosFormulario) {
  try {
    const email = dadosFormulario['9e7f92b0'];
    
    if (!email) {
      throw new Error('E-mail é obrigatório para buscar na Kentro');
    }
    
    // Buscar cliente pelo e-mail
    const cliente = await buscarClienteExistente(email);
    
    if (cliente) {
      console.log('Cliente encontrado:', cliente.id);
      return cliente;
    } else {
      console.log('Cliente não encontrado, criando novo...');
      return await criarNovoCliente(dadosFormulario);
    }
    
  } catch (error) {
    console.error('Erro ao processar cliente:', error.message);
    throw error;
  }
}
```

---

## 📝 **Resumo das Regras**

| Campo | Formulário | Kentro | Uso |
|-------|------------|--------|-----|
| **CPF** | `98011220` | `cpf` | Validação e exibição |
| **E-mail** | `9e7f92b0` | `mainmail` | Identificação e busca |
| **Nome** | `6a93f650` | `name` | Identificação |
| **Telefone** | `98167d80` | `phone` | Contato |

### **✅ Regras de Ouro:**
1. **Sempre use `mainmail` para buscar na Kentro**
2. **CPF é apenas para validação e exibição**
3. **E-mail é obrigatório para todas as operações**
4. **Valide ambos os campos antes de enviar**

---

**Desenvolvido por:** Equipe Lunas Digital  
**Data:** 01/01/2025  
**Versão:** 1.0.0  
**Status:** ✅ Atualizado



