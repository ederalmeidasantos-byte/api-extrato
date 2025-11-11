# 📚 HISTÓRICO DO PROJETO INSS

**Data de Criação**: 31/10/2025  
**Versão**: 1.0

---

## 📋 ÍNDICE

1. [2025 - Janeiro](#janeiro-2025)
2. [2025 - Outubro](#outubro-2025)
3. [2025 - Setembro](#setembro-2025)

---

## 📅 JANEIRO 2025

### [11/01/2025] - Feature: Validações de Idade, Data de Extrato e Correções de Códigos de Banco

#### Problema Identificado
- Simulador não validava idade do cliente contra regras dos bancos
- Extratos antigos (mais de 7 dias) eram aceitos quando deveriam ser rejeitados
- Códigos de banco inválidos (4 dígitos como "3404", "3430") causavam problemas na simulação
- Erro `telefone.replace is not a function` ao carregar alguns extratos
- Status "Formulário Finalizado" não aparecia na lista de propostas
- Sistema criava múltiplas propostas para o mesmo CPF ao invés de atualizar existente

#### Solução Implementada
**Arquivos Modificados:**

1. **`INSS/core/calculo.js`** - Linhas 176-306, 239-245, 530-648
   - Nova função `validarIdadeParaRoteiro()` - Valida idade contra regras do banco
   - Nova função `calcularIdadeDoExtrato()` - Calcula idade a partir da data de nascimento
   - Nova função `corrigirCodigoBanco()` - Corrige códigos de banco inválidos (4 dígitos)
   - Validação de idade adicionada em `aplicarRoteiro()` antes de aprovar contrato
   - Idade do cliente calculada e adicionada aos contratos no `calcularTrocoEndpoint()`
   - Correção automática de códigos de banco inválidos ao processar contratos

2. **`INSS/simulador-logic.js`** - Linhas 1386-1414, 1420-1445, 1569-1695, 1755-1850
   - Nova função `validarDataExtrato()` - Valida se extrato tem no máximo 7 dias
   - Nova função `mostrarAvisoDataExtrato()` - Exibe aviso visual de extrato antigo
   - Nova função `removerAvisoDataExtrato()` - Remove aviso quando válido
   - Validação de data do extrato em `atualizarDadosCliente()`, `simularContrato()` e `simularTodosContratos()`
   - Correção do erro `telefone.replace` - Conversão explícita para string antes de usar `.replace()`
   - Melhorias na função `calcularIdade()` - Validações adicionais e tratamento de erros
   - Busca de data de nascimento em múltiplos locais (extrato, cliente, dados_pessoais)

3. **`INSS/server-8443-https.mjs`** - Linhas 701-779, 1202-1275
   - Lógica para verificar proposta existente por CPF antes de criar nova
   - Atualização automática de status quando proposta existente é encontrada
   - Novo endpoint `PATCH /api/proposta/:cpf/status` - Atualizar status manualmente
   - Mesclagem inteligente de dados ao atualizar proposta existente

4. **`INSS/tests/propostas.html`** - Linhas 404-411, 495-504, 532-545, 555-572
   - Status "Formulário Finalizado" adicionado ao filtro
   - Badge azul (`badge-info`) para status "Formulário Finalizado"
   - Status contabilizado nas estatísticas
   - Logs de debug para verificar status carregados

**Código Implementado:**

```javascript
// Validação de idade do cliente
function validarIdadeParaRoteiro(idadeCliente, roteiro) {
  if (!idadeCliente || idadeCliente <= 0) {
    return { valido: false, motivo: "Idade do cliente não informada" };
  }
  
  // Parsear regra de idade (ex: "21 a 73 anos")
  const match = idadeStr.match(/(\d+)\s*(?:a|à|-)\s*(\d+)/);
  const idadeMin = parseInt(match[1]);
  const idadeMax = parseInt(match[2]);
  
  if (idadeCliente < idadeMin || idadeCliente > idadeMax) {
    return { 
      valido: false, 
      motivo: `Idade do cliente (${idadeCliente} anos) fora da faixa permitida pelo banco (${idadeMin} a ${idadeMax} anos)` 
    };
  }
  
  return { valido: true };
}

// Validação de data do extrato
function validarDataExtrato(dataExtrato) {
  const [dia, mes, ano] = dataExtrato.split('/');
  const dataExtratoObj = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  const diffDays = Math.floor((hoje - dataExtratoObj) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 7) {
    return { 
      valido: false, 
      mensagem: `Extrato muito antigo (${diffDays} dias). O extrato deve ter no máximo 7 dias para simular.`
    };
  }
  
  return { valido: true };
}

// Correção de código de banco inválido
function corrigirCodigoBanco(codigoBanco, numeroContrato) {
  const codigoStr = String(codigoBanco).trim();
  
  // Se tem 4 dígitos, tentar extrair código válido do início do contrato
  if (codigoStr.length === 4 && /^\d{4}$/.test(codigoStr)) {
    const contratoStr = String(numeroContrato);
    const possivelCodigo = contratoStr.substring(0, 3);
    if (/^\d{3}$/.test(possivelCodigo)) {
      return possivelCodigo;
    }
  }
  
  return codigoStr;
}
```

#### Fluxo de Validação Implementado
1. **Banco X analisa idade** → Se fora da faixa, rejeita e passa para o próximo
2. **Analisa parcela** → Se abaixo do mínimo, rejeita
3. **Analisa saldo** → Se abaixo do mínimo, rejeita
4. **Analisa espécie** → Se não permitida, rejeita
5. **Analisa regras específicas** → Se não atender, rejeita
6. **Se passar em todas as validações** → Aprova

#### Comandos Utilizados
```bash
# Enviar arquivos atualizados
scp "INSS/core/calculo.js" root@72.60.159.149:/root/api-lunas/API\ Lunas/INSS/core/calculo.js
scp "INSS/simulador-logic.js" root@72.60.159.149:/root/INSS/simulador-logic.js
scp "INSS/server-8443-https.mjs" root@72.60.159.149:/root/INSS/server-8443-https.mjs
scp "INSS/tests/propostas.html" root@72.60.159.149:/root/INSS/tests/propostas.html

# Reiniciar PM2
ssh root@72.60.159.149 "pm2 restart inss-port-8443"
ssh root@72.60.159.149 "pm2 restart inss-api-3004"
```

#### Resultados Obtidos
- ✅ **Validação de idade** → Contratos rejeitados se idade fora da faixa do banco
- ✅ **Validação de data** → Extratos antigos (>7 dias) bloqueados com aviso visual
- ✅ **Correção de códigos** → Códigos inválidos (4 dígitos) corrigidos automaticamente
- ✅ **Erro telefone corrigido** → Conversão explícita para string antes de `.replace()`
- ✅ **Status "Formulário Finalizado"** → Aparece na lista com badge azul
- ✅ **Atualização automática** → Propostas existentes são atualizadas ao invés de duplicadas
- ✅ **Endpoint manual** → `PATCH /api/proposta/:cpf/status` para atualizar status

#### Notas Importantes
- **Validação de Idade**: Rejeita contrato se idade do cliente estiver fora da faixa permitida pelo banco
- **Validação de Data**: Bloqueia simulação se extrato tiver mais de 7 dias
- **Correção Automática**: Códigos de banco inválidos são corrigidos usando primeiros 3 dígitos do contrato
- **Atualização Inteligente**: Sistema verifica proposta existente por CPF antes de criar nova
- **Mesclagem de Dados**: Ao atualizar proposta, mantém dados antigos e mescla com novos
- **Status Visível**: "Formulário Finalizado" aparece na lista com filtro e estatísticas

---

### [11/01/2025] - Feature: Sistema de Roteiro Dinâmico com Bancos Ativos/Inativos

#### Problema Identificado
- Simulador INSS usava roteiro hardcoded no frontend, não respeitando alterações do editor
- Bancos inativos (PICPAY, C6) ainda simulavam contratos
- Regras de espécies não eram aplicadas corretamente
- Frontend não sincronizava com configurações do servidor

#### Solução Implementada
**Arquivos Modificados:**

1. **`INSS/simulador-logic.js`** - Linhas 2270-2320, 2688-2730, 410-420
   - Carregamento dinâmico do roteiro via API
   - Carregamento de configuração de bancos (ativos/inativos)
   - Filtro de bancos inativos antes da simulação
   - Filtro de espécies respeitando regras do roteiro

2. **`INSS/server-8443-https.mjs`** - Linhas 150-200
   - Novo endpoint `GET /api/roteiro-bancos` - Retorna roteiro completo
   - Novo endpoint `POST /api/roteiro-bancos` - Salva roteiro atualizado
   - Novo endpoint `GET /api/config-bancos` - Retorna config de bancos
   - Novo endpoint `POST /api/config-bancos` - Salva config de bancos

3. **`INSS/config/config-bancos.js`** - Novo arquivo
   - Configuração de ordem de prioridade dos bancos
   - Status ativo/inativo de cada banco

**Código Implementado:**

```javascript
// ANTES - Roteiro hardcoded no frontend
let RoteiroBancos = {
  BRB: { especiesAceitas: {...}, saldoMinimo: 4000 },
  C6: { especiesAceitas: {...}, saldoMinimo: 3000 }
};

// DEPOIS - Carregamento dinâmico
async function carregarRoteiroDinamico() {
  const response = await fetch(`${configSimulador.apiUrl}/api/roteiro-bancos`);
  RoteiroBancos = await response.json();
}

async function carregarConfigBancos() {
  const response = await fetch(`${configSimulador.apiUrl}/api/config-bancos`);
  ConfigBancos = await response.json();
}

// Filtrar bancos ativos antes de simular
function bancosPermitidosPorEspecie(especie) {
  const bancosAtivos = ORDEM_BANCOS_DINAMICA.filter(banco => {
    return ConfigBancos?.statusBancos?.[banco] !== false;
  });
  
  const bancosComEspecie = bancosAtivos.filter(banco => {
    const roteiro = RoteiroBancos?.[banco];
    return validarEspecieParaRoteiro(especie, roteiro);
  });
  
  return bancosComEspecie;
}
```

#### Comandos Utilizados
```bash
# Backup antes das alterações
ssh root@72.60.159.149 "cd /root/INSS && tar -czf backup-inss-$(date +%Y%m%d-%H%M%S).tar.gz *.js *.html"

# Enviar arquivos atualizados
scp "INSS/simulador-logic.js" root@72.60.159.149:/root/INSS/
scp "INSS/editor-roteiro.html" root@72.60.159.149:/root/INSS/
scp "INSS/server-8443-https.mjs" root@72.60.159.149:/root/INSS/

# Criar diretório e enviar configuração
ssh root@72.60.159.149 "mkdir -p /root/INSS/config"
scp "INSS/config/config-bancos.js" root@72.60.159.149:/root/INSS/config/

# Reiniciar PM2
ssh root@72.60.159.149 "cd /root/INSS && pm2 delete inss-port-8443"
ssh root@72.60.159.149 "cd /root/INSS && pm2 start server-8443-https.mjs --name inss-port-8443"
```

#### Funcionalidades do Editor de Roteiro
1. ✅ **Maximizar banco** - Expandir para editar regras detalhadas
2. ✅ **Múltiplas espécies** - Adicionar espécies separadas por vírgula
3. ✅ **Drag & Drop** - Reordenar prioridades (direita para esquerda)
4. ✅ **Bancos ativos** - Lista de bancos que podem simular (reordenáveis)
5. ✅ **Bancos inativos** - Lista de bancos que não simulam
6. ✅ **Double-click** - Mover bancos entre listas ativas/inativas
7. ✅ **Salvamento API** - Mudanças salvas automaticamente no servidor

#### Regras de Espécies Implementadas
```javascript
// Exemplo de regra no roteiro
"BRB": {
  "especiesAceitas": {
    "todas": true,
    "exceto": ["87", "88"]  // BRB não aceita espécies 87 e 88
  }
}

// Validação no frontend
function validarEspecieParaRoteiro(especie, roteiro) {
  if (roteiro.especiesAceitas.todas) {
    return !roteiro.especiesAceitas.exceto?.includes(especie.toString());
  }
  return roteiro.especiesAceitas.incluidas?.includes(especie.toString()) || false;
}
```

#### Resultados Obtidos
- ✅ **PICPAY desativado** → Não simula mais
- ✅ **C6 desativado** → Não simula mais
- ✅ **Espécie 87 bloqueada** → Nenhum banco ativo aceita
- ✅ **4 contratos rejeitados** corretamente
- ✅ **Logs claros** mostram motivo de cada rejeição
- ✅ **Editor funcional** com drag & drop e listas de ativos/inativos
- ✅ **Integração completa** - Editor → API → Simulador sincronizado

#### Notas Importantes
- **Carregamento Dinâmico**: Frontend não usa mais roteiro hardcoded
- **Filtro de Inativos**: Bancos inativos são ignorados na simulação
- **Filtro de Espécies**: Apenas bancos que aceitam a espécie são testados
- **Cache-Busting**: Sistema de versionamento para forçar reload do JS
- **Fallback Seguro**: Se API falhar, usa roteiro hardcoded como backup
- **Ordem de Prioridade**: Bancos são testados na ordem definida no editor

---

### [11/01/2025] - Correção: Botão "Enviar Proposta" Não Salvava Link na Kentro

#### Problema Identificado
- Botão "Enviar Proposta" no simulador não salvava o link da proposta no campo `ebe603f0` da Kentro
- Endpoints `/api/kentro/salvar-link-proposta` e `/api/kentro/atualizar-fase` não existiam no servidor
- Arquivo `server-8443-https.mjs` do VPS estava desatualizado
- Arquivo `simulador-logic.js` do VPS estava desatualizado

#### Solução Implementada
**Arquivo 1**: `INSS/server-8443-https.mjs`
- **Linhas**: ~600-700 (novos endpoints)

**Endpoints Adicionados**:

1. **POST `/api/kentro/salvar-link-proposta`**:
```javascript
// Gera link completo da proposta
const linkCompleto = `https://inss.lunasdigital.com.br:8443/detalhesdaproposta/${propostaId}`;

// Busca oportunidade na Kentro
const opportunity = await kentroApi.buscarOportunidadePorId(kentroId);

// Atualiza campo ebe603f0 com o link
opportunity.formsdata.ebe603f0 = linkCompleto;

// Verifica se o link foi salvo corretamente
const linkVerificado = updatedOpportunity.formsdata.ebe603f0;
```

2. **POST `/api/kentro/atualizar-fase`**:
```javascript
// Atualiza fase da oportunidade na Kentro
const kentroResult = await kentroApi.atualizarFaseOportunidade(
    kentroId, 
    destStageId
);
```

**Arquivo 2**: `INSS/simulador-logic.js`
- **Linhas**: ~3470-3555 (chamada aos novos endpoints)

**Lógica Implementada**:
```javascript
// 1. Gerar link da proposta
const linkCompleto = `${apiUrl}/detalhesdaproposta/${propostaIdSequencial}`;

// 2. Salvar link no campo ebe603f0 via API
const saveLinkResponse = await fetch(`${apiUrl}/api/kentro/salvar-link-proposta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        propostaId: propostaIdSequencial,
        kentroId: kentroIdParaAtualizar.toString()
    })
});

// 3. Atualizar fase para etapa 9
const response = await fetch(`${apiUrl}/api/kentro/atualizar-fase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        kentroId: window.idoportunidade, 
        destStageId: 9 
    })
});
```

**Comandos Utilizados**:
```bash
# Backup dos arquivos antes das alterações
scp root@72.60.159.149:/root/INSS/server-8443-https.mjs "./backup/server-8443-https-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')-brasilia.mjs"

