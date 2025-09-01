import fs from "fs";
import path from "path";

// ===================== Carrega coeficientes =====================
let coeficientes = {};
try {
  const coefPath = path.join(process.cwd(), "coeficientes_96.json");
  if (fs.existsSync(coefPath)) {
    coeficientes = JSON.parse(fs.readFileSync(coefPath, "utf-8")).coeficiente_diario;
  }
} catch (err) {
  console.error("⚠️ Erro ao carregar coeficientes_96.json:", err.message);
}

// ===================== Utils =====================
function toNumber(v) {
  if (v == null) return 0;
  return (
    parseFloat(
      v.toString().replace("R$", "").replace(/\s/g, "")
        .replace("%", "").replace(/\./g, "").replace(",", ".").trim()
    ) || 0
  );
}
function parseBRDate(d) {
  if (!d || typeof d !== "string") return null;
  const [dd, mm, yyyy] = d.split("/");
  const dt = new Date(+yyyy, +mm - 1, +dd);
  return isNaN(dt.getTime()) ? null : dt;
}
function formatBRL(n) {
  return Number.isFinite(n)
    ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : null;
}
function todayBR() {
  const x = new Date();
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const yy = x.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

// ===================== Cálculo do contrato =====================
function calcularParaContrato(c) {
  if (!c || (c.situacao && c.situacao.toLowerCase() !== "ativo")) return null;

  const parcelaAtual = toNumber(c.valor_parcela || c.parcela || 0);
  const totalParcelas = parseInt(c.qtde_parcelas || c.parcelas || 0, 10);
  const dataContrato = c.data_contrato || c.data_inclusao || todayBR();
  const dtContrato = parseBRDate(dataContrato);
  const dia = dtContrato ? String(dtContrato.getDate()).padStart(2, "0") : "01";

  // pega taxa informada ou assume 1.79
  const taxa = Number(c.taxa_juros_mensal) || 1.79;

  // tenta usar coeficiente do JSON
  let coef = null;
  if (coeficientes && coeficientes[taxa.toFixed(2)]) {
    coef = coeficientes[taxa.toFixed(2)][dia];
  }

  if (!coef) {
    return {
      contrato: c.contrato,
      banco: c.banco,
      critica: `Coeficiente não encontrado para taxa ${taxa.toFixed(2)}% no dia ${dia}`
    };
  }

  const saldoDevedor = parcelaAtual / coef;
  const valorEmprestimo = parcelaAtual / coef; // 96x padrão
  const troco = valorEmprestimo - saldoDevedor;

  return {
    banco: c.banco,
    contrato: c.contrato,
    parcela: formatBRL(parcelaAtual),
    prazo: totalParcelas,
    taxa_aplicada: taxa,
    coeficiente_usado: coef,
    saldo_devedor: formatBRL(saldoDevedor),
    valor_emprestimo: formatBRL(valorEmprestimo),
    troco: formatBRL(troco),
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

// ===================== Endpoint =====================
export function calcularTrocoEndpoint(JSON_DIR) {
  return (req, res) => {
    try {
      const { fileId } = req.params;
      const jsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);
      if (!fs.existsSync(jsonPath)) {
        return res.status(404).json({ error: "Extrato não encontrado (pode ter expirado)" });
      }

      const extrato = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      const contratos = extrairEmprestimos(extrato);

      const calculados = contratos
        .map(c => calcularParaContrato(c))
        .filter(r => r && !r.critica)
        .filter(r => toNumber(r.troco) >= 50)
        .sort((a, b) => toNumber(b.troco) - toNumber(a.troco));

      // ==== resumo consolidado ====
      const bancos = calculados.map(c => {
        let b = (c.banco || "").toUpperCase();
        if (b.includes("ITAÚ")) return "Itaú";
        if (b.includes("C6")) return "C6";
        return b.split(" ")[0];
      });

      const parcelas = calculados.map(c => toNumber(c.parcela).toFixed(2));
      const taxas = calculados.map(c => c.taxa_aplicada.toFixed(2));
      const saldos = calculados.map(c => toNumber(c.saldo_devedor).toFixed(2));
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
          total_troco: totalTroco.toFixed(2),
          total_contratos_simulados: calculados.length
        }
      });
    } catch (err) {
      console.error("Erro /calcular", err);
      res.status(500).json({ error: "Erro interno no cálculo", detalhe: err.message });
    }
  };
}
