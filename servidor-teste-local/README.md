# 🏛️ Simulador INSS - Sistema de Simulação de Contratos

## 📋 Descrição
Sistema completo para simulação de contratos de empréstimo consignado do INSS, com validação de regras bancárias e cálculo de troco.

## 🚀 Funcionalidades

### 1. **Informações do Cliente**
- Nome, NB, Espécie, Origem e Data do Extrato
- Dados carregados automaticamente

### 2. **Margens do Cliente**
- Margem Disponível
- Margem Extrapolada
- Margem RMC e RCC
- Valores em tempo real

### 3. **Contratos Ativos**
- ✅ **Seleção**: Checkbox para incluir/excluir do resumo
- ✏️ **Edição**: Campos editáveis inline:
  - Prazo total
  - Parcelas pagas
  - Valor da parcela
  - Saldo devedor
  - Taxa de juros
- 🔄 **Simulação**: Botão para simular em todos os bancos
- 📊 **Resultados**: Exibição de aprovações e rejeições

### 4. **Resumo da Simulação**
- Total de troco calculado
- Agrupamento por banco
- Exportação de resultados

## 🎯 Como Usar

### **Passo 1: Carregar Dados**
- Os dados de exemplo são carregados automaticamente
- Para dados reais, substitua o arquivo `dados-exemplo.js`

### **Passo 2: Configurar Contratos**
- Marque/desmarque contratos para simulação
- Edite valores conforme necessário
- Clique em "🔄 Simular" para cada contrato

### **Passo 3: Analisar Resultados**
- Veja aprovações (✅) e rejeições (❌) por banco
- Motivos de bloqueio são exibidos claramente
- Resumo mostra total de troco por banco

### **Passo 4: Exportar**
- Clique em "📄 Exportar" para gerar CSV
- Dados incluem todas as simulações

## 🔧 Estrutura de Arquivos

```
teste-simulador/
├── simulador-inss.html          # Página principal
├── simulador-logic.js           # Lógica de simulação
├── roteiro-bancos-simulador.js  # Regras dos bancos
├── coeficientes-simulador.js    # Coeficientes 96x
├── dados-exemplo.js             # Dados de exemplo
└── README.md                    # Este arquivo
```

## 📊 Regras de Validação

### **Por Banco:**
1. **Saldo devedor mínimo**
2. **Espécie permitida**
3. **Parcela mínima**
4. **Parcelas pagas** (regra geral + exceções)
5. **Banco de origem não permitido**

### **Cálculo de Troco:**
- Usa coeficientes de 96x
- Taxa mínima de troco: R$ 100,00
- Seleciona melhor opção (maior troco)

## 🎨 Design System
- **Cores**: Gradientes teal/blue/purple
- **Layout**: Responsivo e compacto
- **UX**: Feedback visual imediato
- **Performance**: Simulação assíncrona

## 🚀 Para Testar

1. Abra `simulador-inss.html` no navegador
2. Clique em "🔄 Simular" nos contratos
3. Veja os resultados em tempo real
4. Exporte os dados se necessário

## 📝 Próximas Melhorias

- [ ] Upload de PDF de extrato
- [ ] Integração com API real
- [ ] Histórico de simulações
- [ ] Relatórios em PDF
- [ ] Validação de dados mais robusta

---

**Desenvolvido com Design System Lunas Digital** 🎨