# Enviar arquivos atualizados para o VPS
scp "./INSS/server-8443-https.mjs" "root@72.60.159.149:/root/INSS/server-8443-https.mjs"
scp "./INSS/simulador-logic.js" "root@72.60.159.149:/root/INSS/simulador-logic.js"

# Reiniciar PM2
ssh root@72.60.159.149 "pm2 restart inss-port-8443"

# Verificar status
Invoke-WebRequest -Uri "https://inss.lunasdigital.com.br:8443/health" -UseBasicParsing -TimeoutSec 5
```

**Explicação**: 
- O endpoint `/api/kentro/salvar-link-proposta` foi criado no servidor para:
  1. Gerar o link completo da proposta
  2. Buscar a oportunidade na Kentro
  3. Atualizar o campo `ebe603f0` com o link
  4. Verificar se o link foi salvo corretamente
  
- O endpoint `/api/kentro/atualizar-fase` foi criado para:
  1. Atualizar a fase da oportunidade na Kentro para a etapa 9

- O `simulador-logic.js` foi atualizado para chamar esses endpoints na ordem correta:
  1. Gerar proposta e link
  2. Salvar link no campo `ebe603f0` (API)
  3. Atualizar fase para etapa 9
  4. Sincronizar dados

**Integração com Kentro CRM**:

**O que é Kentro**:
- Kentro é o CRM (Customer Relationship Management) usado pela Lunas Digital
- Gerencia oportunidades de negócio (leads) dos clientes
- Cada oportunidade possui um `kentroId` único
- URL da API: `https://crm.rdstation.com/api/v1/`

