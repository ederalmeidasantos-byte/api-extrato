import fs from "fs";
import path from "path";

// ===================== Carrega coeficientes (96x) =====================
let coeficientes = {};
try {
  const coefPath = path.join(process.cwd(), "coeficientes_96.json");
  if (fs.existsSync(coefPath)) {
    coeficientes = JSON.parse(fs.readFileSync(coefPath, "utf-8")).coeficiente_diario;
    console.log("✅ Coeficientes carregados.");
  } else {
    console.warn("⚠️ coeficientes_96.json não encontrado.");
  }
} catch (err) {
  console.error("⚠️ Erro ao carregar coeficientes_96.json:", err.message);
}

// ===================== Utils =====================
// Parser robusto (aceita "27.98", "27,98", "1.234,56")
function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;

  let s = v.toString().replace(/[R$\s%]/g, "").trim();
  if (s === "") return 0;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(/\./g, "").replace(",", ".");
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function parseBRDate(d) {
  if (!d || typeof d !== "string") return null;
  const [dd, mm, yyyy] = d.split("/");
  const dt = new Date(+yyyy, +mm - 1, +dd);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatBRNumber(n) {
  return Number.isFinite(n)
    ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0,00";
}

function todayBR() {
  const x = new Date();
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const yy = x.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

// Coeficiente 96x com fallback de dia
function getCoeficiente(tx, dia) {
  const tabela = coeficientes?.[tx.toFixed(2)];
  if (!tabela) return null;
  return (
    tabela[dia] ??
    tabela[String(+dia)] ??
    tabela["01"] ??
    tabela["1"] ??
    (Object.keys(tabela).length ? tabela[Object.keys(tabela)[0]] : null)
  );
}

// PV de série uniforme: saldo = PMT * (1 - (1+i)^(-n)) / i
function pvFromParcela(parcela, taxaPercentMes, n) {
  const i = Number(taxaPercentMes) / 100;
  if (!(i > 0) || !(n > 0)) return 0;
  const fator = (1 - Math.pow(1 + i, -n)) / i;
  return parcela * fator;
}

// ===================== Cálculo do contrato =====================
function calcularParaContrato(c) {
  if (!c || (c.situacao && c.situacao.toLowerCase() !== "ativo")) return null;
  if (c.origem_taxa === "critica") return null;

  // SEMPRE usar valor_parcela do extrato; se ausente, tenta "parcela"
  const parcelaAtual = Number.isFinite(Number(c.valor_parcela))
    ? Number(c.valor_parcela)
    : toNumber(c.parcela);

  // Parcela mínima R$25,00
  if (!(parcelaAtual >= 25)) return null;

  const totalParcelas = parseInt(c.qtde_parcelas || c.parcelas || 0, 10) || 0;
  const prazoRestante = Number.isFinite(c.prazo_restante) ? c.prazo_restante : totalParcelas;

  const dataContrato = c.data_contrato || c.data_inclusao || todayBR();
  const dtContrato = parseBRDate(dataContrato);
  const dia = dtContrato ? String(dtContrato.getDate()).padStart(2, "0") : "01";

  // Taxa ATUAL do contrato → apenas para SALDO DEVEDOR
  const taxaAtual = Number(c.taxa_juros_mensal);
  if (!Number.isFinite(taxaAtual) || taxaAtual <= 0) return null;

  // Saldo devedor com fórmula PV usando taxaAtual e prazoRestante
  const saldoDevedor = pvFromParcela(parcelaAtual, taxaAtual, prazoRestante);

  // ===== Simulação novo contrato (sempre 96x) =====
  // Ordem fixa: 1.85 → 1.79 → 1.66. Pega a primeira com troco >= 100.
  const ordemTaxas = [1.85, 1.79, 1.66];
  let escolhido = null;

  for (const tx of ordemTaxas) {
    const coefNovo = getCoeficiente(tx, dia);
    if (!coefNovo) continue;

    const valorEmprestimo = parcelaAtual / coefNovo;
    const troco = valorEmprestimo - saldoDevedor;

    if (Number.isFinite(troco) && troco >= 50) {
      escolhido = {
        taxa_aplicada: tx,
        coeficiente_usado: coefNovo,
        saldoDevedor,
        valorEmprestimo,
        troco
      };
      break; // primeira taxa que passa
    }
  }

  if (!escolhido) return null;

  return {
    banco: c.banco,
    contrato: c.contrato,
    parcela: formatBRNumber(parcelaAtual), // "10.000,00"
    prazo_total: totalParcelas,
    parcelas_pagas: c.parcelas_pagas || 0,
    prazo_restante: prazoRestante,
    taxa_atual: taxaAtual,
    taxa_aplicada: escolhido.taxa_aplicada,
    coeficiente_usado: escolhido.coeficiente_usado,
    saldo_devedor: formatBRNumber(escolhido.saldoDevedor),
    valor_emprestimo: formatBRNumber(escolhido.valorEmprestimo),
    troco: formatBRNumber(escolhido.troco),
    data_contrato: dataContrato
  };
}

// ===================== Extrator =====================
function extrairEmprestimos(json) {
  if (Array.isArray(json.contratos)) {
    return json.contratos.filter((c) => (c.situacao || "").toLowerCase() === "ativo");
  }
  const raiz = json.contratos_ativos_suspensos?.emprestimos_bancarios;
  if (Array.isArray(raiz)) {
    return raiz.filter((c) => (c.situacao || "").toLowerCase() === "ativo");
  }
  return [];
}

// ===================== Endpoint/Teste =====================
export function calcularTrocoEndpoint(JSON_DIR, bancosMap = {}) {
  return (_req, res) => {
    try {
      const fileId = _req?.params?.fileId ?? "local";
      const jsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);
      if (!fs.existsSync(jsonPath)) {
        return res.status(404).json({ error: "Extrato não encontrado (pode ter expirado)" });
      }

      const extrato = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const contratos = extrairEmprestimos(extrato);

      const calculados = contratos
        .map((c) => calcularParaContrato(c))
        .filter(Boolean)
        .sort((a, b) => toNumber(b.troco) - toNumber(a.troco));

      // Resumo
      const bancos = calculados.map((c) => bancosMap[c.banco || ""] || c.banco || "");
      const parcelas = calculados.map((c) => toNumber(c.parcela).toFixed(2));
      const taxas = calculados.map((c) => (c.taxa_aplicada ?? 0).toFixed(2));
      const saldos = calculados.map((c) => toNumber(c.saldo_devedor).toFixed(2));
      const totalTroco = calculados.reduce((s, c) => s + toNumber(c.troco), 0);

      return res.json({
        fileId,
        matricula: extrato?.beneficio?.nb || null,
        contratos: calculados,
        resumo: {
          bancos: bancos.join(", "),
          parcelas: parcelas.join(", "),
          taxas_calculadas: taxas.join(", "),
          saldos_devedores: saldos.join(", "),
          total_troco: formatBRNumber(totalTroco),
          total_contratos_simulados: calculados.length
        }
      });
    } catch (err) {
      console.error("Erro /calcular", err);
      res.status(500).json({ error: "Erro interno no cálculo", detalhe: err.message });
    }
  };
}

// Exporta helpers pro teste local (opcional)
export const __internals = { toNumber, pvFromParcela, getCoeficiente, formatBRNumber };
