# 📋 Documentação do Simulador INSS

## 🎯 Visão Geral
O Simulador INSS é um sistema completo para simulação de empréstimos consignados, integrado com a API Kentro para busca automática de dados de clientes.

## 🔧 Configuração e Instalação

### Pré-requisitos
- Node.js 18+
- NPM ou Yarn
- Acesso à API Kentro (AtenderBem)

### Instalação
```bash
cd INSS
npm install
```

### Configuração
```bash
# Copiar arquivo de exemplo
cp env-example.txt .env

# Editar configurações
nano .env
```

## 🔌 Integração com API Kentro

### ⚠️ IMPORTANTE: Formato de Dados
A API Kentro **NÃO aceita JSON**. Use sempre **form-data**:

```javascript
// ✅ CORRETO - Form-data
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

// ❌ INCORRETO - JSON
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
```

### Endpoints da API Kentro

#### 1. Buscar Todas as Oportunidades
```bash
POST /int/getPipeOpportunities
Content-Type: application/x-www-form-urlencoded

queueId=25&apiKey=sua-api-key&pipelineId=2
```

#### 2. Buscar Oportunidade por ID
```bash
POST /int/getOpportunity
Content-Type: application/x-www-form-urlencoded

queueId=25&apiKey=sua-api-key&id=OPORTUNIDADE_ID
```

## 🛡️ Fallback Robusto

O simulador implementa um sistema de fallback robusto para garantir funcionamento mesmo quando a API Kentro falha:

### Características do Fallback
- ✅ **Timeout de 10 segundos** para evitar travamentos
- ✅ **Tratamento de diferentes tipos de erro** (timeout, conexão, etc.)
- ✅ **Logs informativos** para debug
- ✅ **Continuação normal** mesmo sem dados da Kentro
- ✅ **Cache local** para melhor performance

### Implementação
```javascript
async function sincronizarComKentro(kentroId) {
    try {
        // Buscar dados da Kentro com timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`/api/kentro/oportunidade/${kentroId}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        // Processar dados...
        
    } catch (error) {
        if (error.name === 'AbortError') {
            console.warn('⏰ Timeout na sincronização com Kentro (10s)');
        } else if (error.message.includes('Failed to fetch')) {
            console.warn('🌐 Erro de conexão com Kentro - API pode estar indisponível');
        } else {
            console.error('❌ Erro ao sincronizar com Kentro:', error.message);
        }
        
        // Re-throw para captura pela função chamadora
        throw error;
    }
}
```

## 🚀 Execução

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

### Com PM2
```bash
pm2 start ecosystem-inss.config.cjs
```

## 📊 Monitoramento

### Logs
```bash
# Ver logs em tempo real
pm2 logs simulador-inss

# Ver logs específicos
tail -f logs/simulador.log
```

### Health Check
```bash
curl http://localhost:3002/health
```

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. API Kentro retorna "Bad Request"
**Causa:** Uso de JSON em vez de form-data
**Solução:** Usar `URLSearchParams` e `application/x-www-form-urlencoded`

#### 2. Timeout na API Kentro
**Causa:** API lenta ou indisponível
**Solução:** Fallback automático implementado

#### 3. Erro de sintaxe no simulador
**Causa:** Blocos try/catch mal formados
**Solução:** Verificar fechamento adequado dos blocos

### Debug
```javascript
// Ativar logs detalhados
console.log('🔍 Debug - Kentro ID:', kentroId);
console.log('📊 Dados da Kentro:', kentroData);
```

## 📁 Estrutura de Arquivos

```
INSS/
├── simulador-logic.js      # Lógica principal do simulador
├── simulador.html          # Interface do usuário
├── calculo.js              # Cálculos de empréstimo
├── extrair_pdf.js          # Extração de dados de PDF
├── server-inss.js          # Servidor Node.js
├── ecosystem-inss.config.cjs # Configuração PM2
├── nginx-inss.conf         # Configuração Nginx
└── README-INSS.md          # Esta documentação
```

## 🔄 Atualizações

### Versão Atual: 2.1.0
- ✅ API Kentro corrigida (form-data)
- ✅ Fallback robusto implementado
- ✅ Timeout de 10 segundos
- ✅ Logs melhorados
- ✅ Tratamento de erro aprimorado

### Próximas Versões
- 🔄 Cache local para ViaCEP
- 🔄 Retry com backoff exponencial
- 🔄 Monitoramento de saúde da API
- 🔄 Alertas automáticos

## 📞 Suporte

Para problemas ou dúvidas:
1. Verificar logs do sistema
2. Testar conectividade com APIs
3. Verificar configurações de ambiente
4. Consultar esta documentação

---

**Última atualização:** 08/10/2025
**Versão:** 2.1.0