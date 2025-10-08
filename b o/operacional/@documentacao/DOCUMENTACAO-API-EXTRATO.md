# 📄 API de Extração de Extrato - Documentação Completa

## 🎯 **Visão Geral**

A API de extração de extrato é responsável por processar PDFs de extratos bancários usando inteligência artificial (GPT-4) e retornar dados estruturados em JSON. A API integra com o sistema Kentro (CRM) para rastreamento de oportunidades.

---

## 🔗 **Endpoints Disponíveis**

### **1. POST `/extrair` - Extração via ID da Lunas**

**Descrição:** Baixa um PDF da API Lunas usando o `fileId` e processa com GPT-4.

**URL:** `https://api-extrato-1.onrender.com/extrair`

**Método:** `POST`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Body (JSON):**
```json
{
  "fileId": "7025",
  "idoportunidade": "36400"
}
```

**Parâmetros Obrigatórios:**
- `fileId` (string): ID do arquivo PDF na API Lunas
- `idoportunidade` (string): ID da oportunidade no CRM Kentro

**Resposta de Sucesso (200):**
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
    "movimentacoes": [...]
  },
  "simulador_link": "https://api-extrato-1.onrender.com/simulador?id=7025"
}
```

**Resposta de Erro (400):**
```json
{
  "error": "fileId é obrigatório"
}
```

**Resposta de Erro (500):**
```json
{
  "error": "Falha ao baixar da Lunas: 404 Not Found"
}
```

---

### **2. POST `/extrairpdf` - Extração via Upload Direto**

**Descrição:** Processa um PDF enviado diretamente via upload.

**URL:** `https://api-extrato-1.onrender.com/extrairpdf`

**Método:** `POST`

**Content-Type:** `multipart/form-data`

**Body (Form Data):**
- `file`: Arquivo PDF (obrigatório)
- `idoportunidade`: ID da oportunidade (obrigatório)

**Resposta:** Mesma estrutura da API `/extrair`

---

### **3. GET `/extrair/:fileId` - Extração de PDF Local**

**Descrição:** Processa um PDF que já está no servidor.

**URL:** `https://api-extrato-1.onrender.com/extrair/7025`

**Método:** `GET`

**Parâmetros:**
- `fileId` (path): ID do arquivo PDF

**Resposta:** Mesma estrutura da API `/extrair`

---

## 🆔 **Para que serve o `idoportunidade`?**

### **🎯 Finalidade Principal**

O `idoportunidade` é o **identificador único da oportunidade no CRM Kentro** e serve para:

1. **Rastreamento de Propostas:**
   - Vincula o extrato processado à oportunidade específica no CRM
   - Permite acompanhar o status da proposta no sistema

2. **Integração com CRM:**
   - Facilita a busca e atualização de dados no Kentro
   - Mantém a consistência entre sistemas

3. **Auditoria e Logs:**
   - Permite rastrear qual oportunidade gerou cada extrato
   - Facilita debugging e monitoramento

4. **Workflow Operacional:**
   - O agente recebe o `idoportunidade` junto com os dados extraídos
   - Pode atualizar diretamente a oportunidade no CRM
   - Mantém o contexto da negociação

### **🔄 Fluxo de Integração**

```
1. Kentro envia: { "fileId": "7025", "idoportunidade": "36400" }
2. API baixa PDF da Lunas usando fileId
3. GPT-4 processa o PDF e extrai dados
4. API retorna: { "fileId": "7025", "idoportunidade": "36400", ...dados }
5. Agente usa idoportunidade para atualizar CRM
```

---

## 🧠 **Processamento com IA**

### **Tecnologia Utilizada**
- **Modelo:** GPT-4 (com fallback para GPT-4o-mini)
- **Biblioteca:** OpenAI API
- **Processo:** Upload do PDF → Análise → Extração estruturada

### **Dados Extraídos**
- Informações pessoais (nome, CPF, email, telefone)
- Dados bancários (banco, agência, conta, PIX)
- Movimentações financeiras
- Saldos e períodos
- Informações de benefícios (INSS, FGTS)

---

## ⚡ **Performance e Cache**

### **Sistema de Cache**
- **TTL:** 24 horas (configurável)
- **Localização:** `var/data/extratos/`
- **Formato:** `extrato_{fileId}.json`

### **Otimizações**
- Cache inteligente evita reprocessamento
- Fila de processamento (concurrency: 1)
- Backup automático dos dados

---

## 🔧 **Configuração**

### **Variáveis de Ambiente**
```env
OPENAI_API_KEY=sk-...
LUNAS_API_URL=https://lunasdigital.atenderbem.com/api/...
LUNAS_QUEUE_ID=25
LUNAS_API_KEY=...
```

### **Diretórios**
- **PDFs:** `var/data/uploads/`
- **JSONs:** `var/data/extratos/`
- **Backups:** `var/data/backups/`

---

## 📊 **Logs e Monitoramento**

### **Logs Implementados**
- ✅ Recebimento de requisições
- ✅ Validação de parâmetros
- ✅ Verificação de cache
- ✅ Download da Lunas
- ✅ Processamento com GPT
- ✅ Resposta final

### **Exemplo de Log**
```
📥 [API] Recebida requisição /extrair
📋 [API] Body: { fileId: '7025', idoportunidade: '36400' }
✅ [API] Parâmetros válidos
🎯 ID Oportunidade Kentro: 36400
♻️ [API] Usando cache válido: var/data/extratos/extrato_7025.json
📤 [API] Enviando resposta do cache
```

---

## 🚀 **Exemplos de Uso**

### **cURL**
```bash
curl -X POST https://api-extrato-1.onrender.com/extrair \
  -H "Content-Type: application/json" \
  -d '{"fileId":"7025","idoportunidade":"36400"}'
```

### **PowerShell**
```powershell
Invoke-RestMethod -Uri 'https://api-extrato-1.onrender.com/extrair' \
  -Method POST \
  -ContentType 'application/json' \
  -Body '{"fileId":"7025","idoportunidade":"36400"}'
```

### **JavaScript**
```javascript
const response = await fetch('https://api-extrato-1.onrender.com/extrair', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileId: '7025',
    idoportunidade: '36400'
  })
});
const data = await response.json();
```

---

## ⚠️ **Códigos de Erro**

| Código | Descrição | Solução |
|--------|-----------|---------|
| 400 | Parâmetros obrigatórios faltando | Verificar `fileId` e `idoportunidade` |
| 404 | PDF não encontrado | Verificar se `fileId` existe na Lunas |
| 500 | Erro interno do servidor | Verificar logs e configurações |
| 503 | Serviço temporariamente indisponível | Tentar novamente em alguns minutos |

---

## 🔄 **Versioning**

- **Versão Atual:** v1.0
- **Compatibilidade:** Mantém compatibilidade com versões anteriores
- **Changelog:** Documentado em commits do Git

---

## 📞 **Suporte**

Para dúvidas ou problemas:
1. Verificar logs do servidor
2. Testar com dados válidos
3. Verificar configurações de ambiente
4. Consultar documentação da API Lunas

---

**Última atualização:** Janeiro 2025
**Mantenedor:** Equipe Lunas Digital



