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

// ================== Prompt Especializado para FGTS ==================
function buildPromptFGTS(dadosCliente, mensagem) {
  const contratosRCCDetalhados = dadosCliente.contratosRCC && dadosCliente.contratosRCC.length > 0
    ? dadosCliente.contratosRCC.map((c, i) => `
CONTRATO FGTS ${i + 1}:
- Banco: ${c.banco?.nome || 'N/A'} (${c.banco?.codigo || 'N/A'})
- Valor: R$ ${c.valor_liberado || 'N/A'}
- Situacao: ${c.situacao || 'N/A'}
`).join('')
    : 'Cliente sem contratos FGTS (RCC) ativos.';

  return `Voce e um especialista em SAQUE FGTS da Lunas Digital.

DADOS DO CLIENTE:
- Nome: ${dadosCliente.nome || 'Cliente'}
- CPF: ${dadosCliente.cpf || 'N/A'}
- Mensagem: "${mensagem}"

       DADOS ADICIONAIS DO CLIENTE:
       - Telefone: ${dadosCliente.dadosCompletos?.telefone || 'N/A'}
       - Email: ${dadosCliente.dadosCompletos?.email || 'N/A'}
       - Renda: R$ ${dadosCliente.dadosCompletos?.renda?.mensal || 'N/A'}
       - Benefício: ${dadosCliente.dadosCompletos?.beneficio?.tipo || 'N/A'}

INSTRUCOES IMPORTANTES:
1. O cliente tem ${dadosCliente.contratosRCC?.length || 0} contratos FGTS (RCC) ativos.
2. Foque nos direitos do trabalhador e na facilidade do saque.
3. Explique os valores possiveis: ate R$ 1.000 por conta ativa e ate R$ 500 por conta inativa.
4. Responda com detalhes especificos dos contratos FGTS quando o cliente perguntar.

DETALHES DOS CONTRATOS FGTS (RCC):
${contratosRCCDetalhados}

INSTRUCOES DE RESPOSTA PARA FGTS:
1. Seja especialista em saque FGTS
2. Enfatizar que e um DIREITO do trabalhador
3. Destacar valores: R$ 1.000 (ativas) e R$ 500 (inativas)
4. Explicar processo simples e rapido
5. Usar linguagem acessivel e clara
6. Sempre oferecer verificacao de saldo
7. Tranquilizar sobre facilidade do processo
8. Usar exemplos praticos de valores
9. Seja educado e profissional
10. Sempre termine com uma pergunta para engajar o cliente

FORMATACAO PARA WHATSAPP:
- Use *texto* para negrito
- Use _texto_ para italico
- Use ~texto~ para riscado
- Use \`\`\`texto\`\`\` para codigo
- Use emojis: ✅ ❌ 💰 📊 🏦 🎯 ⚡ 🔥 💼 🏢
- Use quebras de linha \\n para separar secoes
- Use listas com • ou - para itens
- Use numeros para sequencias
- Mantenha mensagens concisas e diretas
- Use formatacao visual para destacar valores importantes

RESPONDA:
- De forma amigavel e profissional
- Com foco nos direitos do trabalhador
- Destacando facilidade e rapidez
- Explicando processo simples
- Usando os dados reais do JSON para dar respostas precisas`;
}

// ================== Funcao principal para FGTS ==================
export async function processarMensagemFGTS({ cpf, mensagem, dadosCliente }) {
  try {
    console.log("[FGTS] Processando mensagem:", mensagem);
    console.log("[FGTS] CPF:", cpf);
    console.log("[FGTS] Contratos RCC:", dadosCliente.contratosRCC?.length || 0);

    if (!openai) {
      throw new Error("OpenAI nao configurado. Defina OPENAI_API_KEY no arquivo .env");
    }

    // Construir prompt especializado
    const prompt = buildPromptFGTS(dadosCliente, mensagem);

    // Chamar OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Voce e um assistente virtual especializado em saque FGTS da Lunas Digital."
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

    console.log("[FGTS] Resposta gerada com sucesso");
    console.log("[FGTS] Tokens usados:", tokensUsados);

    return {
      success: true,
      resposta: respostaTexto,
      nomeCliente: dadosCliente.nome || 'Cliente',
      produto: 'fgts',
      cpf: cpf,
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
