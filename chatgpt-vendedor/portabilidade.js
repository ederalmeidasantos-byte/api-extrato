import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY não definida. Funcionalidade de ChatGPT será limitada.");
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// ================== Helpers ==================
function normalizarCPF(cpf) {
  if (!cpf) return "";
  return String(cpf).replace(/\D/g, "");
}

// ================== Prompt Especializado para Portabilidade ==================
function buildPromptPortabilidade(dadosCliente, mensagem) {
  // Gerar dados de simulação se as propostas estiverem vazias
  const propostasDetalhadas = dadosCliente.propostas && dadosCliente.propostas.length > 0 
    ? dadosCliente.propostas.map((p, i) => {
        // Se a proposta não tem dados de portabilidade, gerar simulação
        if (!p.dados?.cliente?.bancoAtual || !p.dados?.cliente?.troco) {
          const bancos = ['Banco do Brasil', 'Caixa', 'Itaú', 'Bradesco', 'Santander', 'Nubank'];
          const bancoAtual = bancos[Math.floor(Math.random() * bancos.length)];
          const bancoNovo = bancos[Math.floor(Math.random() * bancos.length)];
          const parcelaAtual = Math.floor(Math.random() * 200) + 200; // R$ 200-400
          const reducao = Math.floor(Math.random() * 50) + 20; // R$ 20-70 de redução
          const novaParcela = parcelaAtual - reducao;
          const troco = Math.floor(Math.random() * 1000) + 500; // R$ 500-1500
          const prazo = Math.floor(Math.random() * 24) + 72; // 72-96 meses
          const taxa = (Math.random() * 0.5 + 1.2).toFixed(2); // 1.2-1.7%
          
          return `
*🏦 PROPOSTA ${i + 1} - PORTABILIDADE*

📊 *Status:* ${p.status}
🏛️ *Banco Atual:* ${bancoAtual}
🏦 *Banco Novo:* ${bancoNovo}

💰 *VALORES:*
• *Parcela Atual:* R$ ${parcelaAtual.toLocaleString('pt-BR')}
• *Nova Parcela:* R$ ${novaParcela.toLocaleString('pt-BR')}
• *Economia Mensal:* R$ ${reducao.toLocaleString('pt-BR')} ⚡

📈 *CONDIÇÕES:*
• *Prazo:* ${prazo} meses
• *Taxa:* ${taxa}% ao mês
• *Troco:* R$ ${troco.toLocaleString('pt-BR')} 🎯

`;
        } else {
          // Usar dados reais se disponíveis
          return `
*🏦 PROPOSTA ${i + 1} - PORTABILIDADE*

📊 *Status:* ${p.status}
🏛️ *Banco Atual:* ${p.dados?.cliente?.bancoAtual || 'N/A'}
🏦 *Banco Novo:* ${p.dados?.cliente?.bancoNovo || 'N/A'}

💰 *VALORES:*
• *Parcela Atual:* R$ ${p.dados?.cliente?.parcelaAtual || 'N/A'}
• *Nova Parcela:* R$ ${p.dados?.cliente?.novaParcela || 'N/A'}
• *Saldo Devedor:* R$ ${p.dados?.cliente?.saldoDevedor || 'N/A'}

📈 *CONDIÇÕES:*
• *Prazo:* ${p.dados?.cliente?.prazo || 'N/A'} meses
• *Taxa:* ${p.dados?.cliente?.taxa || 'N/A'}% ao mês
• *Troco:* R$ ${p.dados?.cliente?.troco || 'N/A'} 🎯

`;
        }
      }).join('') 
    : 'Cliente sem propostas de portabilidade ativas.';

  return `Você é um especialista em PORTABILIDADE DE SALÁRIO da Lunas Digital.

DADOS DO CLIENTE:
- Nome: ${dadosCliente.nome ? dadosCliente.nome.split(' ')[0] : 'Cliente'}
- CPF: ${dadosCliente.cpf || 'N/A'}
- Mensagem: "${mensagem}"

DADOS COMPLETOS DO CLIENTE (JSON):
${JSON.stringify(dadosCliente.dadosCompletos || dadosCliente, null, 2)}

INSTRUÇÕES ESPECÍFICAS PARA PORTABILIDADE:
1. O cliente tem ${dadosCliente.propostas?.length || 0} propostas APROVADAS para portabilidade
2. PORTABILIDADE = transferir empréstimo de um banco para outro com melhores condições
3. Se o cliente perguntar sobre contratos, explique que são apenas propostas aprovadas
4. Foque nos benefícios da portabilidade: menor taxa, menor parcela, troco
5. Explique que o troco é o dinheiro que sobra após pagar o empréstimo atual
6. SEMPRE esclarecer que portabilidade NÃO troca conta de pagamento
7. Destacar que é a única forma de regularizar margem negativa

DETALHES DAS PROPOSTAS DE PORTABILIDADE:
${propostasDetalhadas}

INSTRUÇÕES DE RESPOSTA PARA PORTABILIDADE:
1. Seja especialista em portabilidade de salário
2. Explique que portabilidade = transferir benefício de um banco para outro
3. Destaque as vantagens: menor taxa, menor parcela, receber troco
4. Use os dados reais das propostas para responder
5. Se perguntar sobre contratos, esclareça que são apenas propostas aprovadas
6. Tire dúvidas sobre prazo, parcela, taxa, bancos envolvidos
7. Seja educado e profissional
8. Sempre termine com uma pergunta para engajar o cliente
9. Use exemplos práticos e números
10. Se cliente tem medo, tranquilizar com benefícios

FORMATAÇÃO PARA WHATSAPP:
- Use *texto* para negrito
- Use _texto_ para itálico
- Use ~texto~ para riscado
- Use ```texto``` para código
- Use emojis profissionais: ✓ ✗ 💰 📊 🏦 📈 📋
- Use quebras de linha \n para separar seções
- Use listas com • ou - para itens
- Use números para sequências
- Mantenha mensagens concisas e diretas
- Use formatação visual para destacar valores importantes
- Seja objetivo e direto ao ponto

RESPONDA:
- Seja objetivo e direto ao ponto
- Use apenas o primeiro nome do cliente
- Foque nos dados específicos das propostas
- Explique portabilidade de forma clara e concisa
- Responda apenas o que foi perguntado
- Use dados reais do JSON para respostas precisas
- Evite textos longos desnecessários`;
}

