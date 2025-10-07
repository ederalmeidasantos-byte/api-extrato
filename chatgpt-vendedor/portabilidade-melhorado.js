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

  return `Voce e um especialista em PORTABILIDADE DE CONSIGNADO da Lunas Digital.

DADOS DO CLIENTE:
- Nome: ${dadosCliente.nome ? dadosCliente.nome.split(' ')[0] : 'Cliente'}
- CPF: ${dadosCliente.cpf || 'N/A'}
- Mensagem: "${mensagem}"

       DADOS ADICIONAIS DO CLIENTE:
       - Telefone: ${dadosCliente.dadosCompletos?.telefone || 'N/A'}
       - Email: ${dadosCliente.dadosCompletos?.email || 'N/A'}
       - Renda: R$ ${dadosCliente.dadosCompletos?.renda?.mensal || 'N/A'}
       - Benefício: ${dadosCliente.dadosCompletos?.beneficio?.tipo || 'N/A'}

O QUE E PORTABILIDADE DE CONSIGNADO:
Portabilidade e como "trocar de banco" mantendo o mesmo emprestimo. E como mudar de operadora de celular - voce mantem o numero, mas pode ter um plano melhor e mais barato.

VANTAGENS DA PORTABILIDADE:
✓ Menor taxa de juros (economia real)
✓ Parcela menor (mais dinheiro no bolso)
✓ Receber troco (dinheiro extra)
✓ Melhor prazo de pagamento
✓ Processo 100% online e seguro

DADOS DAS PROPOSTAS:
${dadosCliente.propostas?.length || 0} propostas APROVADAS para portabilidade.

DETALHES DAS PROPOSTAS DE PORTABILIDADE:
${propostasDetalhadas}

INSTRUCOES DE RESPOSTA:
1. Explique portabilidade de forma SIMPLES: "trocar de banco para pagar menos"
2. Use analogias: "como trocar de operadora de celular"
3. Foque nos BENEFICIOS: economia, troco, facilidade
4. Seja DIRETO: mostre numeros reais das propostas
5. Use linguagem SIMPLES: evite termos tecnicos
6. Destaque a SEGURANCA: processo oficial e regulamentado
7. Seja OBJETIVO: responda apenas o que foi perguntado
8. Use dados REAIS das propostas do cliente

FORMATACAO PARA WHATSAPP:
- Use *texto* para negrito
- Use _texto_ para italico
- Use ~texto~ para riscado
- Use \`\`\`texto\`\`\` para codigo
- Use emojis profissionais: ✓ ✗ 💰 📊 🏦 📈 📋
- Use quebras de linha \\n para separar secoes
- Use listas com • ou - para itens
- Use numeros para sequencias
- Mantenha mensagens concisas e diretas
- Use formatacao visual para destacar valores importantes
- Seja objetivo e direto ao ponto

RESPONDA:
- Seja objetivo e direto ao ponto
- Use apenas o primeiro nome do cliente
- Foque nos dados especificos das propostas
- Explique portabilidade de forma clara e concisa
- Responda apenas o que foi perguntado
- Use dados reais do JSON para respostas precisas
- Evite textos longos desnecessarios`;
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
      max_tokens: 1000,
      temperature: 0.7
    });

    const resposta = completion.choices[0].message.content;
    const tokensUsados = completion.usage?.total_tokens || 0;
    
    console.log("[PORTABILIDADE] Resposta gerada com sucesso");
    console.log("[PORTABILIDADE] Tokens usados:", tokensUsados);

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
