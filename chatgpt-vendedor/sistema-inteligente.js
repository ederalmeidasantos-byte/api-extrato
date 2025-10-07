import { sistemaFAQInteligente } from './sistema-faq-inteligente.js';
import { sistemaPerfis } from './sistema-perfis.js';
import OpenAI from 'openai';
import fs from 'fs';
import fsp from 'fs/promises';

// ================== SISTEMA INTELIGENTE DE RESPOSTAS ==================

class SistemaInteligente {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    this.estatisticas = {
      respostasFAQ: 0,
      respostasChatGPT: 0,
      totalTokens: 0,
      economiaTokens: 0
    };
  }

  // Função para buscar dados do cliente
  async buscarDadosCliente(cpf) {
    try {
      const cpfLimpo = cpf.replace(/\D/g, '');
      let dadosCliente = null;
      
      // Primeiro tentar buscar pelo CPF
      let clientePath = `var/data/clientes/${cpfLimpo}.json`;
      
      if (fs.existsSync(clientePath)) {
        dadosCliente = JSON.parse(await fsp.readFile(clientePath, 'utf8'));
        console.log(`📋 [SISTEMA-INTELIGENTE] Dados do cliente encontrados por CPF: ${dadosCliente.nome || 'N/A'}`);
      } else {
        // Se não encontrar pelo CPF, buscar em todos os arquivos
        console.log(`❌ [SISTEMA-INTELIGENTE] Arquivo não encontrado por CPF, buscando em todos os arquivos...`);
        
        const clientesDir = 'var/data/clientes';
        const arquivos = fs.readdirSync(clientesDir).filter(arquivo => arquivo.endsWith('.json'));
        
        for (const arquivo of arquivos) {
          const caminhoCompleto = `${clientesDir}/${arquivo}`;
          const clienteData = JSON.parse(await fsp.readFile(caminhoCompleto, 'utf8'));
          
          if (clienteData.dadosCompletos?.cpf === cpfLimpo || clienteData.cpf === cpfLimpo) {
            dadosCliente = clienteData;
            console.log(`📋 [SISTEMA-INTELIGENTE] Dados do cliente encontrados em: ${arquivo}`);
            break;
          }
        }
      }
      
      if (dadosCliente) {
        console.log(`📋 [SISTEMA-INTELIGENTE] Dados do cliente encontrados: ${dadosCliente.nome || dadosCliente.dadosCompletos?.nome || 'N/A'}`);
        console.log(`📊 [SISTEMA-INTELIGENTE] Propostas: ${dadosCliente.propostas?.length || 0}`);
        console.log(`📊 [SISTEMA-INTELIGENTE] Contratos: ${dadosCliente.contratos?.length || 0}`);
        console.log(`📊 [SISTEMA-INTELIGENTE] Contratos RMC: ${dadosCliente.contratosRMC?.length || 0}`);
        console.log(`📊 [SISTEMA-INTELIGENTE] Contratos RCC: ${dadosCliente.contratosRCC?.length || 0}`);
      } else {
        console.log(`❌ [SISTEMA-INTELIGENTE] Cliente não encontrado em nenhum arquivo`);
      }
      
      return dadosCliente;
    } catch (error) {
      console.log('⚠️ [SISTEMA-INTELIGENTE] Erro ao buscar cliente:', error.message);
      return null;
    }
  }

  // Função principal para processar mensagem
  async processarMensagem({ cpf, mensagem, dadosCliente, produto = 'portabilidade' }) {
    try {
      console.log(`[SISTEMA-INTELIGENTE] Processando: "${mensagem}"`);
      console.log(`[SISTEMA-INTELIGENTE] CPF: ${cpf}`);
      
      // Se não foram fornecidos dados do cliente, buscar automaticamente
      if (!dadosCliente) {
        dadosCliente = await this.buscarDadosCliente(cpf);
      }
      
      console.log(`[SISTEMA-INTELIGENTE] Propostas: ${dadosCliente?.propostas?.length || 0}`);

      // Se cliente não foi encontrado, responder com FAQ genérico
      if (!dadosCliente) {
        console.log(`[SISTEMA-INTELIGENTE] Cliente não encontrado, usando FAQ genérico`);
        const analiseFAQ = sistemaFAQInteligente.analisarMensagem(mensagem, { propostas: [] });
        
        if (analiseFAQ.responderAutomaticamente) {
          return {
            success: true,
            resposta: analiseFAQ.resposta,
            produto: produto,
            cpf: cpf,
            nomeCliente: 'Cliente',
            propostas: 0,
            contratos: 0,
            contratosRMC: 0,
            contratosRCC: 0,
            model: 'faq-inteligente',
            tokens: 0,
            categoria: analiseFAQ.categoria,
            confianca: analiseFAQ.confianca,
            timestamp: new Date().toISOString()
          };
        } else {
          return {
            success: true,
            resposta: "Desculpe, não encontrei seus dados no sistema. Para consultar suas propostas, preciso que você forneça seu CPF correto ou entre em contato com nosso atendimento.",
            produto: produto,
            cpf: cpf,
            nomeCliente: 'Cliente',
            propostas: 0,
            contratos: 0,
            contratosRMC: 0,
            contratosRCC: 0,
            model: 'faq-generico',
            tokens: 0,
            categoria: 'cliente_nao_encontrado',
            confianca: 1.0,
            timestamp: new Date().toISOString()
          };
        }
      }

      // 1. Tentar responder com FAQ inteligente primeiro
      const analiseFAQ = sistemaFAQInteligente.analisarMensagem(mensagem, dadosCliente);
      
      if (analiseFAQ.responderAutomaticamente) {
        console.log(`[SISTEMA-INTELIGENTE] Resposta FAQ (${analiseFAQ.categoria} - ${(analiseFAQ.confianca * 100).toFixed(1)}%)`);
        this.estatisticas.respostasFAQ++;
        
        return {
          success: true,
          resposta: analiseFAQ.resposta,
          produto: produto,
          cpf: cpf,
          nomeCliente: dadosCliente.nome ? dadosCliente.nome.split(' ')[0] : 'Cliente',
          propostas: dadosCliente.propostas?.length || 0,
          contratos: dadosCliente.contratos?.length || 0,
          contratosRMC: dadosCliente.contratosRMC?.length || 0,
          contratosRCC: dadosCliente.contratosRCC?.length || 0,
          model: 'faq-inteligente',
          tokens: 0,
          categoria: analiseFAQ.categoria,
          confianca: analiseFAQ.confianca,
          timestamp: new Date().toISOString()
        };
      }

      // 2. Se FAQ não conseguir responder, usar ChatGPT
      console.log(`[SISTEMA-INTELIGENTE] FAQ não conseguiu responder, usando ChatGPT`);
      
      if (!this.openai) {
        throw new Error("OpenAI não configurado. Defina OPENAI_API_KEY no arquivo .env");
      }

      // Detectar perfil e construir prompt
      const perfilDetectado = sistemaPerfis.detectarPerfil(dadosCliente);
      const prompt = sistemaPerfis.construirPromptPerfil(perfilDetectado, dadosCliente, mensagem);

      // Chamar ChatGPT
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Você é um profissional da Lunas Digital especializado em portabilidade de consignado. Seja humanizado, natural e profissional. Não use emojis. Seja educado e respeitoso."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.5
      });

      const resposta = completion.choices[0].message.content;
      const tokensUsados = completion.usage?.total_tokens || 0;
      
      console.log(`[SISTEMA-INTELIGENTE] Resposta ChatGPT gerada (${tokensUsados} tokens)`);
      this.estatisticas.respostasChatGPT++;
      this.estatisticas.totalTokens += tokensUsados;

      return {
        success: true,
        resposta: resposta,
        produto: produto,
        cpf: cpf,
        nomeCliente: dadosCliente.nome ? dadosCliente.nome.split(' ')[0] : 'Cliente',
        propostas: dadosCliente.propostas?.length || 0,
        contratos: dadosCliente.contratos?.length || 0,
        contratosRMC: dadosCliente.contratosRMC?.length || 0,
        contratosRCC: dadosCliente.contratosRCC?.length || 0,
        model: 'gpt-4o-mini',
        tokens: tokensUsados,
        perfil: perfilDetectado,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`[SISTEMA-INTELIGENTE] Erro:`, error.message);
      return {
        success: false,
        erro: error.message,
        produto: produto,
        cpf: cpf,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Função para obter estatísticas
  obterEstatisticas() {
    const totalRespostas = this.estatisticas.respostasFAQ + this.estatisticas.respostasChatGPT;
    const percentualFAQ = totalRespostas > 0 ? (this.estatisticas.respostasFAQ / totalRespostas * 100).toFixed(1) : 0;
    const percentualChatGPT = totalRespostas > 0 ? (this.estatisticas.respostasChatGPT / totalRespostas * 100).toFixed(1) : 0;
    
    return {
      ...this.estatisticas,
      totalRespostas,
      percentualFAQ: `${percentualFAQ}%`,
      percentualChatGPT: `${percentualChatGPT}%`,
      economiaEstimada: this.estatisticas.respostasFAQ * 500, // Estimativa de 500 tokens economizados por FAQ
      custoEconomizado: (this.estatisticas.respostasFAQ * 500 * 0.0005 / 1000).toFixed(6)
    };
  }

  // Função para resetar estatísticas
  resetarEstatisticas() {
    this.estatisticas = {
      respostasFAQ: 0,
      respostasChatGPT: 0,
      totalTokens: 0,
      economiaTokens: 0
    };
  }

  // Função para adicionar nova pergunta ao FAQ
  adicionarPerguntaFAQ(categoria, pergunta, resposta) {
    sistemaFAQInteligente.adicionarPergunta(categoria, pergunta, resposta);
  }

  // Função para ajustar confiança mínima
  ajustarConfiancaMinima(novaConfianca) {
    sistemaFAQInteligente.confiancaMinima = novaConfianca;
  }
}

export const sistemaInteligente = new SistemaInteligente();

// Exportar função principal para compatibilidade
export const processarMensagem = (dados) => sistemaInteligente.processarMensagem(dados);
