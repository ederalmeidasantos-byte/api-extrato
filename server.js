import express from "express";
import { extrairDados } from "./extrair_pdf.js";

const app = express();

app.get("/extrair", async (req, res) => {
  const resultado = await extrairDados("extrato.pdf");
  res.json(resultado);
});

app.listen(3000, () => console.log("API rodando na porta 3000 🚀"));
