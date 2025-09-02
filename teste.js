// Executa o cálculo direto no arquivo do extrato, sem subir servidor
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { calcularTrocoEndpoint, __internals } from "./calcular.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==== Config do teste ====
const JSON_DIR = path.join(__dirname, "extratos"); // pasta de extratos
const FILE_ID = "5779"; // mude aqui para testar outro arquivo

// Tenta carregar o mapa de bancos (opcional). Se não existir, usa {}.
let bancosMap = {};
try {
  const bancosPath = path.join(__dirname, "bancos.json");
  if (fs.existsSync(bancosPath)) {
    bancosMap = JSON.parse(fs.readFileSync(bancosPath, "utf-8"));
    console.log("🗂️  bancos.json carregado.");
  } else {
    console.log("ℹ️  bancos.json não encontrado. Usando nomes do extrato como estão.");
  }
} catch (e) {
  console.warn("⚠️ Erro ao ler bancos.json:", e.message);
}

// Carrega manualmente o extrato para debug extra
const extratoPath = path.join(JSON_DIR, `extrato_${FILE_ID}.json`);
if (!fs.existsSync(extratoPath)) {
  console.error("❌ Extrato não encontrado:", extratoPath);
  process.exit(1);
}
const extrato = JSON.parse(fs.readFileSync(extratoPath, "utf-8"));

// Debug inicial: mostrar contratos ativos
const ativos = extrato.contratos?.filter((c) => (c.situacao || "").toLowerCase() === "ativo") || [];
console.log(`📂 Contratos encontrados no extrato: ${ativos.length}`);
console.log("─────────────────────────────");

for (const c of ativos) {
  const parcela = __internals.toNumber(c.valor_parcela ?? c.parcela);
  const taxa = Number(c.taxa_juros_mensal);
  const prazoRestante = Number.isFinite(c.prazo_restante) ? c.prazo_restante : (c.qtde_parcelas || 0);
  const saldoDev = __internals.pvFromParcela(parcela, taxa, prazoRestante);

  console.log(`🔎 Contrato: ${c.contrato}`);
  console.log(`   Banco: ${c.banco}`);
  console.log(`   Situação: ${c.situacao}`);
  console.log(`   Parcela: ${parcela}`);
  console.log(`   Taxa mensal (atual): ${taxa}`);
  console.log(`   Parcelas pagas: ${c.parcelas_pagas || 0}`);
  console.log(`   Prazo restante: ${prazoRestante}`);
  console.log(`   Saldo devedor calculado: ${__internals.formatBRNumber(saldoDev)}`);
  console.log("─────────────────────────────");
}

// Mock simples de req/res para executar o cálculo final
const req = { params: { fileId: FILE_ID } };
const res = {
  status(code) {
    this.code = code;
    return this;
  },
  json(obj) {
    console.log("\n📊 RESULTADO FINAL =====================");
    console.log(JSON.stringify(obj, null, 2));
  }
};

// Executa endpoint
const endpoint = calcularTrocoEndpoint(JSON_DIR, bancosMap);
endpoint(req, res);