**Campo `ebe603f0`**:
- Campo customizado no formulário da oportunidade do Kentro
- Armazena o link da proposta gerada no simulador INSS
- Permite que o usuário do CRM acesse diretamente os detalhes da proposta
- Formato do link: `https://inss.lunasdigital.com.br:8443/detalhesdaproposta/{propostaId}`

**Módulo Kentro API** (`operacional/kentro-api.js`):
- **Função**: `buscarOportunidadePorId(kentroId)`
  - Busca dados completos da oportunidade
  - Retorna objeto com `formsdata` contendo campos customizados
  - Usado para ler/atualizar o campo `ebe603f0`

- **Função**: `atualizarFaseOportunidade(kentroId, destStageId)`
  - Move oportunidade entre fases do funil de vendas
  - `destStageId: 9` = Fase "Proposta Enviada"
  - Retorna erro 400 se oportunidade já está na fase de destino

**Fluxo de Integração Kentro no Simulador**:
```
1. Cliente acessa simulador com ?idoportunidade=3228
2. Sistema carrega dados do cliente usando kentroId
3. Usuário simula propostas e clica "Enviar Proposta"
4. Sistema gera propostaId e link completo
5. Sistema chama /api/kentro/salvar-link-proposta:
   - Busca oportunidade na Kentro
   - Atualiza formsdata.ebe603f0 com o link
   - Verifica se link foi salvo corretamente
6. Sistema chama /api/kentro/atualizar-fase:
   - Move oportunidade para fase 9 (Proposta Enviada)
   - Se já estiver na fase 9, retorna erro 400 (normal)
7. Usuário do CRM pode clicar no link do campo ebe603f0
8. Link abre página de detalhes da proposta
```

