# Sistema de Processamento Simultâneo - FGTS

## Visão Geral
Sistema de processamento paralelo de CPFs com controle de concorrência configurável via painel web.

## Funcionalidades
- Processamento simultâneo de 1-20 CPFs
- Controle em tempo real via painel HTML
- Fluxo contínuo: quando um CPF termina, o próximo inicia
- Delay entre requisições individuais preservado
- Reprocessamento automático de pendentes
- Logs em tempo real via Socket.IO

## Uso do Painel
1. Acesse http://72.60.159.149:3005
2. Configure "CPFs Simultâneos" (padrão: 5)
3. Configure "Delay (ms)" (padrão: 1000ms)
4. Faça upload do CSV
5. Monitore processamento em tempo real

## Configurações Recomendadas
- **Produção**: 5 CPFs simultâneos, 1000ms delay
- **Teste**: 3 CPFs simultâneos, 500ms delay
- **Alta demanda**: 10 CPFs simultâneos, 1500ms delay
- **Máxima velocidade**: 20 CPFs simultâneos, 2000ms delay

## Performance Estimada
- Com 1 simultâneo: ~60 CPFs/hora (sequencial)
- Com 5 simultâneos: ~300 CPFs/hora
- Com 10 simultâneos: ~600 CPFs/hora
- Com 20 simultâneos: ~1200 CPFs/hora

*Nota: Performance real pode variar baseada na resposta das APIs externas*

## Arquitetura Técnica
- **Biblioteca**: p-queue (gerenciamento de fila)
- **Padrão**: Fluxo contínuo (continuous flow)
- **Socket.IO**: Comunicação em tempo real
- **Delay**: Preservado entre requisições individuais
- **Cache**: Mantido para evitar consultas duplicadas

## Fluxo de Processamento

### 1. Configuração Inicial
```
Usuário define concorrência → Socket.IO → setConcurrency() → Nova fila PQueue
```

### 2. Processamento de CPFs
```
CSV Upload → Loop sequencial → Adiciona à fila PQueue → Processamento paralelo
```

### 3. Processamento Individual
```
CPF → Validação → Consulta V8 → Simulação → Kentro → Resultado
```

### 4. Reprocessamento
```
Pendentes → Loop sequencial → Tentativa de resolução → Atualização
```

## Controles Disponíveis

### Painel HTML
- **CPFs Simultâneos**: 1-20 (padrão: 5)
- **Delay (ms)**: 100-5000ms (padrão: 1000ms)
- **Upload CSV**: Arquivo com coluna CPF
- **Logs em Tempo Real**: Monitoramento via Socket.IO

### Socket.IO Events
- `setConcurrency`: Alterar número de CPFs simultâneos
- `setDelay`: Alterar delay entre requisições
- `concurrencyUpdated`: Confirmação de alteração de concorrência
- `delayUpdated`: Confirmação de alteração de delay
- `log`: Logs em tempo real
- `progress`: Atualização de progresso
- `resultadoCPF`: Resultado de processamento individual

## Monitoramento

### Logs Importantes
```
⚙️ Concorrência alterada para: X CPFs simultâneos
📋 PROCESSANDO CPF X/Y: CPF | Linha: Z | ID: ID
🔄 FORÇANDO SIMULAÇÃO DAS TABELAS para CPF X - Saldo: R$ Y
🚀 INICIANDO DISPARO pela Kentro - ID: X
✅ Disparo pela Kentro realizado com sucesso
```

### Métricas de Performance
- **CPFs Processados**: Total processado
- **Sucessos**: CPFs com simulação válida
- **Pendentes**: CPFs aguardando reprocessamento
- **Não Autorizados**: CPFs sem autorização
- **Descartados**: CPFs inválidos

## Troubleshooting

### Problemas Comuns

#### 1. Processamento Muito Lento
- **Causa**: Concorrência muito baixa
- **Solução**: Aumentar "CPFs Simultâneos" para 5-10

#### 2. Muitos Erros 429
- **Causa**: Concorrência muito alta
- **Solução**: Reduzir "CPFs Simultâneos" para 3-5

#### 3. Logs Não Aparecem
- **Causa**: Problema de conexão Socket.IO
- **Solução**: Recarregar página e verificar logs do servidor

#### 4. CPFs Não Processam
- **Causa**: Sistema pausado ou erro de autenticação
- **Solução**: Verificar logs de erro e status do sistema

### Comandos de Debug
```bash
# Verificar logs de concorrência
docker logs fgts-lunasdigital --tail 100 | grep -E "(CPFs simultâneos|Concorrência)"

# Verificar processamento em tempo real
docker logs fgts-lunasdigital --tail 50 | grep -E "(PROCESSANDO CPF|simultâneos)"

# Verificar disparos Kentro
docker logs fgts-lunasdigital --tail 100 | grep -E "(DISPARO|Kentro)"
```

## Testes

### Script de Teste Automatizado
```bash
# Executar testes de concorrência
chmod +x test-concurrent.sh
./test-concurrent.sh
```

### Teste Manual
1. Acesse o painel web
2. Configure concorrência para 3
3. Faça upload de CSV com 10 CPFs
4. Monitore logs em tempo real
5. Verifique resultados

## Limitações

### Técnicas
- Máximo 20 CPFs simultâneos
- Delay mínimo 100ms entre requisições
- Dependente da resposta das APIs externas
- Cache limitado a 5 minutos

### Operacionais
- Requer conexão estável com APIs
- Dependente de credenciais válidas
- Limitado por rate limits das APIs externas

## Manutenção

### Atualizações
- Alterar concorrência: Via painel web
- Alterar delay: Via painel web
- Reiniciar sistema: `docker restart fgts-lunasdigital`

### Backup
- Cache persistente: `/var/data/cache`
- Logs: `/app/fgts/logs`
- Uploads: `/app/fgts/uploads`

## Changelog

### v1.0.0 - Processamento Simultâneo
- ✅ Implementado controle de concorrência
- ✅ Interface web para configuração
- ✅ Processamento com p-queue
- ✅ Logs em tempo real
- ✅ Testes automatizados
- ✅ Documentação completa
