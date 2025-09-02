import fs from "fs";
import path from "path";

// ===================== Carrega coeficientes =====================
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

// ===================== Cálculo do contrato =====================
function calcularParaContrato(c) {
  if (!c || (c.situacao && c.situacao.toLowerCase() !== "ativo")) return null;
  if (c.origem_taxa === "critica") return null;

  const parcelaAtual = toNumber(c.valor_parcela ?? c.parcela);
  const totalParcelas = parseInt(c.qtde_parcelas || c.parcelas || 0, 10);
  const prazoRestante = Number.isFinite(c.prazo_restante) ? c.prazo_restante : totalParcelas;
  const dataContrato = c.data_contrato || c.data_inclusao || todayBR();
  const dtContrato = parseBRDate(dataContrato);
  const dia = dtContrato ? String(dtContrato.getDate()).padStart(2, "0") : "01";

  // taxa atual → usada para saldo devedor
  const taxaAtual = Number(c.taxa_juros_mensal);
  if (!(taxaAtual > 0 && taxaAtual <= 3)) return null;

  const coefSaldo = coeficientes?.[taxaAtual.toFixed(2)]?.[dia];
  if (!coefSaldo) return null;

  const saldoDevedor = parcelaAtual / coefSaldo;

  // simulação novo contrato (96x) nas 3 taxas padrão
  const taxasPadrao = [1.85, 1.79, 1.66];
  let melhor = null;

  for (const tx of taxasPadrao) {
    const coefNovo = coeficientes?.[tx.toFixed(2)]?.[dia];
    if (!coefNovo) continue;

    const valorEmprestimo = parcelaAtual / coefNovo;
    const troco = valorEmprestimo - saldoDevedor;

    if (!Number.isFinite(troco)) continue;
    if (!melhor || troco > melhor.troco) {
      melhor = {
        taxa_aplicada: tx,
        coeficiente_usado: coefNovo,
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
    parcela: formatBRNumber(parcelaAtual),
    prazo_total: totalParcelas,
    parcelas_pagas: c.parcelas_pagas || 0,
    prazo_restante: prazoRestante,
    taxa_atual: taxaAtual,
    taxa_aplicada: melhor.taxa_aplicada,
    coeficiente_usado: melhor.coeficiente_usado,
    saldo_devedor: formatBRNumber(melhor.saldoDevedor),
    valor_emprestimo: formatBRNumber(melhor.valorEmprestimo),
    troco: formatBRNumber(melhor.troco),
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
        .filter(r => toNumber(r.parcela) >= 25)  // regra: só parcelas >= 25
        .filter(r => toNumber(r.troco) >= 100)  // regra: só trocos >= 100
        .sort((a, b) => toNumber(b.troco) - toNumber(a.troco));

      // ==== resumo consolidado ====
      const bancos = calculados.map(c => {
        let b = (c.banco || "").toUpperCase();
        if (b.includes("ITAÚ")) return "Itaú";
        if (b.includes("C6")) return "C6";
        if (b.includes("BRADESCO")) return "Bradesco";
        if (b.includes("BRASIL")) return "Banco do Brasil";
        if (b.includes("FACTA")) return "Facta";
        if (b.includes("PINE")) return "Pine";
        return c.banco; // se não tiver mapeado, retorna como está
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