**Autenticação Kentro**:
- Token de API armazenado em variável de ambiente
- Headers necessários: `Content-Type: application/json`
- Autenticação via Bearer Token

**Resultado**: 
- ✅ Link da proposta é salvo com sucesso no campo `ebe603f0` da Kentro (Status 200)
- ✅ Link é verificado e confirmado após salvamento
- ⚠️ Erro 400 na atualização de fase (normal quando oportunidade já está na fase 9)
- ⚠️ Erro na sincronização (rota não encontrada - não crítico)

**URL Testada**: `https://inss.lunasdigital.com.br:8443/simulador.html?fileId=7972&idoportunidade=3228`

**Status Final**: ✅ **PROBLEMA RESOLVIDO** - Link sendo salvo corretamente na Kentro!

**Logs do Console que Confirmam o Sucesso**:
```
✅ [KENTRO] Campo ebe603f0 atualizado com SUCESSO via API!
✅ [KENTRO] Link salvo: https://inss.lunasdigital.com.br:8443/detalhesdaproposta/proposta_1762871758034_tpmsqc1u7
✅ [KENTRO] Link verificado: https://inss.lunasdigital.com.br:8443/detalhesdaproposta/proposta_1762871758034_tpmsqc1u7
✅✅✅ [KENTRO] VERIFICAÇÃO: Link confirmado salvo na Kentro!
```

