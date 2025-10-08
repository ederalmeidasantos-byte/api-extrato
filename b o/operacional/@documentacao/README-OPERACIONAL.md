# Sistema Operacional de Digitação de Contratos

## Visão Geral

Sistema completo para digitação e gerenciamento de propostas de contratos, desenvolvido para uso operacional em computadores com interface otimizada para produtividade.

## Sistema de Identificadores

### Estrutura Hierárquica
- **Cliente ID**: Identificador único para cada cliente (baseado em CPF ou NB)
- **Proposta ID**: Identificador único para cada proposta dentro do cliente
- **Relacionamento**: 1 Cliente → N Propostas

### Regras de Negócio
- **CPF único**: Cada CPF pode ter apenas um Cliente ID
- **NB único**: Cada NB pode ter apenas um Cliente ID
- **Busca**: Por CPF ou NB para encontrar o cliente
- **Propostas**: Múltiplas propostas por cliente (cada contrato = 1 proposta)

## Estrutura do Sistema

### 1. Páginas Principais

#### `digitar-proposta.html`
- **Função**: Formulário para criação de novas propostas
- **Recursos**:
  - Dados completos do cliente (nome, CPF, nascimento, telefone, email, NB)
  - Endereço completo (CEP, logradouro, número, complemento, bairro, cidade, UF)
  - Dados do extrato (data, margem, origem)
  - Gerenciamento de contratos da proposta
  - Botões de cópia para cada campo
  - Sidebar com estatísticas e fila de digitação

#### `fila-digitation.html`
- **Função**: Gerenciamento da fila de propostas
- **Recursos**:
  - Estatísticas em tempo real (pendentes, processando, concluídos, hoje)
  - Filtros por status, nome e data
  - Lista paginada de propostas
  - Ações para cada proposta (digitar, cancelar, concluir, visualizar)
  - Interface responsiva e otimizada

#### `digitation-interface.html`
- **Função**: Interface de digitação detalhada
- **Recursos**:
  - Layout em duas colunas (dados do cliente + contratos)
  - Campos editáveis com botões de cópia
  - Gerenciamento de contratos
  - Modo visualização (somente leitura)
  - Salvamento automático
  - Conclusão de digitação

#### `buscar-cliente.html`
- **Função**: Busca e visualização de clientes
- **Recursos**:
  - Busca por CPF ou NB
  - Visualização de dados do cliente
  - Lista de propostas do cliente
  - Ações para cada proposta (ver, editar, excluir)
  - Estatísticas em tempo real
  - Interface otimizada para consultas

### 2. Funcionalidades Principais

#### Gerenciamento de Propostas
- **Criação**: Formulário completo com validação
- **Edição**: Interface dedicada para digitação
- **Visualização**: Modo somente leitura
- **Status**: Pendente → Processando → Concluído/Cancelado

#### Sistema de Cópia
- Botões de cópia em todos os campos
- Feedback visual ao copiar
- Suporte a navegadores modernos e antigos

#### Gerenciamento de Contratos
- Adição/edição/remoção de contratos
- Campos: banco, parcelas, valor da parcela, taxa, troco
- Validação de dados obrigatórios

#### Persistência de Dados
- Armazenamento local (localStorage)
- Sincronização entre páginas
- Backup automático

### 3. Interface e UX

#### Design Responsivo
- Layout otimizado para computadores
- Grid system flexível
- Componentes adaptáveis

#### Cores e Estilo
- Paleta azul profissional (#3b82f6, #1d4ed8)
- Gradientes sutis
- Sombras e bordas arredondadas
- Ícones Feather Icons

#### Interatividade
- Hover effects
- Transições suaves
- Feedback visual
- Estados de loading

### 4. Fluxo de Trabalho

#### 1. Criação de Proposta
1. Acessar `/operacional/digitar-proposta.html`
2. Preencher dados do cliente
3. Preencher endereço
4. Preencher dados do extrato
5. Adicionar contratos
6. Enviar para fila

#### 2. Processamento
1. Acessar `/operacional/fila-digitation.html`
2. Visualizar propostas pendentes
3. Clicar em "Digitar" para abrir interface
4. Preencher/editar dados na interface
5. Salvar progresso
6. Concluir digitação

#### 3. Acompanhamento
1. Visualizar estatísticas na fila
2. Filtrar por status/data/nome
3. Acompanhar progresso
4. Gerenciar propostas

### 5. Configuração do Servidor

O sistema é servido através do `server.js` principal:

```javascript
// Servir arquivos estáticos da pasta operacional
app.use("/operacional", express.static(path.join(__dirname, "operacional")));
```

### 6. URLs de Acesso

- **Nova Proposta**: `http://localhost:3000/operacional/digitar-proposta.html`
- **Fila de Digitação**: `http://localhost:3000/operacional/fila-digitation.html`
- **Buscar Cliente**: `http://localhost:3000/operacional/buscar-cliente.html`
- **Interface de Digitação**: `http://localhost:3000/operacional/digitation-interface.html?clientId={CLIENT_ID}&propostaId={PROPOSTA_ID}`

### 7. Recursos Técnicos

#### Tecnologias Utilizadas
- HTML5 semântico
- CSS3 com Grid e Flexbox
- JavaScript ES6+
- Feather Icons (CDN)
- LocalStorage para persistência

#### Otimizações
- Carregamento assíncrono
- Debounce em filtros
- Paginação eficiente
- Cache de dados

#### Compatibilidade
- Navegadores modernos
- Fallbacks para funcionalidades antigas
- Responsive design
- Acessibilidade básica

### 8. Manutenção e Desenvolvimento

#### Estrutura de Arquivos
```
operacional/
├── digitar-proposta.html      # Formulário de criação
├── fila-digitation.html       # Gerenciamento da fila
├── digitation-interface.html  # Interface de digitação
├── buscar-cliente.html        # Busca e visualização de clientes
├── client-manager.js          # Sistema de gerenciamento de clientes
└── README.md                  # Esta documentação
```

#### Sistema de Gerenciamento de Clientes (`client-manager.js`)
- **Classe ClientManager**: Gerencia clientes e propostas
- **Validação de IDs únicos**: CPF e NB únicos por cliente
- **Busca eficiente**: Por CPF ou NB
- **Relacionamentos**: Cliente → Múltiplas Propostas
- **Persistência**: localStorage com backup automático
- **Estatísticas**: Contadores em tempo real

#### Próximas Melhorias
- Integração com banco de dados
- Sistema de usuários e permissões
- Relatórios e dashboards
- Exportação de dados
- Notificações em tempo real
- API REST para integração

### 9. Troubleshooting

#### Problemas Comuns
1. **Dados não salvam**: Verificar localStorage do navegador
2. **Páginas não carregam**: Verificar se o servidor está rodando
3. **Ícones não aparecem**: Verificar conexão com CDN Feather Icons
4. **Cópia não funciona**: Usar navegador moderno ou fallback manual

#### Logs e Debug
- Console do navegador para erros JavaScript
- Network tab para problemas de carregamento
- Application tab para verificar localStorage

### 10. Suporte

Para suporte técnico ou dúvidas sobre o sistema, consulte:
- Documentação técnica do projeto principal
- Logs do servidor
- Console do navegador
- Issues do repositório
