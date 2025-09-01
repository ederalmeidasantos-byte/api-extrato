import fs from "fs";
import path from "path";

// ===================== Utils =====================
function toNumber(v) {
  if (v == null) return 0;
  return parseFloat(
    v.toString().replace("%", "").replace(/\./g, "").replace(",", ".").trim()
  ) || 0;
}
function parseBRDate(d) {
  if (!d || typeof d !== "string") return null;
  const [dd, mm, yyyy] = d.split("/");
  const dt = new Date(+yyyy, +mm - 1, +dd);
  return isNaN(dt.getTime()) ? null : dt;
}
function formatBRL(n) {
  return Number.isFinite(n) ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : null;
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
  const dd = "20";
  const mm = String(ref.getMonth() + 1).padStart(2, "0");
  const yy = ref.getFullYear();
  return `${dd}/${mm}/${yy}`;
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

/**
 * Tenta taxas 1,85% -> 1,79% -> 1,66% até o troco ficar >= 100 (se possível).
 * Prazo atual = meses até fim_desconto.
 * Prazo novo   = qtde_parcelas (renova para o prazo cheio).
 */
function calcularParaContrato(c) {
  // filtros mínimos
  if (!c || (c.situacao && c.situacao.toLowerCase() !== "ativo")) return null;

  const parcelaAtual = toNumber(c.valor_parcela || c.parcela || 0);
  const totalParcelas = parseInt(c.qtde_parcelas || c.parcelas || 0, 10);

  // fim_desconto no formato "MM/YYYY"
  let prazoRestante = 0;
  if (c.fim_desconto && /^\d{2}\/\d{4}$/.test(c.fim_desconto)) {
    const [m, y] = c.fim_desconto.split("/").map(Number);
    const hoje = new Date();
    const mesesHoje = hoje.getFullYear() * 12 + hoje.getMonth() + 1; // 1..12
    const mesesFim = y * 12 + m;
    prazoRestante = Math.max(1, mesesFim - mesesHoje + 1);
  } else {
    // fallback se não tiver fim_desconto
    prazoRestante = totalParcelas || 0;
  }

  const prazoNovo = totalParcelas || prazoRestante;
  const dataProposta = c.data_contrato || c.data_inclusao || todayBR();
  const dataPrimeiroVenc = primeiroVencDia20(dataProposta, 2);

  // taxas a testar
  const taxas = [1.85, 1.79, 1.66];

  let melhor = null;

  for (const tx of taxas) {
    const txStr = String(tx).replace(".", ","); // para função que aceita "1,85" também
    const coefAtual = coeficienteDiario(txStr, prazoRestante, dataProposta, dataPrimeiroVenc);
    const coefNovo = coeficienteDiario(txStr, prazoNovo, dataProposta, dataPrimeiroVenc);

    const saldoDevedor = coefAtual > 0 ? (parcelaAtual / coefAtual) : NaN;
    const valorEmprestimo = coefNovo > 0 ? (parcelaAtual / coefNovo) : NaN;
    const troco = (Number.isFinite(valorEmprestimo) && Number.isFinite(saldoDevedor))
      ? (valorEmprestimo - saldoDevedor)
      : NaN;

    // guarda o primeiro que atingir troco >= 100; se nenhum atingir, fica com o melhor positivo
    if (Number.isFinite(troco)) {
      const pack = {
        taxa_aplicada: tx,
        saldoDevedor,
        valorEmprestimo,
        troco
      };
      if (troco >= 100 && (!melhor || melhor.troco < 100)) {
        melhor = pack;
        break;
      }
      if (troco > 0 && (!melhor || melhor.troco <= 0)) {
        melhor = pack;
      }
      if (!melhor) melhor = pack; // fallback (pode ser negativo)
    }
  }

  if (!melhor || !(melhor.troco > 0)) return null;

  return {
    banco: c.banco,
    contrato: c.contrato,
    parcela: parcelaAtual,
    prazo_restante: prazoRestante,
    prazo_novo: prazoNovo,
    taxa_aplicada: melhor.taxa_aplicada,
    saldo_devedor: melhor.saldoDevedor,
    valor_emprestimo: melhor.valorEmprestimo,
    troco: melhor.troco,
    data_contrato: dataProposta
  };
}

/**
 * Localiza a lista de empréstimos ativos no JSON (suporta variações de schema)
 */
function extrairEmprestimos(json) {
  // novo schema proposto
  if (Array.isArray(json.contratos)) {
    return json.contratos.filter(c => (c.situacao || "").toLowerCase() === "ativo");
  }
  // schema original do INSS agrupado
  const raiz = json.contratos_ativos_suspensos?.emprestimos_bancarios;
  if (Array.isArray(raiz)) {
    return raiz.filter(c => (c.situacao || "").toLowerCase() === "ativo");
  }
  return [];
}

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
      const resultados = [];

      let somaTrocos = 0;
      const bancos = [];
      const parcelas = [];
      const saldos = [];

      for (const c of contratos) {
        const r = calcularParaContrato(c);
        if (r) {
          resultados.push({
            banco: r.banco,
            contrato: r.contrato,
            parcela: formatBRL(r.parcela),
            prazo_restante: r.prazo_restante,
            prazo_novo: r.prazo_novo,
            taxa_aplicada: Number(r.taxa_aplicada),   // 1.85 etc
            saldo_devedor: formatBRL(r.saldo_devedor),
            valor_emprestimo: formatBRL(r.valor_emprestimo),
            troco: formatBRL(r.troco),
            data_contrato: r.data_contrato
          });
          somaTrocos += r.troco;
          bancos.push(r.banco);
          parcelas.push(formatBRL(r.parcela));
          saldos.push(formatBRL(r.saldo_devedor));
        }
      }

      return res.json({
        fileId,
        trocos: resultados,
        soma_trocos: formatBRL(somaTrocos),
        bancos: bancos.join(", "),
        parcelas: parcelas.join(", "),
        saldos_devedores: saldos.join(", ")
      });
    } catch (err) {
      console.error("Erro /calcular", err);
      res.status(500).json({ error: "Erro interno no cálculo", detalhe: err.message });
    }
  };
}
