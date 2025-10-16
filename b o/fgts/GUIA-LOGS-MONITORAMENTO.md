# 📊 Guia de Logs e Monitoramento - Sistema FGTS v3.1

## 🎯 Visão Geral

Este guia detalha como interpretar os logs do sistema FGTS, especialmente as novas funcionalidades de identificação de contingência implementadas na versão 3.1.

---

## 🔄 Identificação de Troca de Credenciais

### **Tipos de Logs**

#### **🔄 Troca Normal (NORMAL)**
```
[15:30:25] 🔄 TROCA DE CREDENCIAL (NORMAL): 1 → 2 (usuario@email.com)
[15:30:25] 📊 Total de trocas: 3
```
- **Cor no Painel**: Azul (info)
- **Quando**: Rotação automática programada
- **Motivo**: Sistema funcionando normalmente

#### **🔄 Troca por Contingência (CONTINGÊNCIA)**
```
[15:30:25] 🔄 TROCA DE CREDENCIAL (CONTINGÊNCIA): 1 → 2 (usuario@email.com)
[15:30:25] 📊 Total de trocas: 3
[15:30:25] ✅ Autenticado via API de tokens (CONTINGÊNCIA): usuario@email.com (credencial 2)
```
- **Cor no Painel**: Amarelo (warning)
- **Quando**: Erro 429 ou falha na autenticação direta
- **Motivo**: Sistema usando API de contingência

---

## 📋 Logs de Processamento

### **Logs de CPF Processado**
```
[15:30:25] 📋 PROCESSANDO CPF 30/3507: 03224017040 | Linha: 31 | ID: 36570
[15:30:25] 📋 CPF Processado: 03224017040 | Status: ✅ Sucesso | Valor: R$ 1.500,00 | Provider: bms
```

### **Logs de Status**
- **✅ Sucesso**: CPF processado com saldo > 0
- **⏳ Pendente**: CPF aguardando processamento
- **🚫 Não Autorizado**: CPF sem autorização
- **❌ Descartado**: CPF com erro crítico

---

## 🚨 Logs de Erro

### **Erro 429 (Rate Limit)**
```
[15:30:25] ⚠️ ERRO 429 DETECTADO - Tentando contingência para usuario@email.com
[15:30:25] 🔄 Tentando API de tokens para usuario@email.com...
[15:30:25] ✅ Autenticado via API de tokens (CONTINGÊNCIA): usuario@email.com (credencial 2)
```

### **Erro de Autenticação**
```
[15:30:25] ❌ Erro ao autenticar usuario@email.com (credencial 1): Request failed with status code 401
[15:30:25] 🔄 Tentando próxima credencial...
```

---

## 📊 Monitoramento de Performance

### **Contadores em Tempo Real**
- **Total de CPFs**: Total do arquivo original
- **Processados**: CPFs já processados
- **Sucessos**: CPFs com saldo > 0
- **Pendentes**: CPFs aguardando processamento
- **Não Autorizados**: CPFs sem autorização
- **Descartados**: CPFs com erro crítico

### **Taxa de Sucesso**
```
📊 Contadores finais:
Sucesso: 150 | Pendentes: 25 | Sem Autorização: 10 | Descartados: 5
```

---

## 🔍 Troubleshooting

### **Problemas Comuns**

#### **Muitas Trocas de Contingência**
- **Sintoma**: Logs frequentes de "CONTINGÊNCIA"
- **Causa**: API principal com problemas
- **Solução**: Verificar conectividade com V8

#### **Erro 429 Persistente**
- **Sintoma**: Múltiplos erros 429 consecutivos
- **Causa**: Rate limit atingido
- **Solução**: Aguardar ou usar contingência

#### **Contadores Incorretos**
- **Sintoma**: Contadores não batem com processamento
- **Causa**: Desincronização de cache
- **Solução**: Executar `/fgts/forcar-processamento`

---

## 📈 Métricas Importantes

### **Taxa de Contingência**
- **Normal**: < 10% das trocas são contingência
- **Alerta**: 10-30% das trocas são contingência
- **Crítico**: > 30% das trocas são contingência

### **Tempo de Processamento**
- **CPF Individual**: ~2-5 segundos
- **Arquivo Completo**: Varia com tamanho
- **Delay Atual**: 1 segundo (fixo)

---

## 🛠️ Comandos de Debug

### **Verificar Status**
```bash
# Ver logs da aplicação
pm2 logs api-extrato

# Ver status
pm2 status

# Reiniciar aplicação
pm2 restart api-extrato
```

### **Verificar Cache**
```bash
# Verificar arquivos de cache
ls -la /var/data/cache/

# Verificar contadores
curl http://localhost:3000/fgts/contadores-tempo-real
```

---

## 📝 Boas Práticas

### **Monitoramento**
1. **Acompanhar logs em tempo real**
2. **Verificar taxa de contingência**
3. **Monitorar contadores**
4. **Identificar padrões de erro**

### **Manutenção**
1. **Limpar logs antigos**
2. **Verificar espaço em disco**
3. **Monitorar performance**
4. **Atualizar credenciais**

---

**📊 Guia de Logs e Monitoramento - Sistema FGTS v3.1**
**📅 Última Atualização: 01/10/2025**
**👨‍💻 Desenvolvido por: Equipe Lunas Digital**







