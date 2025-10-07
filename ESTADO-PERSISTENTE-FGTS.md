# 🔄 SISTEMA DE ESTADO PERSISTENTE FGTS

## 🎯 **OBJETIVO**
Garantir que o processamento de CPFs continue de onde parou, mesmo se o servidor cair ou for reiniciado, incluindo a lista de CPFs para reprocessar.

---

## 🏗️ **ARQUITETURA DO SISTEMA**

### **📁 Arquivos de Estado**
```
/var/data/cache/
├── estado-fgts-completo.json      # Estado principal do processamento
├── reprocessar-pendentes.json     # Lista de CPFs para reprocessar
├── pendentes.json                 # CPFs pendentes (cache-persistente.js)
├── tentativas-cache.json          # Tentativas de cache V8
├── estado-processamento.json       # Estado geral do sistema
├── listas-resultados.json         # Resultados por categoria
└── backups/                       # Backups automáticos
    ├── estado-fgts-2024-01-15T10-30-00-000Z.json
    └── reprocessar-2024-01-15T10-30-00-000Z.json
```

### **🔄 Fluxo de Funcionamento**
1. **Início**: Estado inicial salvo com todos os CPFs
2. **Processamento**: Estado atualizado em tempo real
3. **Falha/Reinício**: Estado carregado automaticamente
4. **Continuação**: Processamento retomado de onde parou

---

## 📊 **ESTRUTURA DO ESTADO**

### **Estado Principal (`estado-fgts-completo.json`)**
```json
{
  "processando": true,
  "iniciadoEm": "2024-01-15T10:30:00.000Z",
  "arquivoOriginal": "dados_teste.csv",
  "total": 1000,
  "processados": 250,
  "sucessos": 180,
  "pendentes": [
    {
      "cpf": "12345678901",
      "linha": 251,
      "id": "linha_251",
      "tentativas": 0,
      "ultimaTentativa": null,
      "status": "pendente"
    }
  ],
  "reprocessar": [
    {
      "cpf": "98765432100",
      "linha": 100,
      "id": "linha_100",
      "tentativas": 2,
      "ultimaTentativa": "2024-01-15T10:25:00.000Z",
      "status": "erro_temporario"
    }
  ],
  "erros": [],
  "ultimaAtualizacao": "2024-01-15T10:30:00.000Z"
}
```

### **Lista de Reprocessar (`reprocessar-pendentes.json`)**
```json
[
  {
    "cpf": "98765432100",
    "linha": 100,
    "motivo": "erro_429",
    "tentativas": 2,
    "proximoReprocessamento": "2024-01-15T11:00:00.000Z"
  }
]
```

---

## 🔧 **FUNCIONALIDADES IMPLEMENTADAS**

### **✅ Salvamento Automático**
- **Estado inicial**: Salvo ao iniciar processamento
- **Atualizações**: Estado atualizado a cada CPF processado
- **Backup**: Backup automático antes de cada alteração
- **Persistência**: Dados mantidos entre reinicializações

### **✅ Carregamento Automático**
- **Verificação**: Estado verificado ao iniciar servidor
- **Restauração**: CPFs pendentes e reprocessar restaurados
- **Continuação**: Processamento retomado automaticamente
- **Logs**: Status detalhado do que foi restaurado

### **✅ APIs de Gerenciamento**
- **GET `/fgts/estado`**: Verificar estado atual
- **POST `/fgts/continuar`**: Continuar processamento manualmente
- **POST `/fgts/limpar-estado`**: Limpar estado (com backup)

---

## 🚀 **COMO FUNCIONA**

### **1. Início do Processamento**
```javascript
// Upload de CSV
app.post('/fgts/run', uploadCSV.single('csvfile'), async (req, res) => {
  // Ler CPFs do CSV
  const registros = parse(csvContent, { columns: true, skip_empty_lines: true, delimiter: ";" });
  
  // Criar estado inicial completo
  const estadoInicial = {
    processando: true,
    iniciadoEm: new Date().toISOString(),
    arquivoOriginal: req.file.filename,
    total: registros.length,
    processados: 0,
    sucessos: 0,
    pendentes: registros.map((reg, i) => ({
      cpf: reg.CPF,
      linha: i + 1,
      id: reg.ID || `linha_${i + 1}`,
      tentativas: 0,
      ultimaTentativa: null,
      status: 'pendente'
    })),
    reprocessar: [],
    erros: [],
    ultimaAtualizacao: new Date().toISOString()
  };
  
  // Salvar estado inicial
  await salvarEstadoFGTS(estadoInicial);
  
  // Iniciar processamento
  await processarCPFs(req.file.path);
});
```

### **2. Atualização em Tempo Real**
```javascript
// No fgts_csv.js - função atualizarProgresso
const atualizarProgresso = () => {
  // Emitir para frontend
  if (ioInstance) {
    ioInstance.emit("progress", {
      done: processed,
      total,
      pendentes: pendentesParaReprocessar.length,
      counters: {
        success: contadorSucesso,
        pending: contadorPending,
        no_auth: contadorSemAutorizacao,
        descartados: contadorDescartados
      }
    });
  }
  
  // Atualizar estado persistente
  atualizarEstadoCompleto({
    processando: true,
    total: total,
    processados: processed,
    sucessos: contadorSucesso,
    pendentes: pendentesParaReprocessar.length,
    ultimaAtualizacao: new Date().toISOString()
  });
};
```

