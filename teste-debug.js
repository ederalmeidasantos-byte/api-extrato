// teste.debug.js
// Executa o cálculo direto no arquivo do extrato com debug detalhado

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { calcularTrocoEndpoint, __internals } from "./calcular.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==== Config do teste ====
const JSON_DIR = path.join(__dirname, "extratos"); // pasta de extratos
const FILE_ID = "5779"; // mude aqui para outro extrato se quiser

// Carrega extrato
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

  // Debug extra: simulação com cada taxa padrão
  const ordemTaxas = [1.85, 1.79, 1.66];
  for (const tx of ordemTaxas) {
    const troco = __internals.simularTroco(parcela, saldoDev, tx, c.data_contrato || c.data_inclusao);
    console.log(`     → Simulação taxa ${tx.toFixed(2)}: Troco = ${__internals.formatBRNumber(troco)}`);
  }

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
const endpoint = calcularTrocoEndpoint(JSON_DIR);
endpoint(req, res);
