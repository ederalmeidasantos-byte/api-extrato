const OpenAI = require('openai');
const fs = require('fs-extra');
const path = require('path');
const { extrairDeUpload } = require('../../INSS/extrair_pdf.js');

class ChatGPTVendedor {
  constructor(config) {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
    this.config = config;
    this.conversasPath = path.join(__dirname, '../data/conversas');
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.conversasPath)) {
      fs.mkdirSync(this.conversasPath, { recursive: true });
    }
  }

  async processarMensagem({ chatId, clientNumber, message, classification }) {
    try {
      // Carregar contexto da conversa
      const contexto = await this.carregarContexto(chatId, clientNumber);
      
      // Buscar dados do cliente no CRM
      const dadosCliente = await this.buscarDadosCliente(clientNumber);
      
      // Gerar resposta com ChatGPT
      const resposta = await this.gerarResposta({
        mensagem: message,
        contexto,
        dadosCliente,
        classification
      });
      
      // Salvar conversa
      await this.salvarConversa(chatId, clientNumber, message, resposta);
      
      return resposta;
      
    } catch (error) {
      console.error('❌ [CHATGPT] Erro ao processar mensagem:', error);
      return {
        texto: 'Desculpe, ocorreu um erro. Vou transferir você para um atendente.',
        botoes: null,
        tipoMensagem: 'falar_com_atendente',
        enviarResposta: true
      };
    }
  }

  async carregarContexto(chatId, clientNumber) {
    const arquivoContexto = path.join(this.conversasPath, `${chatId}.json`);
    
    if (fs.existsSync(arquivoContexto)) {
      const contexto = await fs.readJson(arquivoContexto);
      return contexto;
    }
    
    return {
      chatId,
      clientNumber,
      historico: [],
      dadosCliente: null,
      statusNegociacao: 'inicial',
      ultimaAtualizacao: new Date().toISOString()
    };
  }

  async salvarConversa(chatId, clientNumber, mensagem, resposta) {
    const arquivoContexto = path.join(this.conversasPath, `${chatId}.json`);
    
    let contexto = await this.carregarContexto(chatId, clientNumber);
    
    // Adicionar nova interação ao histórico
    contexto.historico.push({
      timestamp: new Date().toISOString(),
      tipo: 'cliente',
      mensagem: mensagem
    });
    
    contexto.historico.push({
      timestamp: new Date().toISOString(),
      tipo: 'vendedor',
      mensagem: resposta.texto,
      tipoMensagem: resposta.tipoMensagem
    });
    
    // Manter apenas as últimas 20 interações
    if (contexto.historico.length > 20) {
      contexto.historico = contexto.historico.slice(-20);
    }
    
    contexto.ultimaAtualizacao = new Date().toISOString();
    
    await fs.writeJson(arquivoContexto, contexto, { spaces: 2 });
  }

  async buscarDadosCliente(clientNumber) {
    try {
      // Buscar dados do cliente no CRM
      const cpfLimpo = clientNumber.replace(/\D/g, '');
      let dadosCliente = null;
      
      // Primeiro tentar buscar pelo CPF
      let clientePath = `var/data/clientes/${cpfLimpo}.json`;
      
      if (fs.existsSync(clientePath)) {
        dadosCliente = await fs.readJson(clientePath);
        console.log(`📋 [CHATGPT] Dados do cliente encontrados por CPF: ${dadosCliente.nome || 'N/A'}`);
      } else {
        // Se não encontrar pelo CPF, buscar em todos os arquivos
        console.log(`❌ [CHATGPT] Arquivo não encontrado por CPF, buscando em todos os arquivos...`);
        
        const clientesDir = 'var/data/clientes';
        if (fs.existsSync(clientesDir)) {
          const arquivos = fs.readdirSync(clientesDir).filter(arquivo => arquivo.endsWith('.json'));
          
          for (const arquivo of arquivos) {
            const caminhoCompleto = `${clientesDir}/${arquivo}`;
            const clienteData = await fs.readJson(caminhoCompleto);
            
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
          numero: clientNumber,
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
          numero: clientNumber,
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
        numero: clientNumber,
        nome: 'Cliente',
        cpf: null,
        propostas: [],
        contratos: [],
        contratosRMC: [],
        contratosRCC: [],
        margem: null,
        status: 'ativo'
      };
    }
  }

  // Método para processar PDF usando a mesma lógica do INSS
  async processarPDF(pdfPath, cpf, idoportunidade = null) {
    try {
      console.log(`📄 [CHATGPT] Processando PDF: ${pdfPath}`);
      console.log(`👤 [CHATGPT] CPF: ${cpf}`);
      console.log(`🎯 [CHATGPT] ID Oportunidade: ${idoportunidade}`);
      
      // Usar a mesma função de extração do INSS
      const dadosExtrato = await extrairDeUpload({
        fileId: Date.now().toString(), // ID único para o arquivo
        pdfPath: pdfPath,
        jsonDir: 'var/data/extratos',
        ttlMs: 14 * 24 * 60 * 60 * 1000, // 14 dias
        idoportunidade: idoportunidade
      });
      
      console.log(`✅ [CHATGPT] PDF processado com sucesso`);
      console.log(`📊 [CHATGPT] Contratos encontrados: ${dadosExtrato.contratos?.length || 0}`);
      console.log(`📊 [CHATGPT] Contratos RMC: ${dadosExtrato.contratos_rmc?.length || 0}`);
      console.log(`📊 [CHATGPT] Contratos RCC: ${dadosExtrato.contratos_rcc?.length || 0}`);
      
      return dadosExtrato;
      
    } catch (error) {
      console.error('❌ [CHATGPT] Erro ao processar PDF:', error.message);
      throw error;
    }
  }

  async gerarResposta({ mensagem, contexto, dadosCliente, classification }) {
    const prompt = this.construirPrompt(mensagem, contexto, dadosCliente, classification);
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: prompt
          },
          {
            role: "user",
            content: mensagem
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      });
      
      const respostaTexto = completion.choices[0].message.content;
      
      // Processar resposta para extrair tipoMensagem e botões
      return this.processarRespostaChatGPT(respostaTexto, classification);
      
    } catch (error) {
      console.error('❌ [OPENAI] Erro:', error);
      throw error;
    }
  }

  construirPrompt(mensagem, contexto, dadosCliente, classification) {
    const propostasDetalhadas = dadosCliente.propostas && dadosCliente.propostas.length > 0 
      ? dadosCliente.propostas.map((p, i) => `
PROPOSTA ${i + 1}:
- Status: ${p.status}
- Banco Atual: ${p.dados?.cliente?.bancoAtual || 'N/A'}
- Banco Novo: ${p.dados?.cliente?.bancoNovo || 'N/A'}
- Parcela Atual: R$ ${p.dados?.cliente?.parcelaAtual || 'N/A'}
- Nova Parcela: R$ ${p.dados?.cliente?.novaParcela || 'N/A'}
- Prazo: ${p.dados?.cliente?.prazo || 'N/A'} meses
- Taxa: ${p.dados?.cliente?.taxa || 'N/A'}% ao mês
- Troco: R$ ${p.dados?.cliente?.troco || 'N/A'}
- Saldo Devedor: R$ ${p.dados?.cliente?.saldoDevedor || 'N/A'}
`).join('') 
      : 'Cliente sem propostas ativas.';

    return `Você é um vendedor especializado em empréstimo consignado e portabilidade de salário da Lunas Digital.

DADOS DO CLIENTE:
- Nome: ${dadosCliente.nome || 'Cliente'}
- CPF: ${dadosCliente.cpf || 'N/A'}
- Número: ${dadosCliente.numero}
- Status: ${dadosCliente.status || 'ativo'}

DADOS COMPLETOS DO CLIENTE (JSON):
${JSON.stringify(dadosCliente.dadosCompletos || dadosCliente, null, 2)}

INSTRUÇÕES IMPORTANTES:
1. O cliente tem ${dadosCliente.propostas?.length || 0} propostas APROVADAS para portabilidade
2. Se o cliente perguntar sobre contratos, explique que ele ainda NÃO aprovou contratos - apenas propostas
3. As propostas contêm todos os detalhes: banco atual, banco novo, parcela atual, nova parcela, prazo, taxa, troco
4. Responda com detalhes específicos das propostas quando o cliente perguntar

DETALHES DAS PROPOSTAS:
${propostasDetalhadas}

CLASSIFICAÇÃO DA MENSAGEM:
- Produto: ${classification.produto}
- Intenção: ${classification.intencao}
- Sentimento: ${classification.sentimento}

HISTÓRICO DA CONVERSA:
${contexto.historico.slice(-5).map(h => `${h.tipo}: ${h.mensagem}`).join('\n')}

INSTRUÇÕES DE RESPOSTA:
1. Seja sempre educado e profissional
2. Use os dados reais das propostas para responder
3. Explique sobre portabilidade: transferir benefício de um banco para outro
4. Se perguntar sobre contratos, esclareça que são apenas propostas aprovadas
5. Tire dúvidas sobre prazo, parcela, taxa, bancos envolvidos
6. Use linguagem clara e objetiva
7. Se não souber responder, sugira falar com um atendente
8. Sempre termine com uma pergunta para engajar o cliente

FORMATO DA RESPOSTA:
Responda apenas com o texto da mensagem. No final, adicione uma linha com:
TIPO_MENSAGEM: [cliente_com_duvida|cliente_sem_duvida|falar_com_atendente|nao_consigo_responder|limite_respostas]

BOTÕES (se aplicável):
Se a resposta for uma proposta, termine com:
BOTOES: [texto1,texto2,texto3]`;
  }

  processarRespostaChatGPT(respostaTexto, classification) {
    // Extrair tipoMensagem
    const tipoMatch = respostaTexto.match(/TIPO_MENSAGEM:\s*(\w+)/);
    const tipoMensagem = tipoMatch ? tipoMatch[1] : 'cliente_com_duvida';
    
    // Extrair botões
    const botoesMatch = respostaTexto.match(/BOTOES:\s*\[([^\]]+)\]/);
    let botoes = null;
    if (botoesMatch) {
      const botoesTexto = botoesMatch[1].split(',').map(b => b.trim());
      botoes = botoesTexto.map((texto, index) => ({
        text: texto,
        id: (index + 1).toString()
      }));
    }
    
    // Limpar resposta (remover linhas de comando)
    const textoLimpo = respostaTexto
      .replace(/TIPO_MENSAGEM:\s*\w+/g, '')
      .replace(/BOTOES:\s*\[[^\]]+\]/g, '')
      .trim();
    
    return {
      texto: textoLimpo,
      botoes,
      tipoMensagem,
      enviarResposta: true
    };
  }
}

module.exports = ChatGPTVendedor;

