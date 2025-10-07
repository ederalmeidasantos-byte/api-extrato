const fs = require('fs');
const OpenAI = require('openai');

// Configuração da API OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Função para construir o prompt para GPT
function buildPrompt(isContingencia = false) {
  const origem = isContingencia ? "CONTINGENCIA" : "INSS";
  
  let base = `
Você é um especialista em extrair dados de extratos do INSS. Extraia APENAS empréstimos consignados ATIVOS e retorne JSON válido.

ORIGEM: ${origem}

REGRAS IMPORTANTES:
1. Extraia APENAS contratos ATIVOS (não quitados, não suspensos)
2. Para CONTINGENCIA: extraia apenas contratos com origem "CONTINGENCIA"
3. Para INSS: extraia apenas contratos com origem "INSS"
4. Ignore contratos com status: QUITADO, SUSPENSO, CANCELADO
5. Use EXATAMENTE os nomes de campos especificados
6. Valores monetários em formato numérico (sem R$, vírgulas, pontos)
7. Datas no formato DD/MM/AAAA
8. Números de benefício com 10 dígitos
9. Códigos de banco com 3 dígitos

ESTRUTURA JSON OBRIGATÓRIA:
{
  "cliente": {
    "nome": "string",
    "nb": "string (10 dígitos)",
    "especie": "string",
    "origem": "${origem}",
    "dataExtrato": "DD/MM/AAAA"
  },
  "margens": {
    "disponivel": number,
    "extrapolada": number,
    "rmc": number,
    "rcc": number
  },
  "contratos": [
    {
      "contrato": "string",
      "banco": "string",
      "bancoCodigo": "string (3 dígitos)",
      "prazo": number,
      "pagas": number,
      "parcela": number,
      "saldo": number,
      "taxa": number,
      "selecionado": true
    }
  ]
}

CAMPOS OBRIGATÓRIOS:
- cliente.nome: Nome completo do beneficiário
- cliente.nb: Número do benefício (10 dígitos)
- cliente.especie: Código da espécie do benefício
- cliente.origem: "${origem}"
- cliente.dataExtrato: Data do extrato (DD/MM/AAAA)
- margens.disponivel: Margem disponível para empréstimo
- margens.extrapolada: Margem extrapolada
- margens.rmc: Margem de crédito
- margens.rcc: Margem de crédito consignado
- contratos[].contrato: Número do contrato
- contratos[].banco: Nome do banco
- contratos[].bancoCodigo: Código do banco (3 dígitos)
- contratos[].prazo: Prazo total em meses
- contratos[].pagas: Parcelas já pagas
- contratos[].parcela: Valor da parcela
- contratos[].saldo: Saldo devedor atual
- contratos[].taxa: Taxa de juros mensal
- contratos[].selecionado: true (sempre)

IMPORTANTE: Retorne APENAS o JSON, sem explicações ou texto adicional.`;

  return base;
}

// Função principal para extrair dados do PDF
async function gptExtrairJSON(pdfPath) {
  try {
    console.log('Iniciando extração do PDF:', pdfPath);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(pdfPath)) {
      throw new Error('Arquivo PDF não encontrado');
    }

    // Detectar se é contingência pelo nome do arquivo
    const isContingencia = pdfPath.toLowerCase().includes('contingencia');
    
    let response;
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        const model = attempts === 0 ? 'gpt-4o-mini' : 'gpt-4o';
        console.log(`Tentativa ${attempts + 1}: Usando modelo ${model}`);
        
        response = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: buildPrompt(isContingencia) },
                { 
                  type: "image_url", 
                  image_url: { 
                    url: `data:application/pdf;base64,${fs.readFileSync(pdfPath).toString('base64')}` 
                  } 
                }
              ]
            }
          ],
          max_tokens: 4000,
          temperature: 0.1
        });
        
        break; // Sucesso, sair do loop
        
      } catch (error) {
        attempts++;
        console.error(`Erro na tentativa ${attempts}:`, error.message);
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!response || !response.choices || !response.choices[0]) {
      throw new Error('Resposta inválida da API OpenAI');
    }

    const content = response.choices[0].message.content;
    console.log('Resposta do GPT:', content.substring(0, 200) + '...');

    // Tentar extrair JSON da resposta
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON não encontrado na resposta do GPT');
    }

    const jsonStr = jsonMatch[0];
    const resultado = JSON.parse(jsonStr);

    // Validar estrutura básica
    if (!resultado.cliente || !resultado.margens || !Array.isArray(resultado.contratos)) {
      throw new Error('Estrutura JSON inválida');
    }

    console.log('Extração concluída com sucesso');
    console.log(`Cliente: ${resultado.cliente.nome}`);
    console.log(`Contratos encontrados: ${resultado.contratos.length}`);

    return resultado;

  } catch (error) {
    console.error('Erro na extração:', error);
    throw new Error(`Falha na extração: ${error.message}`);
  }
}

module.exports = {
  gptExtrairJSON,
  buildPrompt
};
