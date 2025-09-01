import fs from "fs";
import path from "path";

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
function primeiroVencDia20(dataPropostaBR, addMeses = 2) {
  const dt = parseBRDate(dataPropostaBR);
  if (!dt) return null;
  const ref = new Date(dt.getFullYear(), dt.getMonth() + addMeses, 20);
  return `20/${String(ref.getMonth() + 1).padStart(2, "0")}/${ref.getFullYear()}`;
}
function diffDays(d1, d2) {
  if (!d1 || !d2) return 0;
  const MS = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((d2 - d1) / MS));
}
function coeficienteDiario(taxaMesPercent, prazoMeses, dataPropostaBR, dataPrimeiroVencBR) {
  const iMes = toNumber(taxaMesPercent) / 100;
  const n = parseInt(prazoMeses || 0, 10);
  if (!(iMes > 0) || !(n > 0)) return 0;

  const iDia = Math.pow(1 + iMes, 1 / 30) - 1;
  const fator = Math.pow(1 + iMes, n);
  const coefBase = (iMes * fator) / (fator - 1);
  const dias = diffDays(parseBRDate(dataPropostaBR), parseBRDate(dataPrimeiroVencBR));
  return coefBase * Math.pow(1 + iDia, dias);
}

// ===================== Cálculo do contrato =====================
function calcularParaContrato(c) {
  if (!c || (c.situacao && c.situacao.toLowerCase() !== "ativo")) return null;

  const parcelaAtual = toNumber(c.valor_parcela || c.parcela || 0);
  const totalParcelas = parseInt(c.qtde_parcelas || c.parcelas || 0, 10);

  let prazoRestante = 0;
  if (c.fim_desconto && /^\d{2}\/\d{4}$/.test(c.fim_desconto)) {
    const [m, y] = c.fim_desconto.split("/").map(Number);
    const hoje = new Date();
    const mesesHoje = hoje.getFullYear() * 12 + (hoje.getMonth() + 1);
    const mesesFim = y * 12 + m;
    prazoRestante = Math.max(1, mesesFim - mesesHoje + 1);
  } else {
    prazoRestante = totalParcelas || 0;
  }

  const prazoNovo = totalParcelas || prazoRestante;
  const dataProposta = c.data_contrato || c.data_inclusao || todayBR();
  const dataPrimeiroVenc = primeiroVencDia20(dataProposta, 2);

  const taxaInformada = toNumber(c.taxa_juros_mensal);
  const candidatos = [];
  if (taxaInformada > 0.1 && taxaInformada < 30) candidatos.push(taxaInformada);
  [1.85, 1.79, 1.66].forEach(t => { if (!candidatos.includes(t)) candidatos.push(t); });

  let melhor = null;

  for (const tx of candidatos) {
    const coefAtual = coeficienteDiario(tx, prazoRestante, dataProposta, dataPrimeiroVenc);
    const coefNovo  = coeficienteDiario(tx, prazoNovo,     dataProposta, dataPrimeiroVenc);

    const saldoDevedor    = coefAtual > 0 ? parcelaAtual / coefAtual : NaN;
    const valorEmprestimo = coefNovo  > 0 ? parcelaAtual / coefNovo  : NaN;
    const troco = (Number.isFinite(valorEmprestimo) && Number.isFinite(saldoDevedor))
      ? (valorEmprestimo - saldoDevedor)
      : NaN;

    if (!Number.isFinite(troco)) continue;
    if (!melhor || troco > melhor.troco) {
      melhor = {
        taxa_aplicada: tx,
        saldoDevedor,
        valorEmprestimo,
        troco
      };
    }
  }

  if (!melhor) return null;

  return {
    banco: c.banco,
    contrato: c.contrato,
    parcela: formatBRL(parcelaAtual),
    prazo_restante: prazoRestante,
    prazo_novo: prazoNovo,
    taxa_aplicada: melhor.taxa_aplicada,
    saldo_devedor: formatBRL(melhor.saldoDevedor),
    valor_emprestimo: formatBRL(melhor.valorEmprestimo),
    troco: formatBRL(melhor.troco),
    data_contrato: c.data_contrato || c.data_inclusao || todayBR(),
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
        .filter(Boolean)
        .filter(r => toNumber(r.troco) >= 100) // só trocos >= 100
        .sort((a, b) => toNumber(b.troco) - toNumber(a.troco));

      // ==== resumo consolidado ====
      const bancos = calculados.map(c => {
        let b = (c.banco || "").toUpperCase();
        if (b.includes("ITAÚ")) return "Itaú";
        if (b.includes("C6")) return "C6";
        return b.split(" ")[0]; // pega só a primeira palavra como simplificação
      });

      const parcelas = calculados.map(c => toNumber(c.parcela).toFixed(2));
      const taxas = calculados.map(c => c.taxa_aplicada.toFixed(2));
      const saldos = calculados.map(c => toNumber(c.saldo_devedor).toFixed(2));
      const totalTroco = calculados.reduce((s, c) => s + toNumber(c.troco), 0);

      return res.json({
        fileId,
        matricula: extrato?.beneficio?.numero || null,
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
