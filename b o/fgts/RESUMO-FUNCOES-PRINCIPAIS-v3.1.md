# 📋 Resumo das Funções Principais - Sistema FGTS v3.1

## 🎯 Visão Geral

Este documento resume as principais funções e funcionalidades do Sistema FGTS versão 3.1, incluindo as novas funcionalidades de identificação de contingência.

---

## 🔧 Funções Principais

### **1. Processamento de CPFs**
- **Arquivo**: `fgts/fgts_csv.js`
- **Função**: `processarCPFs()`
- **Descrição**: Processa lista de CPFs do CSV ou reprocessamento
- **Recursos**:
  - Remoção automática de duplicados
  - Sistema de retry inteligente
  - Cache persistente
  - Logs detalhados

### **2. Autenticação com Contingência**
- **Arquivo**: `fgts/fgts_csv.js`
- **Função**: `autenticarIndividual()`
- **Descrição**: Autenticação com sistema V8 + contingência automática
- **Recursos**:
  - **NOVO**: Identificação visual de contingência
  - **NOVO**: Logs diferenciados "NORMAL" vs "CONTINGÊNCIA"
  - Fallback automático para API de tokens
  - Sistema de fila única

### **3. Troca de Credenciais Inteligente**
- **Arquivo**: `fgts/fgts_csv.js`
- **Função**: `switchCredential()`
- **Descrição**: Alterna entre credenciais com identificação de motivo
- **Recursos**:
  - **NOVO**: Parâmetro `isContingency` para identificar motivo
  - **NOVO**: Logs coloridos (azul=normal, amarelo=contingência)
  - Contador de trocas total
  - Prevenção de logs duplicados

### **4. Sistema de Cache Persistente**
- **Arquivo**: `fgts/cache-persistente.js`
- **Função**: `carregarListas()`, `salvarListas()`
- **Descrição**: Armazenamento persistente entre sessões
- **Recursos**:
  - Sobrevive a reinicializações
  - Backup automático
  - Organização por tipo de resultado

### **5. Interface Web em Tempo Real**
- **Arquivo**: `fgts/index.html`
- **Descrição**: Painel de controle com Socket.IO
- **Recursos**:
  - **NOVO**: Logs diferenciados por cor
  - Contadores em tempo real
  - Controles de pausa/retomada
  - Tabela de resultados

---

## 🔄 Sistema de Contingência

### **Identificação Visual**
```javascript
// Troca Normal
switchCredential(null, false); // NORMAL

// Troca por Contingência  
switchCredential(null, true);  // CONTINGÊNCIA
```

### **Logs Diferenciados**
- **🔄 NORMAL**: Azul (info) - Rotação programada
- **🔄 CONTINGÊNCIA**: Amarelo (warning) - Erro 429 ou falha

### **Cenários de Contingência**
1. **Erro 429**: Rate limit atingido
2. **Falha de Autenticação**: Credencial inválida
3. **Timeout**: API não responde
4. **Erro de Rede**: Problemas de conectividade

---

## 📊 Monitoramento

### **Contadores em Tempo Real**
- **Total de CPFs**: Total do arquivo
- **Processados**: CPFs já processados
- **Sucessos**: CPFs com saldo > 0
- **Pendentes**: CPFs aguardando
- **Não Autorizados**: CPFs sem autorização
- **Descartados**: CPFs com erro crítico

### **Logs Importantes**
- **Processamento**: `📋 PROCESSANDO CPF X/Y`
- **Troca Normal**: `🔄 TROCA DE CREDENCIAL (NORMAL)`
- **Troca Contingência**: `🔄 TROCA DE CREDENCIAL (CONTINGÊNCIA)`
- **Sucesso**: `✅ Autenticado via API de tokens (CONTINGÊNCIA)`

---

## 🛠️ APIs Principais

### **Upload e Processamento**
- `POST /fgts/run`: Upload de CSV
- `POST /fgts/pause`: Pausar processamento
- `POST /fgts/resume`: Retomar processamento
- `POST /fgts/cancel`: Cancelar processamento

### **Dados e Status**
- `GET /fgts/lista-completa`: Lista todos os resultados
- `GET /fgts/contadores-tempo-real`: Contadores em tempo real
- `GET /fgts/debug-dados`: Dados de debug

### **Configuração**
- `GET /api/credenciais`: Lista credenciais
- `POST /api/credenciais`: Atualiza credenciais
- `GET /api/health`: Health check

---

## 🔍 Troubleshooting

### **Problemas Comuns**

#### **Muitas Trocas de Contingência**
- **Sintoma**: Logs frequentes de "CONTINGÊNCIA"
- **Causa**: API principal com problemas
- **Solução**: Verificar conectividade com V8

#### **Contadores Incorretos**
- **Sintoma**: Contadores não batem
- **Causa**: Desincronização de cache
- **Solução**: Executar `/fgts/forcar-processamento`

#### **Logs Duplicados**
- **Sintoma**: Mesmo log aparece múltiplas vezes
- **Causa**: Variáveis globais resetadas
- **Solução**: Variáveis movidas para fora das funções

---

## 📈 Métricas de Performance

### **Taxa de Contingência**
- **Normal**: < 10% das trocas são contingência
- **Alerta**: 10-30% das trocas são contingência  
- **Crítico**: > 30% das trocas são contingência

### **Tempo de Processamento**
- **CPF Individual**: ~2-5 segundos
- **Delay Atual**: 1 segundo (fixo)
- **Retry**: Até 3 tentativas por CPF

---

## 🚀 Deploy e Configuração

### **Variáveis de Ambiente**
```bash
# Credenciais FGTS (obrigatórias)
FGTS_USER_1=usuario1@email.com
FGTS_PASS_1=senha1
FGTS_USER_2=usuario2@email.com
FGTS_PASS_2=senha2

# API de Contingência
API_TOKENS_URL=https://api-extrato-1.onrender.com

# CRM
LUNAS_API_KEY=sua_chave_aqui
QUEUE_ID=25
DEST_STAGE_ID=4
```

### **Comandos de Deploy**
```bash
# Local
node server.js

# VPS
git pull origin master
npm install
pm2 restart api-extrato
```

---

## 📚 Documentação Relacionada

- **`README-CONTINGENCIA.md`**: Sistema de contingência detalhado
- **`DOCUMENTACAO-COMPLETA-FGTS.md`**: Documentação completa
- **`GUIA-LOGS-MONITORAMENTO.md`**: Guia de logs e monitoramento
- **`CHANGELOG-DETALHADO.md`**: Histórico de mudanças

---

**📋 Resumo das Funções Principais - Sistema FGTS v3.1**
**📅 Última Atualização: 01/10/2025**
**👨‍💻 Desenvolvido por: Equipe Lunas Digital**







