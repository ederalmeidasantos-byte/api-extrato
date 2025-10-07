/**
 * Exemplo de Integração do Sistema de Webhooks
 * Como modificar o fgts_csv.js para usar webhooks
 */

import { enviarParaFilaAssincrono, registrarWebhookSaldo } from './fgts_webhook_system.js';

// Modificação na função processarCPFs
async function processarCPFsComWebhooks(registros, callback) {
  console.log('🚀 Iniciando processamento com webhooks...');
  
  // 1. Registrar webhook uma vez no início
  await registrarWebhookSaldo();
  
  let contadorSucesso = 0;
  let contadorFalha = 0;
  let contadorPendente = 0;
  
  for (let [index, registro] of registros.entries()) {
    if (paused) break;
    
    const { cpf, id, linha } = registro;
    
    try {
      // 2. Enviar para fila de forma assíncrona
      const resultado = await enviarParaFilaAssincrono(cpf, linha);
      
      if (resultado.success) {
        contadorPendente++;
        console.log(`📤 CPF ${cpf} enviado para fila - aguardando webhook`);
        
        // Emitir status para painel
        if (ioInstance) {
          ioInstance.emit('log', `📤 Linha: ${linha} | CPF: ${cpf} | Status: Enviado para fila`);
        }
      } else {
        contadorFalha++;
        console.log(`❌ Falha ao enviar CPF ${cpf} para fila`);
      }
      
      // 3. Delay entre envios (muito menor que antes)
      await delay(100); // Apenas 100ms entre envios
      
    } catch (error) {
      console.error(`❌ Erro processando CPF ${cpf}:`, error.message);
      contadorFalha++;
    }
    
    // 4. Atualizar progresso
    atualizarProgresso();
  }
  
  console.log(`✅ Processamento concluído - Pendentes: ${contadorPendente}, Falhas: ${contadorFalha}`);
  console.log('🔔 Aguardando webhooks para processar resultados...');
}

// Vantagens do sistema com webhooks:
/*
1. 🚀 PERFORMANCE:
   - Envio muito mais rápido (100ms entre CPFs vs 2-5 segundos)
   - Não bloqueia aguardando respostas
   - Processa centenas de CPFs em minutos

2. 🔄 CONFIABILIDADE:
   - Não perde consultas por timeout
   - Webhook garante entrega do resultado
   - Retry automático em caso de falha

3. 📊 MONITORAMENTO:
   - Status em tempo real no painel
   - Logs detalhados de cada etapa
   - Controle de consultas pendentes

4. 🎯 EFICIÊNCIA:
   - Reduz rate limits drasticamente
   - Melhor uso das credenciais
   - Processamento paralelo real

5. 💰 CUSTO:
   - Menos requisições = menos custo
   - Melhor aproveitamento das APIs
   - Reduz necessidade de múltiplas credenciais
*/
