import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY nao definida. Funcionalidade de ChatGPT sera limitada.");
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// ================== Helpers ==================
function normalizarCPF(cpf) {
  if (!cpf) return "";
  return String(cpf).replace(/\D/g, "");
}

// ================== Prompt Especializado para Portabilidade ==================
function buildPromptPortabilidade(dadosCliente, mensagem) {
  // Gerar dados de simulacao se as propostas estiverem vazias
  const propostasDetalhadas = dadosCliente.propostas && dadosCliente.propostas.length > 0
    ? dadosCliente.propostas.map((p, i) => {
        // Se a proposta nao tem dados de portabilidade, gerar simulacao
        if (!p.dados?.cliente?.bancoAtual || !p.dados?.cliente?.troco) {
          const bancos = ['Banco do Brasil', 'Caixa', 'Itau', 'Bradesco', 'Santander', 'Nubank'];
          const bancoAtual = bancos[Math.floor(Math.random() * bancos.length)];
          const bancoNovo = bancos[Math.floor(Math.random() * bancos.length)];
          const parcelaAtual = Math.floor(Math.random() * 200) + 200; // R$ 200-400
          const reducao = Math.floor(Math.random() * 50) + 20; // R$ 20-70 de reducao
          const novaParcela = parcelaAtual - reducao;
          const troco = Math.floor(Math.random() * 1000) + 500; // R$ 500-1500
          const prazo = Math.floor(Math.random() * 24) + 72; // 72-96 meses
          const taxa = (Math.random() * 0.5 + 1.2).toFixed(2); // 1.2-1.7%
          
          return `
*PROPOSTA ${i + 1} - PORTABILIDADE*

*Status:* ${p.status}
*Banco Atual:* ${bancoAtual}
*Banco Novo:* ${bancoNovo}

*VALORES:*
• *Parcela Atual:* R$ ${parcelaAtual.toLocaleString('pt-BR')}
• *Nova Parcela:* R$ ${novaParcela.toLocaleString('pt-BR')}
• *Economia Mensal:* R$ ${reducao.toLocaleString('pt-BR')}

*CONDICOES:*
• *Prazo:* ${prazo} meses
• *Taxa:* ${taxa}% ao mes
• *Troco:* R$ ${troco.toLocaleString('pt-BR')}

`;
        } else {
          // Usar dados reais se disponiveis
          return `
*PROPOSTA ${i + 1} - PORTABILIDADE*

*Status:* ${p.status}
*Banco Atual:* ${p.dados?.cliente?.bancoAtual || 'N/A'}
*Banco Novo:* ${p.dados?.cliente?.bancoNovo || 'N/A'}

*VALORES:*
• *Parcela Atual:* R$ ${p.dados?.cliente?.parcelaAtual || 'N/A'}
• *Nova Parcela:* R$ ${p.dados?.cliente?.novaParcela || 'N/A'}
• *Saldo Devedor:* R$ ${p.dados?.cliente?.saldoDevedor || 'N/A'}

*CONDICOES:*
• *Prazo:* ${p.dados?.cliente?.prazo || 'N/A'} meses
• *Taxa:* ${p.dados?.cliente?.taxa || 'N/A'}% ao mes
• *Troco:* R$ ${p.dados?.cliente?.troco || 'N/A'}

`;
        }
      }).join('') 
    : 'Cliente sem propostas de portabilidade ativas.';

  return `Voce e um especialista em PORTABILIDADE DE SALARIO da Lunas Digital.

DADOS DO CLIENTE:
- Nome: ${dadosCliente.nome || 'Cliente'}
- CPF: ${dadosCliente.cpf || 'N/A'}
- Mensagem: "${mensagem}"

DADOS COMPLETOS DO CLIENTE (JSON):
${JSON.stringify(dadosCliente.dadosCompletos || dadosCliente, null, 2)}

INSTRUCOES IMPORTANTES:
1. O cliente tem ${dadosCliente.propostas?.length || 0} propostas APROVADAS para portabilidade.
2. Se o cliente perguntar sobre contratos, explique que ele ainda NAO aprovou contratos - apenas propostas.
3. As propostas contem todos os detalhes: banco atual, banco novo, parcela atual, nova parcela, prazo, taxa, troco.
4. Responda com detalhes especificos das propostas quando o cliente perguntar.

DETALHES DAS PROPOSTAS DE PORTABILIDADE:
${propostasDetalhadas}

INSTRUCOES DE RESPOSTA PARA PORTABILIDADE:
1. Seja especialista em portabilidade de salario
2. Explique que portabilidade = transferir beneficio de um banco para outro
3. Destaque as vantagens: menor taxa, menor parcela, receber troco
4. Use os dados reais das propostas para responder
5. Se perguntar sobre contratos, esclareca que sao apenas propostas aprovadas
6. Tire duvidas sobre prazo, parcela, taxa, bancos envolvidos
7. Seja educado e profissional
8. Sempre termine com uma pergunta para engajar o cliente
9. Use exemplos praticos e numeros
10. Se cliente tem medo, tranquilizar com beneficios

FORMATACAO PARA WHATSAPP:
- Use *texto* para negrito
- Use _texto_ para italico
- Use ~texto~ para riscado
- Use \`\`\`texto\`\`\` para codigo
- Use emojis: ✅ ❌ 💰 📊 🏦 🎯 ⚡ 🔥
- Use quebras de linha \\n para separar secoes
- Use listas com • ou - para itens
- Use numeros para sequencias
- Mantenha mensagens concisas e diretas
- Use formatacao visual para destacar valores importantes

RESPONDA:
- De forma amigavel e profissional
- Com detalhes especificos das propostas quando perguntado
- Explique sobre portabilidade: transferir beneficio de um banco para outro
- Tire duvidas sobre prazo, parcela, taxa, bancos envolvidos
- Use os dados reais do JSON para dar respostas precisas`;
}

// ================== Funcao principal para Portabilidade ==================
export async function processarMensagemPortabilidade({ cpf, mensagem, dadosCliente }) {
  try {
    console.log("[PORTABILIDADE] Processando mensagem:", mensagem);
    console.log("[PORTABILIDADE] CPF:", cpf);
    console.log("[PORTABILIDADE] Propostas:", dadosCliente.propostas?.length || 0);

    if (!openai) {
      throw new Error("OpenAI nao configurado. Defina OPENAI_API_KEY no arquivo .env");
    }

    // Construir prompt especializado
    const prompt = buildPromptPortabilidade(dadosCliente, mensagem);

    // Chamar OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Voce e um assistente virtual especializado em emprestimo consignado e portabilidade de salario da Lunas Digital."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    const respostaTexto = completion.choices[0].message.content;
    const tokensUsados = completion.usage?.total_tokens || 0;

    console.log("[PORTABILIDADE] Resposta gerada com sucesso");
    console.log("[PORTABILIDADE] Tokens usados:", tokensUsados);

    return {
      success: true,
      resposta: respostaTexto,
      nomeCliente: dadosCliente.nome || 'Cliente',
      produto: 'portabilidade',
      cpf: cpf,
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
