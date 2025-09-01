import fs from "fs";
import pdf from "pdf-parse";
import OpenAI from "openai";

// Inicializa o cliente da OpenAI
const client = new OpenAI({
  apiKey: process.env.LUNAS_API_KEY, // lembre de configurar no Render
});

// Função para dividir texto em blocos menores
function dividirTexto(texto, tamanho = 3000) {
  const partes = [];
  for (let i = 0; i < texto.length; i += tamanho) {
    partes.push(texto.slice(i, i + tamanho));
  }
  return partes;
}

// Função principal de extração
export async function extrairDados(caminhoArquivo) {
  try {
    const buffer = fs.readFileSync(caminhoArquivo);

    // Extrair texto bruto do PDF
    const data = await pdf(buffer);
    const textoExtraido = data.text.trim();

    if (!textoExtraido) {
      throw new Error("Não foi possível extrair texto do PDF.");
    }

    // Quebra em blocos
    const partes = dividirTexto(textoExtraido);

    let resultados = [];

    // Processa cada parte no modelo
    for (const parte of partes) {
      const response = await client.chat.completions.create({
        model: "gpt-4o-mini", // mais rápido
        messages: [
          {
            role: "system",
            content: "Você é um assistente que extrai informações estruturadas de extratos bancários.",
          },
          {
            role: "user",
            content: `Extraia os seguintes campos: 
            - Nome do cliente
            - Banco
            - Agência
            - Conta
            - Saldo
            - Transações (data, descrição, valor)

            Texto:
            ${parte}`,
          },
        ],
      });

      const conteudo = response.choices[0].message?.content || "";
      resultados.push(conteudo);
    }

    // Junta tudo em um só resultado
    return { sucesso: true, dados: resultados.join("\n") };

  } catch (error) {
    console.error("Erro ao extrair dados:", error);
    return { sucesso: false, erro: error.message };
  }
}
