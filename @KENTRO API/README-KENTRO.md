# 🔌 Documentação da API Kentro (AtenderBem)

## 🎯 Visão Geral
A API Kentro é utilizada para buscar dados de oportunidades e clientes no sistema AtenderBem. Esta documentação contém informações essenciais para integração correta.

## ⚠️ IMPORTANTE: Formato de Dados

### ❌ NÃO FUNCIONA - JSON
```javascript
// Este formato NÃO funciona com a API Kentro
const response = await fetch('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        queueId: 25,
        apiKey: 'sua-api-key',
        pipelineId: 2
    })
});
// Resultado: "Bad Request" (400)
```

### ✅ FUNCIONA - Form-Data
```javascript
// Este formato funciona corretamente
const formData = new URLSearchParams();
formData.append('queueId', 25);
formData.append('apiKey', 'sua-api-key');
formData.append('pipelineId', 2);

const response = await fetch('https://lunasdigital.atenderbem.com/int/getPipeOpportunities', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: formData
});
// Resultado: Dados das oportunidades
```

## 🔗 Endpoints Disponíveis

### Base URL
```
https://lunasdigital.atenderbem.com/int
```

### 1. Buscar Todas as Oportunidades
```bash
POST /getPipeOpportunities
Content-Type: application/x-www-form-urlencoded

queueId=25&apiKey=sua-api-key&pipelineId=2
```

**Parâmetros:**
- `queueId` (number): ID da fila (padrão: 25)
- `apiKey` (string): Chave de API
- `pipelineId` (number): ID do pipeline (padrão: 2)

**Resposta:**
```json
[
  {
    "id": 36463,
    "title": "NOME DO CLIENTE",
    "mainphone": "5511999999999",
    "mainmail": "cpf@domain.com",
    "formsdata": {
      "98011220": "12345678901",
      "98167d80": "5511999999999",
      "0bfc6250": "01/01/1990"
    }
  }
]
```

### 2. Buscar Oportunidade por ID
```bash
POST /getOpportunity
Content-Type: application/x-www-form-urlencoded

queueId=25&apiKey=sua-api-key&id=36463
```

**Parâmetros:**
- `queueId` (number): ID da fila
- `apiKey` (string): Chave de API
- `id` (number): ID da oportunidade

**Resposta:**
```json
{
  "id": 36463,
  "title": "NOME DO CLIENTE",
  "description": "Dados completos do cliente...",
  "formsdata": {
    "98011220": "12345678901",
    "98167d80": "5511999999999",
    "0bfc6250": "01/01/1990",
    "917456f0": "NOME DA MÃE"
  }
}
```

## 🔑 Configuração

### Chave de API
```javascript
const config = {
    baseUrl: 'https://lunasdigital.atenderbem.com/int',
    apiKey: 'cd4d0509169d4e2ea9177ac66c1c9376',
    defaultQueue: 25,
    defaultPipeline: 2
};
```

### Headers Obrigatórios
```javascript
const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (compatible; LunasDigital/1.0)'
};
```

## 🛠️ Implementação Correta

### Classe de Integração
```javascript
class KentroIntegration {
    constructor() {
        this.baseUrl = 'https://lunasdigital.atenderbem.com/int';
        this.apiKey = 'cd4d0509169d4e2ea9177ac66c1c9376';
        this.defaultQueue = 25;
        this.defaultPipeline = 2;
    }

    async buscarOportunidades() {
        const formData = new URLSearchParams();
        formData.append('queueId', this.defaultQueue);
        formData.append('apiKey', this.apiKey);
        formData.append('pipelineId', this.defaultPipeline);

        const response = await fetch(`${this.baseUrl}/getPipeOpportunities`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        return await response.json();
    }

    async buscarOportunidadePorId(id) {
        const formData = new URLSearchParams();
        formData.append('queueId', this.defaultQueue);
        formData.append('apiKey', this.apiKey);
        formData.append('id', id);

        const response = await fetch(`${this.baseUrl}/getOpportunity`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        return await response.json();
    }
}
```

## 🔍 Mapeamento de Campos

### Campos Principais
| Campo Kentro | Descrição | Exemplo |
|--------------|-----------|---------|
| `98011220` | CPF | "12345678901" |
| `98167d80` | Telefone | "5511999999999" |
| `0bfc6250` | Data de Nascimento | "01/01/1990" |
| `917456f0` | Nome da Mãe | "MARIA SILVA" |
| `25178280` | Cidade | "São Paulo" |
| `f6384400` | UF | "SP" |

### Extração de Dados
```javascript
function extrairDadosCliente(oportunidade) {
    const formsdata = oportunidade.formsdata || {};
    
    return {
        cpf: formsdata['98011220'] || '',
        telefone: formsdata['98167d80'] || '',
        nascimento: formsdata['0bfc6250'] || '',
        nomeMae: formsdata['917456f0'] || '',
        cidade: formsdata['25178280'] || '',
        uf: formsdata['f6384400'] || ''
    };
}
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. "Bad Request" (400)
**Causa:** Uso de JSON em vez de form-data
**Solução:** Usar `URLSearchParams` e `application/x-www-form-urlencoded`

#### 2. "Missing required data"
**Causa:** Payload vazio ou parâmetros faltando
**Solução:** Verificar se todos os parâmetros obrigatórios estão sendo enviados

#### 3. Timeout
**Causa:** API lenta ou indisponível
**Solução:** Implementar timeout e fallback

### Teste de Conectividade
```bash
# Teste básico
curl -X POST https://lunasdigital.atenderbem.com/int/getPipeOpportunities \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'queueId=25&apiKey=cd4d0509169d4e2ea9177ac66c1c9376&pipelineId=2'

# Teste com ID específico
curl -X POST https://lunasdigital.atenderbem.com/int/getOpportunity \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'queueId=25&apiKey=cd4d0509169d4e2ea9177ac66c1c9376&id=36463'
```

## 📊 Monitoramento

### Logs Recomendados
```javascript
console.log('🔍 [KENTRO] Buscando oportunidades...');
console.log('📊 [KENTRO] Resposta recebida:', response.status);
console.log('✅ [KENTRO] Dados processados:', data.length, 'oportunidades');
```

### Métricas Importantes
- Tempo de resposta da API
- Taxa de sucesso das requisições
- Número de oportunidades encontradas
- Erros de timeout

## 🔄 Versionamento

### Versão Atual: 2.1.0
- ✅ Formato form-data implementado
- ✅ Headers corretos
- ✅ Tratamento de erro robusto
- ✅ Timeout configurável

### Mudanças Importantes
- **v2.1.0:** Correção do formato de dados (JSON → form-data)
- **v2.0.0:** Implementação inicial da integração

## 📞 Suporte

Para problemas com a API Kentro:
1. Verificar formato dos dados (form-data)
2. Confirmar parâmetros obrigatórios
3. Testar conectividade com curl
4. Verificar logs de erro

---

**Última atualização:** 08/10/2025
**Versão:** 2.1.0

