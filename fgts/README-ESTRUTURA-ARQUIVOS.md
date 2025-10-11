# 📁 ESTRUTURA DE ARQUIVOS E LISTAS - SISTEMA FGTS

## 🎯 **IMPORTANTE: Entendendo as Listas**

### 📋 **LISTA-FGTS.csv** (Lista de Referência KENTRO)
- **Localização**: `/var/lib/docker/volumes/fgts_fgts-data/_data/LISTA-FGTS.csv`
- **Propósito**: Lista de oportunidades da KENTRO para buscar IDs
- **Formato**: CSV complexo com 79 campos (dados completos da KENTRO)
- **Uso**: Função `consultarPlanilha()` busca ID da oportunidade pelo CPF/telefone
- **Total**: 6055 linhas (incluindo cabeçalho e dados da KENTRO)
- **❌ NÃO É**: A lista de CPFs para processar

### 📊 **Arquivos de Upload** (Lista REAL de CPFs)
- **Localização**: `/var/lib/docker/volumes/fgts_fgts-data/_data/uploads/`
- **Propósito**: Lista REAL de CPFs para processar
- **Formato**: 
  ```
  CPF;TELEFONE;ID
  07205730929;42991311398;36805
  06526407960;47996029227;36804
  ```
- **Total**: 3507 CPFs por arquivo
- **✅ ESTA É**: A lista que o sistema realmente processa

## 🔄 **Como o Sistema Funciona**

### 1. **Upload de CSV**
- Usuário faz upload de arquivo CSV com formato `CPF;TELEFONE;ID`
- Arquivo é salvo em `/var/lib/docker/volumes/fgts_fgts-data/_data/uploads/`
- Sistema processa este arquivo, não a `LISTA-FGTS.csv`

### 2. **Processamento**
- Sistema lê o arquivo de upload (3507 CPFs)
- Para cada CPF, consulta a `LISTA-FGTS.csv` para buscar o ID da oportunidade KENTRO
- Processa o CPF na API V8
- Atualiza a oportunidade na KENTRO

### 3. **Monitoramento**
- **Painel Principal**: `http://72.60.159.149:3005/fgts`
- **Lista Detalhada**: `http://72.60.159.149:3005/fgts/lista-detalhada.html`

## 📊 **Status Atual do Sistema**

### **Contadores Reais**
- **Total de CPFs para Processar**: 3507 (do arquivo de upload)
- **Processados**: 266
- **Faltam Processar**: 3241 CPFs
- **Sucessos**: 56
- **Pendentes**: 354
- **Não Autorizados**: 34
- **Descartados**: 176

## 🎯 **Lista Detalhada de Monitoramento**

### **Acesso**
- **URL**: `http://72.60.159.149:3005/fgts/lista-detalhada.html`
- **API**: `http://72.60.159.149:3005/fgts/lista-detalhada`

### **Funcionalidades**
- ✅ **Tempo Real**: Atualizações automáticas via Socket.IO
- ✅ **Filtros**: Status, Provider, Tipo de Autenticação
- ✅ **Busca**: Por CPF específico
- ✅ **Paginação**: 25, 50, 100 ou 200 registros por página
- ✅ **Informações Detalhadas**: 
  - Timestamp
  - CPF
  - ID da oportunidade
  - Status (Sucesso, Pendente, Não Autorizado, Descartado)
  - Provider (BMS, Cartos, QI)
  - Tipo de Autenticação (Normal, Contingência 1, Contingência 2)
  - Credencial usada
  - Valor liberado
  - Linha do arquivo
  - Tipo de lista

## 🔧 **Estrutura de Arquivos no Servidor**

```
/var/lib/docker/volumes/fgts_fgts-data/_data/
├── LISTA-FGTS.csv                    # Lista KENTRO (referência)
├── uploads/                          # Arquivos CSV de CPFs para processar
│   ├── 145f334481c82c0754d92dad8d7f2d18  # 3507 CPFs
│   ├── 2e8a9daa849fff0629bbab114e48000f  # 3507 CPFs
│   ├── 8e7c70bb01e72ec89f30c302524eab62  # 3507 CPFs
│   └── db2a7d0862eae2ad8a151a2a1aeceaa3  # 3507 CPFs
├── cache/                            # Cache persistente
│   ├── listas-resultados.json       # Resultados processados
│   ├── pendentes.json               # CPFs pendentes
│   └── tentativas-cache.json        # Cache de tentativas
└── logs/                            # Logs do sistema
```

## 🚨 **Problemas Identificados**

### **Contador Incorreto**
- **Problema**: Sistema mostra apenas 620 CPFs no contador
- **Realidade**: Deveria mostrar 3507 CPFs
- **Causa**: Parser CSV pode estar perdendo registros ou usando arquivo errado

### **Solução Necessária**
1. Verificar qual arquivo CSV está sendo usado atualmente
2. Corrigir o parser para processar todos os 3507 CPFs
3. Atualizar contadores para mostrar números corretos

## 📝 **Comandos Úteis**

### **Verificar Arquivos de Upload**
```bash
ssh root@72.60.159.149 "ls -la /var/lib/docker/volumes/fgts_fgts-data/_data/uploads/"
```

### **Contar CPFs em Arquivo de Upload**
```bash
ssh root@72.60.159.149 "tail -n +2 /var/lib/docker/volumes/fgts_fgts-data/_data/uploads/[ARQUIVO] | wc -l"
```

### **Verificar Status Atual**
```bash
ssh root@72.60.159.149 "curl -s 'http://localhost:3005/fgts/contadores-tempo-real'"
```

### **Ver Logs do Processamento**
```bash
ssh root@72.60.159.149 "docker logs fgts-lunasdigital --since 5m | grep -E 'Total de registros|registros carregados'"
```

## 🎯 **Próximos Passos**

1. **Identificar Arquivo Ativo**: Verificar qual arquivo CSV está sendo processado
2. **Corrigir Parser**: Garantir que todos os 3507 CPFs sejam carregados
3. **Atualizar Contadores**: Mostrar números corretos no frontend
4. **Monitorar Processamento**: Usar lista detalhada para acompanhar progresso

---

**✨ Agora você sabe exatamente onde estão as listas e como o sistema funciona!** 🎉
