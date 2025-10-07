import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { processarMensagemPortabilidade } from "./portabilidade.js";
import { processarMensagemFGTS } from "./fgts.js";

// ================== Buscar dados do cliente ==================
async function buscarDadosCliente(cpf) {
  try {
    const cpfLimpo = cpf.replace(/\D/g, '');
    let dadosCliente = null;
    
    // Primeiro tentar buscar pelo CPF
    let clientePath = `var/data/clientes/${cpfLimpo}.json`;
    
    if (fs.existsSync(clientePath)) {
      dadosCliente = JSON.parse(await fsp.readFile(clientePath, 'utf8'));
      console.log(`📋 [CHATGPT] Dados do cliente encontrados por CPF: ${dadosCliente.nome || 'N/A'}`);
    } else {
      // Se não encontrar pelo CPF, buscar em todos os arquivos
      console.log(`❌ [CHATGPT] Arquivo não encontrado por CPF, buscando em todos os arquivos...`);
      
      const clientesDir = 'var/data/clientes';
      if (fs.existsSync(clientesDir)) {
        const arquivos = fs.readdirSync(clientesDir).filter(arquivo => arquivo.endsWith('.json'));
        
        for (const arquivo of arquivos) {
          const caminhoCompleto = `${clientesDir}/${arquivo}`;
          const clienteData = JSON.parse(await fsp.readFile(caminhoCompleto, 'utf8'));
          
          // Verificar se o CPF do cliente corresponde
          if (clienteData.dadosCompletos?.cpf === cpfLimpo || 
              clienteData.cpf === cpfLimpo ||
              (clienteData.propostas && clienteData.propostas.some(p => p.dados?.cliente?.cpf === cpfLimpo))) {
            dadosCliente = clienteData;
            console.log(`📋 [CHATGPT] Dados do cliente encontrados em: ${arquivo}`);
            break;
          }
        }
      }
    }
    
    if (dadosCliente) {
      return {
        nome: dadosCliente.nome || dadosCliente.dadosCompletos?.nome || 'Cliente',
        cpf: cpfLimpo,
        propostas: dadosCliente.propostas || [],
        contratos: dadosCliente.contratos || [],
        contratosRMC: dadosCliente.contratosRMC || [],
        contratosRCC: dadosCliente.contratosRCC || [],
        margem: dadosCliente.margem || null,
        status: 'ativo',
        dadosCompletos: dadosCliente
      };
    } else {
      console.log(`❌ [CHATGPT] Cliente não encontrado em nenhum arquivo`);
      return {
        nome: 'Cliente',
        cpf: cpfLimpo,
        propostas: [],
        contratos: [],
        contratosRMC: [],
        contratosRCC: [],
        margem: null,
        status: 'ativo'
      };
    }
  } catch (error) {
    console.error('⚠️ [CHATGPT] Erro ao buscar cliente:', error.message);
    return {
      nome: 'Cliente',
      cpf: cpf.replace(/\D/g, ''),
      propostas: [],
      contratos: [],
      contratosRMC: [],
      contratosRCC: [],
      margem: null,
      status: 'ativo'
    };
  }
}

// ================== Classificar mensagem ==================
function classificarMensagem(mensagem) {
  const msg = mensagem.toLowerCase();
  
  // Palavras-chave para FGTS
  const palavrasFGTS = ['fgts', 'fundo de garantia', 'saque', 'conta inativa', 'conta ativa', 'trabalhador'];
  
  // Palavras-chave para Portabilidade
  const palavrasPortabilidade = ['portabilidade', 'trocar banco', 'mudar banco', 'troco', 'reduzir parcela', 'margem negativa'];
  
  // Contar ocorrências
  const countFGTS = palavrasFGTS.filter(palavra => msg.includes(palavra)).length;
  const countPortabilidade = palavrasPortabilidade.filter(palavra => msg.includes(palavra)).length;
  
  if (countFGTS > countPortabilidade) {
    return 'fgts';
  } else if (countPortabilidade > countFGTS) {
    return 'portabilidade';
  } else {
    // Se empate ou nenhuma palavra-chave, usar portabilidade como padrão
    return 'portabilidade';
  }
}

// ================== Função principal ==================
export async function processarMensagemChatGPT({ cpf, mensagem, produto = null }) {
  try {
    console.log(`[CHATGPT] Processando mensagem: "${mensagem}"`);
    console.log(`[CHATGPT] CPF: ${cpf}`);
    
    // Buscar dados do cliente
    const dadosCliente = await buscarDadosCliente(cpf);
    
    // Classificar mensagem se produto não especificado
    const produtoClassificado = produto || classificarMensagem(mensagem);
    console.log(`[CHATGPT] Produto classificado: ${produtoClassificado}`);
    
    // Processar com o assistente especializado
    let resultado;
    
    if (produtoClassificado === 'fgts') {
      resultado = await processarMensagemFGTS({
        cpf: cpf,
        mensagem: mensagem,
        dadosCliente: dadosCliente
      });
    } else {
      // Padrão: portabilidade
      resultado = await processarMensagemPortabilidade({
        cpf: cpf,
        mensagem: mensagem,
        dadosCliente: dadosCliente
      });
    }
    
    // Adicionar metadados
    resultado.metadata = {
      temPropostas: dadosCliente.propostas.length > 0,
      temContratos: dadosCliente.contratos.length > 0,
      temContratosRMC: dadosCliente.contratosRMC.length > 0,
      temContratosRCC: dadosCliente.contratosRCC.length > 0,
      totalPropostas: dadosCliente.propostas.length,
      totalContratos: dadosCliente.contratos.length,
      totalContratosRMC: dadosCliente.contratosRMC.length,
      totalContratosRCC: dadosCliente.contratosRCC.length,
      produtoClassificado: produtoClassificado,
      apiKeyConfigurada: !!process.env.OPENAI_API_KEY
    };
    
    return resultado;
    
  } catch (error) {
    console.error('[CHATGPT] Erro geral:', error.message);
    return {
      success: false,
      erro: error.message,
      cpf: cpf,
      timestamp: new Date().toISOString()
    };
  }
}