---

## 📅 OUTUBRO 2025

### [31/10/2025] - Reorganização Completa da Pasta INSS

#### Problema Identificado
- Pasta INSS desorganizada com arquivos misturados
- Falta de estrutura clara por sistema
- Documentação espalhada

#### Solução Implementada
**Estrutura Criada**:
```
INSS/
├── sistemas/
│   ├── api-3004/              # Sistema de API (porta 3004)
│   ├── simulador-8443/        # Sistema de Simulador HTTPS (porta 8443)
│   ├── extrair/               # Sistema de Extração de PDF
│   └── calculo/               # Sistema de Cálculo de Simulações
├── frontend/
├── config/
├── docs/
│   ├── fluxos/
│   ├── historico/
│   └── links.md
├── testes/
└── backup/
```

**Arquivos Documentados**:
- ✅ Fluxo visual completo criado (`docs/fluxos/fluxo-sistema-inss-completo.md`)
- ✅ Histórico do projeto criado (`docs/historico/historico-projeto-inss.md`)
- ✅ Documento de links criado (`docs/links.md`)

**Comandos Utilizados**:
```powershell
# Criar estrutura de pastas
New-Item -ItemType Directory -Path "sistemas/api-3004"
New-Item -ItemType Directory -Path "sistemas/simulador-8443"
New-Item -ItemType Directory -Path "sistemas/extrair"
New-Item -ItemType Directory -Path "sistemas/calculo"
New-Item -ItemType Directory -Path "frontend"
New-Item -ItemType Directory -Path "docs/fluxos" -Force
New-Item -ItemType Directory -Path "docs/historico" -Force
New-Item -ItemType Directory -Path "testes"
```

