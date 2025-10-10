# 🔌 DOCUMENTAÇÃO APIS INSS - ENDPOINTS FUNCIONAIS

## 🎯 **STATUS: TODAS AS APIS FUNCIONANDO**

**Data**: 03/01/2025  
**Ambiente**: Produção  
**Base URL**: `https://inss.lunasdigital.com.br`

---

## 📋 **LISTA DE ENDPOINTS**

### **1. 🔄 `/extrair` - Extração de Dados do PDF**
- **Método**: `POST`
- **Content-Type**: `application/x-www-form-urlencoded`
- **Descrição**: Baixa PDF da Kentro, processa com ChatGPT e retorna dados estruturados

#### **Request:**
```bash
curl -X POST https://inss.lunasdigital.com.br/extrair \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "fileId=7539&idoportunidade=36337"
```

#### **Parâmetros:**
- `fileId` (string): ID do arquivo na Kentro
- `idoportunidade` (string, opcional): ID da oportunidade

#### **Response:**
```json
{
  "cliente": {
    "nome": "NELSON JOSE CAVASSONI DE OLIVEIRA",
    "cpf": "70133703201",
    "nb": "1975034969",
    "especie": "88",
    "origem": "INSS",
    "dataExtrato": "16/09/2025",
    "banco_pagamento": "756",
    "agencia": "6044",
    "conta": "0011401273",
    "valor_beneficio": "",
    "nomeBeneficio": "BENEFICIO DE PRESTACAO CONTINUADA A PESSOA IDOSA"
  },
  "margens": {
    "disponivel": "7,05",
    "extrapolada": "68,85",
    "rmc": "0,00",
    "rcc": "0,00"
  },
  "contratos": [
    {
      "contrato": "1500656540925",
      "banco": {
        "codigo": "925",
        "nome": "BRB"
      },
      "situacao": "ATIVO",
      "data_inclusao": "24/07/2025",
      "competencia_inicio_desconto": "08/2025",
      "qtde_parcelas": 96,
      "valor_parcela": 413.61,
      "valor_liberado": "19.268,14",
      "iof": "104,79",
      "cet_mensal": "0,00",
      "cet_anual": "0,00",
      "taxa_juros_mensal": "1,75",
      "taxa_juros_anual": "23,14",
      "valor_pago": "0,00",
      "status_taxa": "INFORMADA_EXTRATO",
      "prazo_total": 96,
      "parcelas_pagas": 2,
      "prazo_restante": 94,
      "aprovado": true,
      "id": 1,
      "selecionado": true,
      "simulacao": {
        "aprovado": true,
        "banco": "C6",
        "troco": 260.48,
        "taxa": 1.66,
        "parcela": 413.61,
        "parcelasPagas": 2,
        "valorEmprestimo": 19007.66,
        "coeficiente": 0.021466
      },
      "troco": 260.48,
      "editando": false,
      "__parcela_original__": 413.61,
      "valor_parcela_original": 413.61,
      "saldo_devedor": 19007.66,
      "especie": "88"
    }
  ],
  "extratoId": "7539",
  "bancoAtual": {
    "codigo": "925",
    "nome": "BRB"
  },
  "bancoNovo": "C6",
  "parcelaAtual": 413.61,
  "parcelaNova": 413.61,
  "prazoAtual": 2,
  "prazoNovo": 96,
  "trocoTotal": 260.48,
  "saldoDevedor": 19007.66,
  "numeroContrato": "1500656540925",
  "simuladorLink": "https://inss.lunasdigital.com.br/inss/simulador.html?extrato=7539"
}
```

#### **Fluxo Interno:**
1. ✅ Verifica cache (TTL: 7 dias)
2. ✅ Se não existe, baixa PDF da Kentro API
3. ✅ Processa PDF com ChatGPT
4. ✅ Salva resultado no cache
5. ✅ Retorna dados estruturados + simuladorLink

---

### **2. 🧮 `/api/calcular/:fileId` - Cálculo de Simulação**
- **Método**: `GET`
- **Descrição**: Calcula simulação de troco para um extrato específico

#### **Request:**
```bash
curl https://inss.lunasdigital.com.br/api/calcular/7539
```

#### **Parâmetros:**
- `fileId` (path): ID do extrato

#### **Response:**
```json
{
  "success": true,
  "fileId": "7539",
  "matricula": "1975034969",
  "status": "aprovado",
  "contratos": [
    {
      "banco": {
        "codigo": "925",
        "nome": "BRB"
      },
      "bancoNovo": "C6",
      "contrato": "1500656540925",
      "parcela_original": "413,61",
      "parcela": "413,61",
      "prazo_total": 96,
      "parcelas_pagas": 2,
      "prazo_restante": 94,
      "prazo_simulado": 96,
      "taxa_atual": "1,75",
      "taxa_atual_anual": "23,14",
      "status_taxa": "INFORMADA_EXTRATO",
      "taxa_calculada": "1,66",
      "coeficiente_usado": 0.021466,
      "saldo_devedor": "19.007,66",
      "valor_emprestimo": "19.268,14",
      "troco": "260,48",
      "data_contrato": "24/07/2025",
      "motivo": null
    }
  ],
  "contratos_inativos": [
    {
      "contrato": "587546074389",
      "motivo": "Parcelas abaixo do mínimo (3) - banco: Mercantil do Brasil (código 389)",
      "parcela": "62,77",
      "saldo_devedor": "3.315,76",
      "prazo_total": 96,
      "parcelas_pagas": 0
    },
    {
      "contrato": "587546072389",
      "motivo": "Parcelas abaixo do mínimo (3) - banco: Mercantil do Brasil (código 389)",
      "parcela": "17,80",
      "saldo_devedor": "818,57",
      "prazo_total": 96,
      "parcelas_pagas": 1
    },
    {
      "contrato": "QUA0000694581012",
      "motivo": "Banco não permitido (Banco Inbursa)",
      "parcela": "37,11",
      "saldo_devedor": "1.653,25",
      "prazo_total": 96,
      "parcelas_pagas": 6
    }
  ],
  "resumo": {
    "bancos": "C6",
    "parcelas": "413,61",
    "parcelas_original": "413,61",
    "taxas_calculadas": "1,66",
    "saldos_devedores": "19.007,66",
    "total_troco": "260,48",
    "total_contratos_simulados": 1,
    "total_contratos_processados": 4,
    "bancos_novos": "C6"
  },
  "ajuste_margem": null,
  "simulador_link": "https://inss.lunasdigital.com.br/inss/simulador.html",
  "proposta_resumo_link": null
}
```