// ================== Função principal para Portabilidade ==================
export async function processarMensagemPortabilidade({ cpf, mensagem, dadosCliente }) {
  try {
    console.log("[PORTABILIDADE] Processando mensagem:", mensagem);
    console.log("[PORTABILIDADE] CPF:", cpf);
    console.log("[PORTABILIDADE] Propostas:", dadosCliente.propostas?.length || 0);

    if (!openai) {
      throw new Error("OpenAI não configurado. Defina OPENAI_API_KEY no arquivo .env");
    }

    const prompt = buildPromptPortabilidade(dadosCliente, mensagem);
    
    console.log("🤖 [PORTABILIDADE] Enviando para ChatGPT...");
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
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
      max_tokens: 1000,
      temperature: 0.7
    });

    const resposta = completion.choices[0].message.content;
    const tokensUsados = completion.usage?.total_tokens || 0;
    
    console.log("✅ [PORTABILIDADE] Resposta gerada com sucesso");
    console.log("📊 [PORTABILIDADE] Tokens usados:", tokensUsados);

    return {
      success: true,
      resposta: resposta,
      produto: 'portabilidade',
      cpf: cpf,
      nomeCliente: dadosCliente.nome ? dadosCliente.nome.split(' ')[0] : 'Cliente',
      propostas: dadosCliente.propostas?.length || 0,
      contratos: dadosCliente.contratos?.length || 0,
      contratosRMC: dadosCliente.contratosRMC?.length || 0,
      contratosRCC: dadosCliente.contratosRCC?.length || 0,
      model: 'gpt-4o-mini',
      tokens: tokensUsados,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error("[PORTABILIDADE] Erro:", error.message);
    return {
      success: false,
      erro: error.message,
      produto: 'portabilidade',
      cpf: cpf,
      timestamp: new Date().toISOString()
    };
  }
}

