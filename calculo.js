import fs from "fs";
import path from "path";
import coeficientes from "./coeficientes_96.json" assert { type: "json" };

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

// ===================== Cálculo usando coeficientes =====================
function getCoeficiente(taxa, dia) {
  const tabela = coeficientes.coeficiente_diario[String(taxa)];
  if (!tabela) return null;
  const key = String(dia).padStart(2, "0");
  return tabela[key] || null;
}

function calcularParaContrato(c) {
  if (!c || (c.situacao && c.situacao.toLowerCase() !== "ativo")) return null;

  const parcelaAtual = toNumber(c.valor_parcela || c.parcela || 0);
  const totalParcelas = parseInt(c.qtde_parcelas || c.parcelas || 0, 10);

  const dataProposta = c.data_contrato || c.data_inclusao || todayBR();
  const dt = parseBRDate(dataProposta);
  const dia = dt ? dt.getDate() : 1;

  const taxas = [1.85, 1.79, 1.66];
  const resultados = [];

  for (const tx of taxas) {
    const coef = getCoeficiente(tx, dia);
    if (!coef) continue;

    const saldoDevedor = parcelaAtual / coef;
    const valorEmprestimo = parcelaAtual / coef;
    const troco = valorEmprestimo - saldoDevedor;

    resultados.push({
      taxa_aplicada: tx,
      saldoDevedor,
      valorEmprestimo,
      troco
    });
  }

  if (!resultados.length) return null;

  // pega a melhor simulação (maior troco)
  const melhor = resultados.reduce((a, b) => (b.troco > a.troco ? b : a));

  return {
    banco: c.banco,
    contrato: c.contrato,
    parcela: formatBRL(parcelaAtual),
    prazo_restante: totalParcelas,
    prazo_novo: 96, // fixo porque estamos simulando coeficientes de 96x
    taxa_aplicada: melhor.taxa_aplicada,
    saldo_devedor: formatBRL(melhor.saldoDevedor),
    valor_emprestimo: formatBRL(melhor.valorEmprestimo),
    troco: formatBRL(melhor.troco),
    data_contrato: dataProposta,
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
