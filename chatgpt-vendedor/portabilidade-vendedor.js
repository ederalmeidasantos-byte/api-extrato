import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import OpenAI from "openai";
import { sistemaFAQ } from "./sistema-faq.js";
import { sistemaPerfis } from "./sistema-perfis.js";
import { sistemaInteligente } from "./sistema-inteligente.js";

if (!process.env.OPENAI_API_KEY) {
  console.warn("OPENAI_API_KEY nao definida. Funcionalidade de ChatGPT sera limitada.");
}

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// ================== Helpers ==================
function normalizarCPF(cpf) {
  if (!cpf) return "";
  return String(cpf).replace(/\D/g, "");
}

// ================== Prompt Especializado para VENDEDOR ==================
function buildPromptPortabilidade(dadosCliente, mensagem) {
  // Detectar perfil automaticamente baseado no status das propostas
  const perfilDetectado = sistemaPerfis.detectarPerfil(dadosCliente);
  console.log(`[PORTABILIDADE] Perfil detectado: ${perfilDetectado.toUpperCase()}`);
  
  // Usar o sistema de perfis para construir o prompt
  return sistemaPerfis.construirPromptPerfil(perfilDetectado, dadosCliente, mensagem);
}

// ================== Funcao principal para Portabilidade ==================
export async function processarMensagemPortabilidade({ cpf, mensagem, dadosCliente }) {
  // Usar o sistema inteligente que decide entre FAQ e ChatGPT
  return await sistemaInteligente.processarMensagem({
    cpf: cpf,
    mensagem: mensagem,
    dadosCliente: dadosCliente,
    produto: 'portabilidade'
  });
}
