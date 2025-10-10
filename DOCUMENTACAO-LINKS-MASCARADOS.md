# 🔗 Sistema de Links Mascarados - Documentação

## 📋 **Visão Geral**

O sistema de links mascarados foi implementado para resolver o problema de exposição de dados sensíveis do cliente na URL. Em vez de passar todos os dados do cliente diretamente na URL, o sistema agora:

1. **Gera um ID temporário único** para cada conjunto de dados
2. **Armazena os dados temporariamente** no servidor
3. **Cria um link mascarado** que só contém o ID temporário
4. **Busca os dados via API** quando o link é acessado

## 🚀 **Como Usar**

### **1. Criar um Link Mascarado**

```javascript
// Dados do cliente (que antes eram expostos na URL)
const clienteData = {
    nome: "EDEVALDO MACHADO JULIO",
    cpf: "52908994001",
    nascimento: "",
    telefone: "",
    email: "",
    nb: "5290899401",
    // ... outros dados
};

const contratosData = [{
    id: 1,
    banco: "Mercantil do Brasil",
    parcelas: 96,
    valorParcela: "R$ 123.31",
    taxa: "1.66%",
    troco: "R$ 358.31",
    editando: false
}];

const clientId = "cliente_1760104585807_7bmmjyxo8";
const proposalId = "proposta_1760104585807_nvu6kf69r";

// Função para criar link mascarado
async function criarLinkMascarado() {
    try {
        const response = await fetch('/api/criar-link-temporario', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clienteData,
                contratosData,
                clientId,
                proposalId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log("✅ Link mascarado criado:", result.maskedUrl);
            // Exemplo: /operacional/formulario-cliente.html?linkId=temp_1234567890_abc123def
            return result.maskedUrl;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error("❌ Erro ao criar link mascarado:", error);
        throw error;
    }
}
```

### **2. Acessar o Link Mascarado**

Quando alguém acessa o link mascarado, o formulário automaticamente:

1. **Detecta o parâmetro `linkId`** na URL
2. **Busca os dados** via API `/api/dados-link-temporario/:linkId`
3. **Atualiza a URL** com os dados reais (sem recarregar a página)
4. **Preenche o formulário** normalmente

### **3. Exemplo de URL**

**❌ Antes (dados expostos):**
```
https://inss.lunasdigital.com.br/operacional/formulario-cliente.html?clientId=cliente_1760104585807_7bmmjyxo8&proposalId=proposta_1760104585807_nvu6kf69r&clienteData=%7B%22nome%22%3A%22EDEVALDO%20MACHADO%20JULIO%22%2C%22cpf%22%3A%2252908994001%22...
```

**✅ Depois (link mascarado):**
```
https://inss.lunasdigital.com.br/operacional/formulario-cliente.html?linkId=temp_1760104585807_abc123def
```

## 🔧 **Endpoints da API**

### **POST /api/criar-link-temporario**

Cria um novo link temporário mascarado.

**Request:**
```json
{
    "clienteData": { /* dados do cliente */ },
    "contratosData": [ /* dados dos contratos */ ],
    "clientId": "cliente_123",
    "proposalId": "proposta_123"
}
```

**Response:**
```json
{
    "success": true,
    "linkId": "temp_1760104585807_abc123def",
    "maskedUrl": "/operacional/formulario-cliente.html?linkId=temp_1760104585807_abc123def"
}
```

### **GET /api/dados-link-temporario/:linkId**

Recupera os dados de um link temporário.

**Response:**
```json
{
    "success": true,
    "data": {
        "clienteData": { /* dados do cliente */ },
        "contratosData": [ /* dados dos contratos */ ],
        "clientId": "cliente_123",
        "proposalId": "proposta_123"
    }
}
```

## ⏰ **Expiração**

- **Tempo de vida**: 30 minutos
- **Limpeza automática**: Links expirados são removidos automaticamente
- **Erro 410**: Retornado quando o link expira

## 🔒 **Segurança**

- **IDs únicos**: Cada link tem um ID único e não previsível
- **Expiração automática**: Links não ficam válidos indefinidamente
- **Armazenamento temporário**: Dados são armazenados apenas temporariamente
- **Limpeza automática**: Arquivos expirados são removidos automaticamente

## 📁 **Estrutura de Arquivos**

```
/app/INSS/
├── server-inss.js              # Servidor principal
├── masked-links-system.js      # Sistema de links mascarados
├── formulario-cliente.js       # Formulário modificado
└── var/data/temp-links/        # Armazenamento temporário
    ├── temp_1234567890_abc123def.json
    └── temp_1234567891_def456ghi.json
```

## 🚀 **Implementação Completa**

O sistema foi implementado com:

1. **✅ Endpoints da API** para criar e buscar links temporários
2. **✅ Modificação do formulário** para detectar e processar links mascarados
3. **✅ Sistema de expiração** automática
4. **✅ Limpeza automática** de arquivos expirados
5. **✅ Tratamento de erros** robusto

## 📝 **Exemplo de Uso Completo**

```javascript
// 1. Criar link mascarado
const maskedUrl = await criarLinkMascarado();

// 2. Redirecionar para o link mascarado
window.location.href = maskedUrl;

// 3. O formulário automaticamente:
//    - Detecta o linkId
//    - Busca os dados via API
//    - Atualiza a URL
//    - Preenche o formulário
```

## 🎯 **Benefícios**

- **🔒 Privacidade**: Dados do cliente não aparecem na URL
- **🔗 Links limpos**: URLs muito mais curtas e legíveis
- **⏰ Segurança**: Links expiram automaticamente
- **🔄 Compatibilidade**: Funciona com o sistema existente
- **📱 Responsivo**: Funciona em todos os dispositivos

---

**✅ Sistema implementado e funcionando!** 🚀
