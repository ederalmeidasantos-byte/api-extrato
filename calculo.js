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

function formatBRNumber(n) {
  return Number(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatBRTaxaPercent(nPercent) {
  return Number(nPercent).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function diaFromExtrato(extrato) {
  // usa o dia do próprio extrato; se não tiver, usa “hoje”
  const d = (extrato && extrato.data_extrato) || null;
  if (d) {
    const dd = d.split("/")[0];
    if (dd) return dd.padStart(2, "0");
  }
  const x = new Date();
  return String(x.getDate()).padStart(2, "0");
}

// Coeficiente 96x
function getCoeficiente(tx, dia) {
  const tabela = coeficientes?.[Number(tx).toFixed(2)];
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

// ===================== Ajuste de Margem (extrapolada) =====================
// Regra: se extrapolada > 0, reduzir esse valor da MAIOR parcela (apenas 1 contrato).
function aplicarAjusteMargemExtrapolada(contratos, extrapoladaAbs) {
  if (!(extrapoladaAbs > 0) || !Array.isArray(contratos) || contratos.length === 0) return { contratosAjustados: contratos, info: null };

  const ordenados = [...contratos].sort(
    (a, b) => toNumber(b.valor_parcela) - toNumber(a.valor_parcela)
  );

  const maior = ordenados[0];
  if (!maior) return { contratosAjustados: contratos, info: null };

  const original = toNumber(maior.valor_parcela);
  const nova = Math.max(0, original - extrapoladaAbs);

  const ajustados = contratos.map(c => {
    if (c.contrato === maior.contrato) {
      return {
        ...c,
        __parcela_original__: formatBRNumber(original),
        valor_parcela: formatBRNumber(nova) // parcela passa a ser a AJUSTADA
      };
    }
    return c;
  });

  return {
    contratosAjustados: ajustados,
    info: {
      contrato: maior.contrato,
      parcela_original: formatBRNumber(original),
      parcela_ajustada: formatBRNumber(nova),
      extrapolada_utilizada: formatBRNumber(extrapoladaAbs)
    }
  };
}

// ===================== Cálculo do contrato =====================
function calcularParaContrato(c, diaAverbacao) {
  if (!c || (c.situacao && c.situacao.toLowerCase() !== "ativo")) return null;

  const parcelaBR = c.valor_parcela;
  const parcelaNum = toNumber(parcelaBR);
  if (!(parcelaNum >= 25)) return null;

  // Prazos (já vêm do extrair)
  const totalParcelas = Number.isFinite(+c.prazo_total) ? +c.prazo_total : (toNumber(c.qtde_parcelas) || 0);
  const prazoRestante = Number.isFinite(+c.prazo_restante) ? +c.prazo_restante : totalParcelas;

  // usa diretamente taxa do extrair.js
  const taxaCalcPercentMes = toNumber(c.taxa_juros_mensal);
  const pv = toNumber(c.valor_liberado);
  const saldoDevedor = pvFromParcela(parcelaNum, taxaCalcPercentMes, prazoRestante);

  // ===== Simulação novo contrato (sempre 96x) =====
  const ordemTaxas = [1.85, 1.79, 1.66];
  let escolhido = null;

  for (const tx of ordemTaxas) {
    const coefNovo = getCoeficiente(tx, diaAverbacao);
    if (!coefNovo) continue;

    const valorEmprestimo = parcelaNum / coefNovo;
    const troco = valorEmprestimo - saldoDevedor;

    if (Number.isFinite(troco) && troco >= 100) {
      escolhido = {
        taxaSelecionada: tx,
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
    parcela_original: c.__parcela_original__ || null,
    parcela: formatBRNumber(parcelaNum),
    prazo_total: totalParcelas,
    parcelas_pagas: Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0,
    prazo_restante: prazoRestante,

    // taxa atual já vinda do extrair
    taxa_atual: formatBRTaxaPercent(taxaCalcPercentMes),
    taxa_atual_anual: formatBRTaxaPercent((Math.pow(1 + taxaCalcPercentMes / 100, 12) - 1) * 100),

    // taxa adotada na simulação (1.85% | 1.79% | 1.66%)
    taxa_calculada: formatBRTaxaPercent(escolhido.taxaSelecionada),

    coeficiente_usado: escolhido.coeficiente_usado,
    saldo_devedor: formatBRNumber(escolhido.saldoDevedor),
    valor_emprestimo: formatBRNumber(escolhido.valorEmprestimo),
    troco: formatBRNumber(escolhido.troco),

    data_contrato: c.data_contrato || c.data_inclusao || null
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
      let contratosAtivos = extrairEmprestimos(extrato);

      // dia de averbação
      const diaAverbacao = diaFromExtrato(extrato);

      // ajuste de extrapolada
      const extrap = toNumber(extrato?.margens?.extrapolada);
      let infoAjuste = null;
      if (extrap > 0) {
        const { contratosAjustados, info } = aplicarAjusteMargemExtrapolada(contratosAtivos, extrap);
        contratosAtivos = contratosAjustados;
        infoAjuste = info;
      }

      // cálculo
      let calculados = [];
      if (infoAjuste) {
        const maiorAjustado = contratosAtivos.find(c => c.contrato === infoAjuste.contrato);
        const prim = calcularParaContrato(maiorAjustado, diaAverbacao);
        if (!prim) {
          return res.json({ mensagem: "Cliente não tem contrato elegível" });
        }
        calculados.push(prim);
        for (const c of contratosAtivos) {
          if (c.contrato === infoAjuste.contrato) continue;
          const r = calcularParaContrato(c, diaAverbacao);
          if (r) calculados.push(r);
        }
      } else {
        calculados = contratosAtivos.map(c => calcularParaContrato(c, diaAverbacao)).filter(Boolean);
      }

      calculados.sort((a, b) => toNumber(b.troco) - toNumber(a.troco));

      if (calculados.length === 0) {
        return res.json({ mensagem: "Cliente não tem contrato elegível" });
      }

      const bancos = calculados.map(c => bancosMap[c.banco || ""] || c.banco || "");
      const parcelas = calculados.map(c => c.parcela);
      const taxas = calculados.map(c => c.taxa_calculada);
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