#### **Campos Importantes:**
- `status`: "aprovado" ou "não aprovado"
- `contratos`: Contratos elegíveis para simulação
- `contratos_inativos`: Contratos não elegíveis com motivo
- `resumo.total_troco`: Valor total do troco
- `proposta_resumo_link`: Link para detalhes da proposta (null se não existe)

---

### **3. 👤 `/api/salvar-cliente` - Salvar Cliente**
- **Método**: `POST`
- **Content-Type**: `application/json`
- **Descrição**: Salva dados do cliente no banco de dados

#### **Request:**
```bash
curl -X POST https://inss.lunasdigital.com.br/api/salvar-cliente \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "70133703201",
    "nome": "NELSON JOSE CAVASSONI DE OLIVEIRA",
    "nb": "1975034969",
    "especie": "88",
    "origem": "INSS",
    "dataExtrato": "16/09/2025",
    "banco_pagamento": "756",
    "agencia": "6044",
    "conta": "0011401273",
    "valor_beneficio": "",
    "nomeBeneficio": "BENEFICIO DE PRESTACAO CONTINUADA A PESSOA IDOSA"
  }'
```

#### **Response:**
```json
{
  "success": true,
  "message": "Cliente salvo com sucesso",
  "clientId": "23"
}
```

---

### **4. 📄 `/api/salvar-proposta` - Salvar Proposta**
- **Método**: `POST`
- **Content-Type**: `application/json`
- **Descrição**: Salva proposta de refinanciamento

#### **Request:**
```bash
curl -X POST https://inss.lunasdigital.com.br/api/salvar-proposta \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "23",
    "extratoId": "7539",
    "dados": "{...dados da proposta...}",
    "status": "Na fila",
    "origem": "INSS_SIMULADOR"
  }'
```

#### **Response:**
```json
{
  "success": true,
  "message": "Proposta salva com sucesso",
  "propostaId": "11"
}
```

---

### **5. 📋 `/detalhesdaproposta/:id` - Detalhes da Proposta**
- **Método**: `GET`
- **Descrição**: Retorna página HTML com detalhes da proposta

#### **Request:**
```bash
curl https://inss.lunasdigital.com.br/detalhesdaproposta/11
```

#### **Response:**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Detalhes da Proposta #11</title>
    <!-- ... página HTML completa ... -->
</head>
<body>
    <!-- ... conteúdo da proposta ... -->
</body>
</html>
```

---

## 🔧 **CONFIGURAÇÕES TÉCNICAS**

### **Timeouts**
- **Nginx**: 180s (proxy_read_timeout)
- **ChatGPT**: ~27s (processamento)
- **Cache**: 7 dias (TTL)

### **Content-Types Suportados**
- **`/extrair`**: `application/x-www-form-urlencoded`
- **`/api/salvar-*`**: `application/json`

### **Códigos de Status**
- **200**: Sucesso
- **404**: Recurso não encontrado
- **500**: Erro interno do servidor

---

## 🚨 **CÓDIGOS DE ERRO COMUNS**

### **404 - Not Found**
```json
{
  "error": "Extrato não encontrado"
}
```
**Causa**: FileId não existe no cache ou Kentro

### **500 - Internal Server Error**
```json
{
  "error": "Erro ao extrair dados",
  "details": "Erro ao baixar PDF da Kentro: 400 Bad Request",
  "fileId": "7539"
}
```
**Causa**: Problema na API da Kentro ou processamento ChatGPT

---

## 📊 **EXEMPLOS DE USO**

### **Fluxo Completo:**
1. **Extrair dados**: `POST /extrair`
2. **Calcular simulação**: `GET /api/calcular/:fileId`
3. **Salvar cliente**: `POST /api/salvar-cliente`
4. **Salvar proposta**: `POST /api/salvar-proposta`
5. **Ver detalhes**: `GET /detalhesdaproposta/:id`

### **Teste Rápido:**
```bash
# 1. Extrair dados
curl -X POST https://inss.lunasdigital.com.br/extrair \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "fileId=7539&idoportunidade=36337"

# 2. Calcular simulação
curl https://inss.lunasdigital.com.br/api/calcular/7539

# 3. Ver detalhes de proposta existente
curl https://inss.lunasdigital.com.br/detalhesdaproposta/11
```

---

## ⚠️ **IMPORTANTE**

- **Todas as APIs estão funcionando perfeitamente**
- **Não alterar arquivos sem backup**
- **Sempre testar em ambiente de desenvolvimento primeiro**
- **Manter logs para debug**

**Última atualização**: 03/01/2025