---

### [31/10/2025] - Reorganização da Estrutura JSON do Cliente

#### Problema Identificado
- JSON do cliente com campos desordenados
- Dados principais misturados com históricos

#### Solução Implementada
**Estrutura Reorganizada**:
```json
{
  // TOP - Dados do Cliente
  "dados_pessoais": {...},
  "beneficio": {...},
  "margens": {...},
  "dados_bancarios": {...},
  
  // ABAIXO - Históricos
  "dados_contratos": [...],
  "simulacoes_aprovadas": [...],
  "metadata": {...}
}
```

**Arquivo Modificado**: `API Lunas/server-real-3004.mjs`
- **Linha**: ~435-461 (criação/atualização)
- **Linha**: ~710-728 (retorno GET /cliente/:cpf)

**Comandos Utilizados**:
```bash
scp "API Lunas/server-real-3004.mjs" root@72.60.159.149:/root/
ssh root@72.60.159.149 "pm2 restart inss-api-3004"
```

**Explicação**: Dados principais do cliente (benefício, margem, cota) agora aparecem no topo do JSON, facilitando leitura e acesso. Históricos (contratos, simulações) ficam abaixo.

---

### [31/10/2025] - Correção: Simulações Substituem Anteriores

#### Problema Identificado
- `simulacoes_aprovadas` acumulava simulações anteriores
- Necessário manter apenas a última simulação

#### Solução Implementada
**Arquivo Modificado**: `API Lunas/server-real-3004.mjs`
- **Linha**: ~562
- **Mudança**: `clienteData.simulacoes_aprovadas = [simulacao];` (substitui array anterior)

**Explicação**: Agora sempre substitui simulações anteriores pela nova, mantendo apenas 1 simulação com todos os contratos aprovados dentro.

---

### [31/10/2025] - Correção: Validação de Roteiro Bancário no Cálculo

