const express = require("express");
const fs = require("fs");
const path = require("path");

const extrair = require("./extrair_pdf"); // sua função que lê o PDF e gera json
const { calcular } = require("./calculo");

const app = express();
app.use(express.json());

// ===================== ENDPOINT: Extrair =====================
app.post("/extrair", async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ error: "Informe o fileId" });

    const data = await extrair(); // processa o PDF
    const filePath = path.join(__dirname, `extrato_${fileId}.json`);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    // Agenda exclusão em 24h
    setTimeout(() => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`${filePath} excluído após 24h`);
      }
    }, 24 * 60 * 60 * 1000);

    // monta URL do cálculo
    const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`;
    const urlCalculo = `${baseUrl}/calculo/${fileId}`;

    res.json({ 
      message: `Extrato processado e salvo como extrato_${fileId}.json`, 
      fileId,
      data,
      proximo_passo: {
        calcular: urlCalculo
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao extrair PDF" });
  }
});

// ===================== ENDPOINT: Calculo =====================
app.get("/calculo/:fileId", (req, res) => {
  try {
    const { fileId } = req.params;
    const filePath = path.join(__dirname, `extrato_${fileId}.json`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: `Arquivo extrato_${fileId}.json não encontrado` });
    }

    const result = calcular(filePath);
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao calcular troco" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
