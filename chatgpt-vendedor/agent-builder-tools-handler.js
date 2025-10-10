/**
 * Agent Builder Tools Handler - ChatGPT Vendedor
 * Handler para Custom Tools do Agent Builder OpenAI
 */

import express from 'express';
import fs from 'fs-extra';
import path from 'path';

const router = express.Router();

// Endpoint para o Agent Builder chamar as tools
router.post('/agent-tools', async (req, res) => {
  const { tool_name, parameters } = req.body;
  
  try {
    console.log(`🔧 Agent Builder chamou tool: ${tool_name}`, parameters);
    
    let result;
    
    switch(tool_name) {
      case 'buscar_dados_cliente':
        result = await buscarDadosCliente(parameters.cpf);
        break;
        
      case 'verificar_propostas':
        result = await verificarPropostas(parameters.cpf);
        break;
        
      case 'simular_portabilidade':
        result = await simularPortabilidade(
          parameters.valor_atual, 
          parameters.parcelas_restantes
        );
        break;
        
      case 'simular_fgts':
        result = await simularFgts(parameters.saldo_fgts);
        break;
        
      default:
        console.log(`❌ Tool não encontrada: ${tool_name}`);
        return res.status(400).json({ error: 'Tool não encontrada' });
    }
    
    console.log(`✅ Tool ${tool_name} executada com sucesso`);
    res.json({ success: true, data: result });
    
  } catch (error) {
    console.error(`❌ Erro na tool ${tool_name}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Função: Buscar dados do cliente
 */
async function buscarDadosCliente(cpf) {
  try {
    const clientFile = path.join(process.cwd(), 'var', 'data', 'clientes', `${cpf}.json`);
    
    if (!await fs.pathExists(clientFile)) {
      return { 
        encontrado: false, 
        mensagem: 'Cliente não encontrado',
        cpf: cpf
      };
    }
    
    const data = await fs.readJson(clientFile);
    
    return {
      encontrado: true,
      nome: data.cliente?.nome || 'N/A',
      cpf: cpf,
      propostas: data.propostas || [],
      total_propostas: data.propostas?.length || 0,
      dados_completos: data
    };
  } catch (error) {
    console.error('Erro ao buscar dados do cliente:', error);
    return { 
      encontrado: false, 
      erro: error.message,
      cpf: cpf
    };
  }
}

/**
 * Função: Verificar propostas ativas
 */
async function verificarPropostas(cpf) {
  try {
    const clientData = await buscarDadosCliente(cpf);
    
    if (!clientData.encontrado) {
      return { 
        tem_propostas: false, 
        total: 0,
        cpf: cpf
      };
    }
    
    const propostasAtivas = clientData.propostas.filter(p => 
      ['aprovada', 'ativa', 'processando', 'etapa2', 'etapa3', 'etapa4', 'etapa5'].includes(p.status)
    );
    
    return {
      tem_propostas: propostasAtivas.length > 0,
      total: propostasAtivas.length,
      propostas: propostasAtivas.map(p => ({
        tipo: p.tipo || p.produto,
        valor: p.valor,
        parcelas: p.parcelas,
        status: p.status,
        data_aprovacao: p.dataAprovacao || p.data_aprovacao
      })),
      cpf: cpf
    };
  } catch (error) {
    console.error('Erro ao verificar propostas:', error);
    return { 
      tem_propostas: false, 
      erro: error.message,
      cpf: cpf
    };
  }
}

/**
 * Função: Simular portabilidade
 */
async function simularPortabilidade(valorAtual, parcelasRestantes) {
  try {
    const taxaMinima = 1.65;
    const trocoEstimado = valorAtual * 0.3; // 30% de troco
    const valorTotal = valorAtual + trocoEstimado;
    const novaParcela = valorTotal / parcelasRestantes;
    
    return {
      valor_atual: valorAtual,
      troco_estimado: trocoEstimado.toFixed(2),
      valor_total: valorTotal.toFixed(2),
      nova_parcela: novaParcela.toFixed(2),
      taxa_minima: taxaMinima,
      parcelas: parcelasRestantes,
      economia_mensal: (valorAtual / parcelasRestantes - novaParcela).toFixed(2)
    };
  } catch (error) {
    console.error('Erro ao simular portabilidade:', error);
    return { 
      erro: error.message,
      valor_atual: valorAtual,
      parcelas_restantes: parcelasRestantes
    };
  }
}

/**
 * Função: Simular FGTS
 */
async function simularFgts(saldoFgts) {
  try {
    const taxaMinima = 0.99;
    const valorDisponivel = saldoFgts * 0.8; // 80% disponível
    const parcelas = 24;
    const parcelaEstimada = valorDisponivel / parcelas;
    
    return {
      saldo_fgts: saldoFgts,
      valor_disponivel: valorDisponivel.toFixed(2),
      parcela_estimada: parcelaEstimada.toFixed(2),
      taxa_minima: taxaMinima,
      parcelas: parcelas,
      valor_total_financiado: valorDisponivel.toFixed(2)
    };
  } catch (error) {
    console.error('Erro ao simular FGTS:', error);
    return { 
      erro: error.message,
      saldo_fgts: saldoFgts
    };
  }
}

/**
 * Endpoint de teste para verificar se o handler está funcionando
 */
router.get('/agent-tools/test', async (req, res) => {
  try {
    // Teste básico
    const testResult = await buscarDadosCliente('12345678901');
    
    res.json({
      status: 'OK',
      message: 'Agent Builder Tools Handler funcionando',
      timestamp: new Date().toISOString(),
      teste: testResult
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Endpoint para listar todas as tools disponíveis
 */
router.get('/agent-tools/list', (req, res) => {
  res.json({
    tools_disponiveis: [
      {
        nome: 'buscar_dados_cliente',
        descricao: 'Busca dados completos do cliente no CRM',
        parametros: ['cpf']
      },
      {
        nome: 'verificar_propostas',
        descricao: 'Verifica propostas ativas do cliente',
        parametros: ['cpf']
      },
      {
        nome: 'simular_portabilidade',
        descricao: 'Simula valores para portabilidade',
        parametros: ['valor_atual', 'parcelas_restantes']
      },
      {
        nome: 'simular_fgts',
        descricao: 'Simula valores para saque FGTS',
        parametros: ['saldo_fgts']
      }
    ],
    endpoint: '/api/agent-tools',
    metodo: 'POST'
  });
});

export default router;

