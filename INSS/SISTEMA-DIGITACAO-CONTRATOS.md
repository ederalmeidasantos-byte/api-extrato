# Sistema de Digitação de Contratos - INSS

## 📋 Visão Geral
Sistema operacional para equipe digitar contratos de clientes INSS de forma organizada e eficiente.

## 🔄 Fluxo do Sistema

### 1. **Página de Digitação de Proposta** (`/digitar-proposta`)
- **Objetivo**: Coletar todos os dados do cliente e contratos selecionados
- **Dados coletados**:
  - Dados pessoais do cliente (nome, CPF, telefone, email)
  - Dados do extrato (NB, espécie, origem, data)
  - Endereço completo
  - Contratos selecionados pelo cliente
- **Ação final**: Enviar para fila de digitação

### 2. **Fila de Digitação** (`/fila-digitacao`)
- **Objetivo**: Listar todas as propostas pendentes de digitação
- **Funcionalidades**:
  - Lista de propostas com status
  - Botão "DIGITAR" para abrir interface de digitação
  - Botão "CANCELAR" para remover da fila
  - Filtros por status (pendente, digitando, digitado, cancelado)

### 3. **Interface de Digitação** (`/digitar/:propostaId`)
- **Objetivo**: Interface para digitação real dos contratos
- **Funcionalidades**:
  - Todos os campos com botão "COPIAR" para facilitar digitação
  - Dados do cliente pré-preenchidos
  - Contratos detalhados com campos editáveis
  - Botão "DIGITADO" ou "CANCELAR" para cada contrato
  - Ações finais: "DIGITADO" ou "CANCELAR" (proposta completa)

## 🗂️ Estrutura de Arquivos

```
INSS/
├── digitar-proposta.html          # Página 1: Coleta de dados
├── fila-digitacao.html           # Página 2: Fila de propostas
├── digitar-interface.html        # Página 3: Interface de digitação
├── digitation-logic.js           # Lógica do sistema de digitação
└── SISTEMA-DIGITACAO-CONTRATOS.md # Esta documentação
```

## 📊 Estados das Propostas

| Estado | Descrição | Ação Disponível |
|--------|-----------|-----------------|
| `pendente` | Proposta enviada, aguardando digitação | DIGITAR, CANCELAR |
| `digitando` | Sendo digitada no momento | - |
| `digitado` | Digitação concluída | VER |
| `cancelado` | Cancelada pela equipe | - |

## 🔧 Funcionalidades Técnicas

### Botões de Copiar
- Todos os campos têm botão "COPIAR" ao lado
- Usa `navigator.clipboard.writeText()` para copiar
- Feedback visual quando copiado

### Persistência de Dados
- Dados salvos no `localStorage` para simplicidade
- Estrutura: `filaDigitacao_${propostaId}`
- Backup automático a cada alteração

### Responsividade
- Design mobile-first
- Interface otimizada para tablets e desktops
- Botões grandes para facilitar uso em dispositivos móveis

## 🎯 Casos de Uso

### Caso 1: Cliente seleciona todos os contratos
1. Cliente acessa `/detalhesdaproposta/proposta_123`
2. Seleciona todos os contratos disponíveis
3. Clica em "DIGITAR PROPOSTA"
4. Preenche dados pessoais e endereço
5. Envia para fila de digitação

### Caso 2: Equipe processa proposta
1. Acessa `/fila-digitacao`
2. Vê lista de propostas pendentes
3. Clica em "DIGITAR" na proposta desejada
4. Interface abre com todos os dados
5. Usa botões "COPIAR" para facilitar digitação
6. Marca contratos como "DIGITADO" conforme processa
7. Finaliza com "DIGITADO" ou "CANCELAR"

## 🚀 URLs do Sistema

- **Digitação**: `http://localhost:3000/digitar-proposta`
- **Fila**: `http://localhost:3000/fila-digitacao`
- **Interface**: `http://localhost:3000/digitar/:propostaId`

## 📝 Notas Importantes

- **Apenas contratos selecionados** vão para a fila de digitação
- **Dados do cliente** são pré-preenchidos na interface de digitação
- **Botões de copiar** facilitam a digitação em sistemas externos
- **Status em tempo real** na fila de digitação
- **Backup automático** de todos os dados