### **3. Verificação ao Iniciar Servidor**
```javascript
// No server.js - inicialização
server.listen(PORT, async () => {
  console.log('🚀 ===== SERVIDOR PRINCIPAL INICIADO =====');
  
  // Verificar processamento pendente
  console.log('🔍 Verificando processamento pendente...');
  try {
    await continuarProcessamento();
  } catch (error) {
    console.error('❌ Erro ao verificar processamento pendente:', error);
  }
  
  console.log('✅ Sistema de estado persistente ativo');
});
```

### **4. Continuação Automática**
```javascript
// Função continuarProcessamento
async function continuarProcessamento() {
  const estado = await verificarProcessamentoPendente();
  
  if (estado) {
    console.log(`🚀 Continuando processamento de onde parou...`);
    
    // Se há CPFs para reprocessar, iniciar reprocessamento
    if (estado.reprocessar?.length > 0) {
      console.log(`🔄 Iniciando reprocessamento de ${estado.reprocessar.length} CPFs`);
      await processarCPFs(null, estado.reprocessar);
    }
    
    // Se há CPFs pendentes, continuar processamento normal
    if (estado.pendentes?.length > 0) {
      console.log(`⏳ Continuando processamento de ${estado.pendentes.length} CPFs pendentes`);
      // O processamento continuará automaticamente via cache-persistente.js
    }
  }
}
```

---

## 🔍 **VERIFICAÇÃO DE FUNCIONAMENTO**

### **1. Verificar Estado Atual**
```bash
curl https://painel-fgts.onrender.com/fgts/estado
```

**Resposta esperada:**
```json
{
  "processando": true,
  "iniciadoEm": "2024-01-15T10:30:00.000Z",
  "arquivoOriginal": "dados_teste.csv",
  "total": 1000,
  "processados": 250,
  "sucessos": 180,
  "pendentes": 50,
  "reprocessar": 20,
  "ultimaAtualizacao": "2024-01-15T10:30:00.000Z"
}
```

### **2. Continuar Processamento Manualmente**
```bash
curl -X POST https://painel-fgts.onrender.com/fgts/continuar
```

### **3. Verificar Logs do Servidor**
```
🔄 Processamento pendente encontrado!
📊 Estado: 250/1000 processados
⏳ Pendentes: 50
🔄 Reprocessar: 20
✅ 50 CPFs pendentes restaurados
✅ 20 CPFs para reprocessar restaurados
🚀 Continuando processamento de onde parou...
```

---

## 🛠️ **MANUTENÇÃO E TROUBLESHOOTING**

### **Problemas Comuns**

#### **1. Estado Corrompido**
```bash
# Limpar estado (com backup)
curl -X POST https://painel-fgts.onrender.com/fgts/limpar-estado
```

#### **2. Processamento Travado**
```bash
# Verificar estado
curl https://painel-fgts.onrender.com/fgts/estado

# Continuar manualmente
curl -X POST https://painel-fgts.onrender.com/fgts/continuar
```

#### **3. CPFs Não Sendo Processados**
```bash
# Verificar pendentes
curl https://painel-fgts.onrender.com/fgts/cache/pendentes

# Verificar reprocessar
curl https://painel-fgts.onrender.com/fgts/cache/estatisticas
```

### **Backups Automáticos**
- **Frequência**: Antes de cada alteração
- **Retenção**: Últimos 5 backups por arquivo
- **Localização**: `/var/data/cache/backups/`
- **Formato**: `{arquivo}-{tipo}-{timestamp}.json`

---

## 🎉 **BENEFÍCIOS ALCANÇADOS**

### **✅ Continuidade Total**
- **Processamento nunca se perde** entre reinicializações
- **CPFs pendentes preservados** automaticamente
- **Lista de reprocessar mantida** entre sessões
- **Estado completo restaurado** ao reiniciar

### **✅ Confiabilidade Máxima**
- **Backup automático** antes de cada alteração
- **Recuperação automática** de erros
- **Verificação de integridade** dos dados
- **Logs detalhados** de todas as operações

### **✅ Facilidade de Uso**
- **Funcionamento transparente** para o usuário
- **APIs para monitoramento** e controle
- **Interface web atualizada** em tempo real
- **Continuidade automática** sem intervenção

---

## 📞 **SUPORTE**

### **Comandos Úteis**
```bash
# Verificar estado
curl https://painel-fgts.onrender.com/fgts/estado

# Continuar processamento
curl -X POST https://painel-fgts.onrender.com/fgts/continuar

# Limpar estado (emergência)
curl -X POST https://painel-fgts.onrender.com/fgts/limpar-estado

# Verificar cache
curl https://painel-fgts.onrender.com/fgts/cache/estatisticas
```

### **Logs Importantes**
- `🔄 Processamento pendente encontrado!`
- `✅ X CPFs pendentes restaurados`
- `✅ X CPFs para reprocessar restaurados`
- `🚀 Continuando processamento de onde parou...`

---

## 🎯 **CONCLUSÃO**

O sistema de estado persistente garante:

- **🔄 Continuidade total** do processamento
- **💾 Persistência completa** dos dados
- **🛡️ Confiabilidade máxima** com backups
- **⚡ Funcionamento transparente** para o usuário

**🚀 Agora o processamento FGTS nunca se perde, mesmo com quedas do servidor!** ✨
