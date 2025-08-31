import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const CLOUDMERSIVE_API_KEY = "1d68371d-57cf-42ee-9b19-c7d950c12e39";

// Função auxiliar para limpar texto
function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

// Função para extrair contratos
function extractContratos(text) {
  const contratos = [];

  // Pegar apenas a seção de contratos
  const matchSection = text.match(/EMPRÉSTIMOS BANCÁRIOS([\s\S]*?)\*Contratos que/);
  if (!matchSection) return contratos;

  const section = matchSection[1];

  // Dividir em blocos a partir da palavra "Ativo"
  const blocos = section.split(/Ativo/);

  for (let bloco of blocos) {
    if (!bloco.trim()) continue;

    // Normalizar
    bloco = normalizeText("Ativo " + bloco);

    // Extrair dados
    const contrato = bloco.match(/\b\d{6,}\b/)?.[0] || null;
    const banco = bloco.match(/\b(ITAU|BRASIL|C6|FACTA|PAN|BMG|OLE|DAYCOVAL)\b/)?.[0] || null;
    const parcelas = bloco.match(/\b\d{2,3}(?=\s+R\$)/)?.[0] || null;
    const parcela = bloco.match(/R\$ ?\d{1,3}(\.\d{3})*,\d{2}/)?.[0]?.replace("R$", "").trim() || null;
    const valorEmprestado = bloco.match(/R\$ ?\d{1,3}(\.\d{3})*,\d{2}/g)?.pop()?.replace("R$", "").trim() || null;
    const taxaMensal = bloco.match(/JUROS MENSAL[^0-9]*(\d,\d{1,2})/)?.[1] || 
                       bloco.match(/\b\d,\d{1,2}\b/)?.pop() || "0";
    const inicioDesconto = bloco.match(/\b\d{2}\/\d{2}\/\d{2,4}\b/)?.pop() || null;

    contratos.push({
      contrato,
      banco,
      parcelas: parcelas ? parseInt(parcelas) : null,
      parcela,
      valorEmprestado,
      taxaMensal,
      inicioDesconto
    });
  }

  return contratos;
}

// Rota para processar extrato
app.post("/extrato", async (req, res) => {
  const { codigoArquivo } = req.body;

  if (!codigoArquivo) {
    return res.status(400).json({ error: "codigoArquivo é obrigatório" });
  }

  try {
    // Chamar Cloudmersive OCR
    const response = await axios.post(
      "https://api.cloudmersive.com/convert/pdf/to/txt",
      Buffer.from(codigoArquivo), // aqui futuramente você troca pelo arquivo real
      {
        headers: {
          "Apikey": CLOUDMERSIVE_API_KEY,
          "Content-Type": "application/pdf"
        }
      }
    );

    const text = response.data?.TextResult || "";
    if (!text) {
      return res.json({ codigoArquivo, error: "Texto não extraído" });
    }

    // Verificar bloqueio
    const bloqueado = text.includes("Bloqueado para empréstimo");
    const margemExtrapolada = text.match(/MARGEM EXTRAPOLADA\*+\s+R\$?([\d\.,]+)/)?.[1] || "0,00";

    // Extrair contratos
    const contratos = extractContratos(text);

    res.json({
      codigoArquivo,
      bloqueado,
      margemExtrapolada,
      contratos
    });

  } catch (err) {
    console.error("Erro na API:", err.response?.data || err.message);
    res.status(500).json({ error: "Falha ao processar extrato" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