#### Problema Identificado
- PICPAY estava aprovando contratos com parcela < R$50,00 (mínimo)
- Roteiro bancário não era validado corretamente

#### Solução Implementada
**Arquivo Modificado**: `API Lunas/INSS/core/calculo.js`
- **Linha**: ~200 (função `aplicarRoteiro`)
- **Mudança**: Validação de `parcelaMinima` no início da função
- **Mudança**: `calcularParaContrato` passa `parcelaOriginal` para validação

**Explicação**: Agora valida `parcelaMinima` antes de processar o contrato, garantindo que apenas contratos que atendem às regras sejam aprovados.

---

### [31/10/2025] - Correção: CPF Salvo no Extrato para Cálculo

#### Problema Identificado
- `simulacoes_aprovadas` ficava vazio após `/calcular`
- CPF não estava disponível no extrato para salvar simulação

#### Solução Implementada
**Arquivo Modificado**: `API Lunas/server-real-3004.mjs`
- **Linha**: ~350 (endpoint `/extrair`)
- **Mudança**: Salva explicitamente `cpfKentro` no extrato JSON (`extrato_${fileId}.json`)
- **Mudança**: `/calcular` lê CPF diretamente do extrato

**Explicação**: Agora o CPF é salvo no extrato durante a extração, garantindo que esteja disponível para salvar simulações posteriormente.

---

### [31/10/2025] - Correção: Endpoint /cliente/:cpf Retornando HTML

#### Problema Identificado
- `GET /cliente/:cpf` na porta 8443 retornava HTML "Cannot GET"
- Middleware `express.static` interceptava antes da rota API

#### Solução Implementada
**Arquivo Modificado**: `API Lunas/INSS/server-8443-https.mjs`
- **Mudanças**:
  1. Rotas API movidas **antes** de `express.static`
  2. `app.get('/cliente/:cpf')` como primeira rota
  3. `express.static` com `index: false` e `fallthrough: true`
  4. Rotas HTML explícitas antes de `express.static`
  5. **CRÍTICO**: Arquivo copiado para `/root/server-8443-https.mjs` (PM2 estava usando caminho errado)

**Comandos Utilizados**:
```bash
scp "API Lunas/INSS/server-8443-https.mjs" root@72.60.159.149:/root/INSS/
ssh root@72.60.159.149 "cp /root/INSS/server-8443-https.mjs /root/server-8443-https.mjs"
ssh root@72.60.159.149 "pm2 restart inss-port-8443"
```

**Explicação**: Ordem dos middlewares é crítica no Express. API routes devem vir antes de static files para evitar conflitos.

---

## 📅 SETEMBRO 2025

### [03/09/2025] - Implementação de Sistema de Cliente JSON por CPF

#### Problema Identificado
- Sistema anterior usava ID sequencial para clientes
- Necessário migrar para CPF como identificador único

#### Solução Implementada
**Estrutura Criada**:
- `/root/api-lunas/var/data/clientes/${cpf}.json` (1 JSON por CPF)
- Endpoints: `GET /cliente/:cpf`, `PATCH /cliente/:cpf`
- Normalização de dados do Kentro (formsdata → JSON padronizado)

**Arquivos Modificados**:
- `API Lunas/server-real-3004.mjs` (endpoints de cliente)
- Integração com `/extrair` para sincronização automática

**Explicação**: Migração de sistema de ID para CPF, garantindo unicidade e facilitando busca.

---

## 📊 ESTATÍSTICAS

### Mudanças por Categoria:
- **Organização**: 2 mudanças
- **Correções de Bugs**: 4 mudanças
- **Estrutura de Dados**: 2 mudanças
- **Integração**: 1 mudança

### Total de Entradas: 9

---

## 🔗 LINKS RELACIONADOS

- [Fluxo Completo do Sistema](./fluxos/fluxo-sistema-inss-completo.md)
- [Links Importantes](../links.md)
- [Documentação Técnica](../DOCUMENTACAO-TECNICA.md)

---

**Última Atualização**: 31/10/2025  
**Próxima Revisão**: Quando necessário

