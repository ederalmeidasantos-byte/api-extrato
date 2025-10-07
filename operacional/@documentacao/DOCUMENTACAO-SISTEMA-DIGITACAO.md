# Documentação do Sistema de Digitação - Lunas Digital

## Visão Geral
Sistema completo de gestão de propostas e digitação para o sistema operacional Lunas Digital, incluindo fila de digitação, interface de digitação detalhada e integração com dados reais.

## Arquivos Principais

### 1. `operacional/digitation-interface.html`
**Descrição**: Interface principal da fila de digitação
**Funcionalidades**:
- Lista clientes agrupados por proposta
- Filtros por status, nome/CPF e data
- Botão "Digitar" ao lado do status para acesso direto
- Visualização expandível de propostas por cliente
- Integração com dados do servidor via `/api/propostas`

**Principais Componentes**:
- `.queue-filters`: Filtros de busca
- `.client-card`: Card do cliente com propostas
- `.client-header`: Cabeçalho com informações do cliente
- `.proposals-container`: Container das propostas (expansível)

**Funções JavaScript**:
- `carregarFila()`: Carrega dados do servidor e localStorage
- `filtrarFila()`: Aplica filtros de busca
- `renderizarFila()`: Renderiza a lista de clientes
- `abrirTelaDigitação(clientId)`: Abre tela de digitação
- `detalharProposta(clientId, propostaId)`: Abre proposta específica

### 2. `operacional/digitar-proposta.html`
**Descrição**: Interface detalhada de digitação de propostas
**Funcionalidades**:
- Visualização completa dos dados do cliente
- Separação clara entre "CONTRATO ATUAL" e "NOVO CONTRATO"
- Botões de copiar para todos os campos
- Gestão individual de status por proposta
- Dados reais das propostas (sem N/A)

**Estrutura das Propostas**:

#### CONTRATO ATUAL (Azul)
- Banco: Daycoval
- Parcela: R$ 74,26
- Prazo: 96 parcelas
- Parcelas Pagas: 36
- Taxa: 1,64% a.m.
- Saldo Devedor: R$ 756,64
- Prazo Restante: 60 parcelas

#### NOVO CONTRATO (Verde)
- Banco: C6
- Nova Parcela: R$ 74,26
- Prazo: 96 parcelas
- Nova Taxa: 1,85% a.m.
- Troco: R$ 410,51

**Principais Componentes**:
- `.contract-section`: Seção de contrato (atual/novo)
- `.contract-header`: Cabeçalho com ícone e título
- `.contract-data`: Grid dos dados do contrato
- `.contract-field`: Campo individual com label e valor
- `.copy-button`: Botão pequeno (20x20px) para copiar

**Funções JavaScript**:
- `preencherTodasPropostas()`: Renderiza todas as propostas
- `atualizarStatusProposta()`: Atualiza status individual
- `excluirProposta()`: Remove proposta da lista
- `copiarTexto()`: Copia texto para clipboard
- `formatarMoeda()`: Formata valores monetários

### 3. `server.js` - Endpoints Relacionados

#### `/api/propostas` (GET)
**Descrição**: Retorna todas as propostas do sistema
**Resposta**: Array de propostas ordenadas por data de criação
**Estrutura**:
```json
{
  "id": "proposta_id",
  "clientId": "1",
  "cliente": { "nome": "...", "cpf": "..." },
  "contratos": [{ "banco": "...", "simulacao": {...} }],
  "dataCriacao": "2025-10-03T..."
}
```

#### `/api/cliente/:clientId` (GET)
**Descrição**: Retorna dados completos do cliente
**Resposta**: Dados do cliente com contratos, propostas e timeline

#### `/api/status-config` (GET/POST)
**Descrição**: Gerencia configurações de status
**GET**: Retorna configurações atuais
**POST**: Salva novas configurações

## Fluxo de Trabalho

### 1. Acesso à Fila
1. Usuário acessa `/operacional/digitation-interface.html`
2. Sistema carrega propostas do servidor via `/api/propostas`
3. Dados são agrupados por cliente
4. Interface renderiza cards de clientes com status

### 2. Digitação de Proposta
1. Usuário clica no botão "Digitar" ao lado do status
2. Sistema redireciona para `/operacional/digitar-proposta.html?clientId=X`
3. Página carrega dados do cliente via `/api/cliente/:clientId`
4. Interface exibe dados separados em abas:
   - Dados do Cliente
   - Todas as Propostas
   - Contratos
   - Status & Timeline

### 3. Gestão de Propostas
1. Na aba "Todas as Propostas", usuário vê:
   - Contrato atual vs novo contrato
   - Dados reais (sem N/A)
   - Botões de copiar para todos os campos
   - Status individual por proposta
2. Usuário pode:
   - Alterar status individual
   - Copiar dados para clipboard
   - Excluir propostas
   - Visualizar detalhes

## Melhorias Implementadas

### Interface
- ✅ Botão "Digitar" ao lado do status na fila
- ✅ Separação clara entre contrato atual e novo
- ✅ Botões de copiar pequenos e discretos (20x20px)
- ✅ Status com badge colorido + select separado
- ✅ Dados reais sem campos "N/A"

### Dados
- ✅ Saldo devedor calculado: `valor_liberado - valor_pago`
- ✅ Prazo restante: `prazo_restante` dos dados reais
- ✅ Layout com dados à direita (valores à esquerda, labels à direita)
- ✅ Formatação monetária brasileira
- ✅ Dados das propostas reais do servidor

### Funcionalidades
- ✅ Status individual por proposta
- ✅ Atualização visual do status em tempo real
- ✅ Integração com dados do servidor
- ✅ Persistência de dados em localStorage
- ✅ Navegação fluida entre interfaces

## Estrutura de Dados

### Proposta
```json
{
  "id": "proposta_id",
  "clientId": "1",
  "contratos": [{
    "banco": "Daycoval",
    "valor_parcela": 74.26,
    "prazo_total": 96,
    "parcelas_pagas": 36,
    "taxa_juros_mensal": 1.64,
    "valor_liberado": 3485.39,
    "valor_pago": 2728.75,
    "prazo_restante": 60,
    "simulacao": {
      "banco": "C6",
      "parcela": 74.26,
      "taxa": 1.85,
      "troco": 410.51
    }
  }]
}
```

### Cliente
```json
{
  "id": "1",
  "nome": "ANTONIO MACHADO DINIZ",
  "cpf": "18640900906",
  "endereco": { "cep": "38400-000", ... },
  "beneficio": { "nb": "5513909797", ... },
  "banco": { "nome": "Itaú", "agencia": "7783", ... },
  "contratos": [...],
  "propostas": [...],
  "timeline": [...]
}
```

## Tecnologias Utilizadas
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Ícones**: Feather Icons
- **Backend**: Node.js, Express.js
- **Armazenamento**: JSON files, localStorage
- **Formatação**: toLocaleString('pt-BR')

## Próximos Passos
1. Integração com WhatsApp API
2. Sistema de notificações em tempo real
3. Relatórios de produtividade
4. Backup automático de dados
5. Auditoria de alterações

---
**Última atualização**: 03/10/2025
**Versão**: 1.0.0
**Status**: Produção
