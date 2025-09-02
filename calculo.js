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
function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
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

function todayBR() {
  const x = new Date();
  const dd = String(x.getDate()).padStart(2, "0");
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const yy = x.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

// Coeficiente 96x
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

// PV de série uniforme
function pvFromParcela(parcela, taxaPercentMes, n) {
  const i = Number(taxaPercentMes) / 100;
  if (!(i > 0) || !(n > 0)) return 0;
  const fator = (1 - Math.pow(1 + i, -n)) / i;
  return parcela * fator;
}

// ===================== Ajuste de Margem =====================
function ajustarParcelasPorMargem(contratos, extrapolada) {
  let contratosOrdenados = [...contratos].sort(
    (a, b) => toNumber(b.valor_parcela) - toNumber(a.valor_parcela)
  );
  let maior = contratosOrdenados[0];
  if (!maior) return contratos;

  // Como extrapolada é negativa, ajusta a maior parcela
  let novaParcela = Math.max(0, toNumber(maior.valor_parcela) + toNumber(extrapolada));
  maior.valor_parcela = novaParcela.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return contratos.map(c => (c.contrato === maior.contrato ? maior : c));
}

// ===================== Cálculo do contrato =====================
function calcularParaContrato(c) {
  if (!c || (c.situacao && c.situacao.toLowerCase() !== "ativo")) return null;

  const parcelaAtual = toNumber(c.valor_parcela);
  if (!(parcelaAtual >= 25)) return null;

  const totalParcelas = toNumber(c.qtde_parcelas) || toNumber(c.fim_desconto) || 0;
  const dataContrato = c.data_contrato || c.data_inclusao || todayBR();
  const dtContrato = parseBRDate(dataContrato);
  const dia = dtContrato ? String(dtContrato.getDate()).padStart(2, "0") : "01";

  const taxaAtual = toNumber(c.taxa_juros_mensal);
  if (!(taxaAtual > 0)) return null;

  const prazoRestante = totalParcelas; // TODO: pode refinar usando competência
  const saldoDevedor = pvFromParcela(parcelaAtual, taxaAtual, prazoRestante);

  // ===== Simulação novo contrato (sempre 96x) =====
  const ordemTaxas = [1.85, 1.79, 1.66];
  let escolhido = null;

  for (const tx of ordemTaxas) {
    const coefNovo = getCoeficiente(tx, dia);
    if (!coefNovo) continue;

    const valorEmprestimo = parcelaAtual / coefNovo;
    const troco = valorEmprestimo - saldoDevedor;

    if (Number.isFinite(troco) && troco >= 100) {
      escolhido = {
        taxa_aplicada: tx.toFixed(2),
        coeficiente_usado: coefNovo,
        saldoDevedor,
        valorEmprestimo,
        troco
      };
      break;
    }
  }

  if (!escolhido) return null;

  return {
    banco: c.banco,
    contrato: c.contrato,
    parcela: c.valor_parcela,
    prazo_total: totalParcelas,
    parcelas_pagas: c.parcelas_pagas || 0,
    prazo_restante: prazoRestante,
    taxa_atual: c.taxa_juros_mensal,
    taxa_aplicada: escolhido.taxa_aplicada,
    coeficiente_usado: escolhido.coeficiente_usado,
    saldo_devedor: escolhido.saldoDevedor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    valor_emprestimo: escolhido.valorEmprestimo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    troco: escolhido.troco.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    data_contrato: dataContrato
  };
}

// ===================== Extrator =====================
function extrairEmprestimos(json) {
  if (Array.isArray(json.contratos)) {
    return json.contratos.filter(c => (c.situacao || "").toLowerCase() === "ativo");
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
      let contratos = extrairEmprestimos(extrato);

      // Ajusta se houver margem extrapolada negativa
      if (toNumber(extrato?.margens?.extrapolada) < 0) {
        contratos = ajustarParcelasPorMargem(contratos, extrato.margens.extrapolada);
      }

      const calculados = contratos
        .map(c => calcularParaContrato(c))
        .filter(Boolean)
        .sort((a, b) => toNumber(b.troco) - toNumber(a.troco));

      if (calculados.length === 0) {
        return res.json({ mensagem: "Cliente não tem contrato elegível" });
      }

      const bancos = calculados.map(c => bancosMap[c.banco || ""] || c.banco || "");
      const parcelas = calculados.map(c => c.parcela);
      const taxas = calculados.map(c => c.taxa_aplicada);
      const saldos = calculados.map(c => c.saldo_devedor);
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
          total_troco: totalTroco.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          total_contratos_simulados: calculados.length
        }
      });
    } catch (err) {
      console.error("Erro /calcular", err);
      res.status(500).json({ error: "Erro interno no cálculo", detalhe: err.message });
    }
  };
}
