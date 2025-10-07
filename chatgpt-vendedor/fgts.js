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

// ================== Prompt Especializado para FGTS ==================
function buildPromptFGTS(dadosCliente, mensagem) {
  const contratosRCCDetalhados = dadosCliente.contratosRCC && dadosCliente.contratosRCC.length > 0 
    ? dadosCliente.contratosRCC.map((c, i) => `
CONTRATO RCC (FGTS) ${i + 1}:
- Contrato: ${c.contrato || 'N/A'}
- Banco: ${c.banco?.nome || 'N/A'}
- Situação: ${c.situacao || 'N/A'}
- Valor Parcela: R$ ${c.valor_parcela || 'N/A'}
- Valor Liberado: R$ ${c.valor_liberado || 'N/A'}
- Prazo: ${c.qtde_parcelas || 'N/A'} meses
- Taxa: ${c.taxa_juros_mensal || 'N/A'}% ao mês
`).join('') 
    : 'Cliente sem contratos RCC (FGTS) ativos.';

  return `Você é um especialista em SAQUE FGTS da Lunas Digital.

DADOS DO CLIENTE:
- Nome: ${dadosCliente.nome ? dadosCliente.nome.split(' ')[0] : 'Cliente'}
- CPF: ${dadosCliente.cpf || 'N/A'}
- Mensagem: "${mensagem}"

DADOS COMPLETOS DO CLIENTE (JSON):
${JSON.stringify(dadosCliente.dadosCompletos || dadosCliente, null, 2)}

INSTRUÇÕES ESPECÍFICAS PARA FGTS:
1. O cliente tem ${dadosCliente.contratosRCC?.length || 0} contratos RCC (FGTS) ativos
2. FGTS = Fundo de Garantia do Tempo de Serviço
3. Saque FGTS é um DIREITO do trabalhador
4. Valores: R$ 1.000 por conta ativa, R$ 500 por conta inativa
5. Processo simples e rápido (até 2 dias úteis)
6. Sem burocracia, sem filas, sem complicação

DETALHES DOS CONTRATOS RCC (FGTS):
${contratosRCCDetalhados}

INSTRUÇÕES DE RESPOSTA PARA FGTS:
1. Seja especialista em saque FGTS
2. Enfatizar que é um DIREITO do trabalhador
3. Destacar valores: R$ 1.000 (ativas) e R$ 500 (inativas)
4. Explicar processo simples e rápido
5. Usar linguagem acessível e clara
6. Sempre oferecer verificação de saldo
7. Tranquilizar sobre facilidade do processo
8. Usar exemplos práticos de valores
9. Seja educado e profissional
10. Sempre termine com uma pergunta para engajar o cliente

FORMATAÇÃO PARA WHATSAPP:
- Use *texto* para negrito
- Use _texto_ para itálico
- Use ~texto~ para riscado
- Use ```texto``` para código
- Use emojis profissionais: ✓ ✗ 💰 📊 🏦 📈 📋 💼
- Use quebras de linha \n para separar seções
- Use listas com • ou - para itens
- Use números para sequências
- Mantenha mensagens concisas e diretas
- Use formatação visual para destacar valores importantes
- Seja objetivo e direto ao ponto

RESPONDA:
- Seja objetivo e direto ao ponto
- Use apenas o primeiro nome do cliente
- Foque nos dados específicos dos contratos FGTS
- Explique o saque de forma clara e concisa
- Responda apenas o que foi perguntado
- Use dados reais do JSON para respostas precisas
- Evite textos longos desnecessários`;
}

// ================== Função principal para FGTS ==================
export async function processarMensagemFGTS({ cpf, mensagem, dadosCliente }) {
  try {
    console.log("[FGTS] Processando mensagem:", mensagem);
    console.log("[FGTS] CPF:", cpf);
    console.log("[FGTS] Contratos RCC:", dadosCliente.contratosRCC?.length || 0);

    if (!openai) {
      throw new Error("OpenAI não configurado. Defina OPENAI_API_KEY no arquivo .env");
    }

    const prompt = buildPromptFGTS(dadosCliente, mensagem);
    
    console.log("🤖 [FGTS] Enviando para ChatGPT...");
    
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
    
    console.log("✅ [FGTS] Resposta gerada com sucesso");
    console.log("📊 [FGTS] Tokens usados:", tokensUsados);

    return {
      success: true,
      resposta: resposta,
      produto: 'fgts',
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
    console.error("[FGTS] Erro:", error.message);
    return {
      success: false,
      erro: error.message,
      produto: 'fgts',
      cpf: cpf,
      timestamp: new Date().toISOString()
    };
  }
}

