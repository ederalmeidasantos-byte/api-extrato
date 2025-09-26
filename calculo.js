import fs from "fs";
import path from "path";
import RoteiroBancos from "./RoteiroBancos.js";

// ===================== Configurações =====================
const TROCO_MINIMO = 100;
const ORDEM_BANCOS = ["FINANTO", "C6", "PICPAY", "BRB", "DAYCOVAL", "FINTECH", "DIGIO", "INBURSA", "FACTA" ];
const PRAZO_SIMULADO = 96;

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
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function formatBRNumber(n) {
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatBRTaxaPercent(nPercent) {
  return Number(nPercent).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function diaFromExtrato(extrato) {
  const d = (extrato && extrato.data_extrato) || null;
  if (d) {
    const dd = d.split("/")[0];
    if (dd) return dd.padStart(2, "0");
  }
  const x = new Date();
  return String(x.getDate()).padStart(2, "0");
}

// ===================== Coeficiente 96x =====================
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

// ===================== PV série uniforme =====================
function pvFromParcela(parcela, taxaPercentMes, n) {
  const i = Number(taxaPercentMes) / 100;
  if (!(i > 0) || !(n > 0)) return 0;
  const fator = (1 - Math.pow(1 + i, -n)) / i;
  return parcela * fator;
}

// ===================== Estimar taxa de juros =====================
function estimarTaxaPorValorPago(valorLiberado, prazoTotal, valorParcela) {
  const pv = toNumber(valorLiberado);
  const n = toNumber(prazoTotal);
  const pmt = toNumber(valorParcela);
  if (!(pv > 0) || !(n > 0) || !(pmt > 0)) return 0;

  let i = 0.02;
  for (let k = 0; k < 50; k++) {
    const denom = i === 0 ? 1e-9 : i;
    const f = pmt * (1 - Math.pow(1 + denom, -n)) / denom - pv;
    if (Math.abs(f) < 1e-7) break;

    const h = 1e-5;
    const ip = denom + h;
    const fp = pmt * (1 - Math.pow(1 + ip, -n)) / ip - pv;
    const fPrime = (fp - f) / h;

    if (!Number.isFinite(fPrime) || Math.abs(fPrime) < 1e-12) break;
    i = i - f / fPrime;
    if (!Number.isFinite(i) || i <= 0 || i > 1) i = 0.01;
  }
  return i * 100;
}

// ===================== Ajuste de Margem Extrapolada =====================
function aplicarAjusteMargemExtrapolada(contratos, extrapoladaAbs) {
  if (!(extrapoladaAbs > 0) || !Array.isArray(contratos) || contratos.length === 0) {
    return { contratosAjustados: contratos, info: null };
  }

  const ordenados = [...contratos].sort((a, b) => toNumber(b.valor_parcela) - toNumber(a.valor_parcela));
  const maior = ordenados[0];
  if (!maior) return { contratosAjustados: contratos, info: null };

  const original = toNumber(maior.valor_parcela);
  const nova = Math.max(0, original - extrapoladaAbs);

  const ajustados = contratos.map(c => {
    if (c.contrato === maior.contrato) {
      return {
        ...c,
        __parcela_original__: formatBRNumber(original),
        valor_parcela: formatBRNumber(nova)
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

// ===================== Validação de espécie e bancos =====================
// regra simples: limita lista de bancos a testar por espécie (coloque aqui as regras especiais)
function bancosPermitidosPorEspecie(especie) {
  if (especie === "87") return ["BRB", "PICPAY", "C6"];
  if (especie === "88") return ["FINANTO", "BRB", "PICPAY", "C6"];
  return ORDEM_BANCOS;
}

// ===================== Validar contrato pelo roteiro (por banco alvo) =====================
function aplicarRoteiro(c, banco) {
  const roteiro = RoteiroBancos[banco];
  if (!roteiro) return { valido: false, motivo: "Banco não encontrado no roteiro" };

  const saldo = toNumber(c.saldo_devedor);

  // Saldo devedor mínimo
  if (typeof roteiro.saldoDevedorMinimo === "number" && saldo < roteiro.saldoDevedorMinimo) {
    return { valido: false, motivo: `Saldo devedor abaixo do mínimo (${roteiro.saldoDevedorMinimo}) - ${banco}` };
  }

  // Espécie (usa c.especie que deve vir do extrato / posProcessamento)
  const codigoBeneficio = String(c.especie || "");
  if (roteiro.especiesAceitas) {
    const { todas, exceto } = roteiro.especiesAceitas;
    if (Array.isArray(exceto) && exceto.includes(codigoBeneficio)) {
      return { valido: false, motivo: `Espécie ${codigoBeneficio} não permitida pelo banco ${banco}` };
    }
    // Se houver configuração mais restritiva (todas=false) e houver lista de aceitas, adaptar aqui.
    // Pelo formato que temos hoje normalmente usamos { todas: true } ou { todas: true, exceto: [...] }.
  }

  // Parcela mínima (agora por banco, não global)
  if (typeof roteiro.parcelaMinima === "number") {
    const parcelaNum = toNumber(c.valor_parcela);
    if (parcelaNum < roteiro.parcelaMinima) {
      return { valido: false, motivo: `Parcela abaixo da mínima (${roteiro.parcelaMinima}) - ${banco}` };
    }
  }

  // Parcelas pagas considerando EXCEÇÃO por banco de origem (c.banco.codigo)
  const parcelasPagas = Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0;
  let regraParcelas = Number(roteiro.regraGeral?.split(" ")[0] || 0);

  if (Array.isArray(roteiro.excecoes)) {
    const excecao = roteiro.excecoes.find(e => String(e.codigo) === String(c.banco?.codigo));
    if (excecao) {
      const parsed = Number(String(excecao.regra || "0").replace(/\D/g, "")) || regraParcelas;
      regraParcelas = parsed;
    }
  }

  if (parcelasPagas < regraParcelas) {
    return {
      valido: false,
      motivo: `Parcelas pagas abaixo do mínimo (${regraParcelas}) - banco de origem: ${c.banco?.nome || "N/A"} (código ${c.banco?.codigo || "N/A"})`
    };
  }

  // Banco de origem não permitido (naoPorta)
  if (Array.isArray(roteiro.naoPorta) &&
      roteiro.naoPorta.some(b => String(b.codigo) === String(c.banco?.codigo))) {
    return { valido: false, motivo: `Banco de origem não permitido (${c.banco?.nome || "N/A"})` };
  }

  return { valido: true, motivo: null };
}

// ===================== Calcular contrato =====================
function calcularParaContrato(c, diaAverbacao, bancosPrioridade, simulacoes, extrapolada = false, extrapoladaAbs = 0) {
  if (!c || (c.situacao && c.situacao.toLowerCase() !== "ativo")) {
    return { contrato: c?.contrato, motivo: "etapa 0: contrato não ativo" };
  }

  // assegura que c.especie esteja preenchida (vem do extrato no endpoint)
  c.especie = String(c.especie || c.beneficio?.codigoBeneficio || "");

  const parcelaOriginal = toNumber(c.__parcela_original__ || c.valor_parcela);
  const parcelaAjustada = toNumber(c.valor_parcela);

  const totalParcelas = Number.isFinite(+c.prazo_total) ? +c.prazo_total : (toNumber(c.qtde_parcelas) || 0);
  const prazoRestante = Number.isFinite(+c.prazo_restante) ? +c.prazo_restante : totalParcelas;

  const permite32 = c.especie === "32";

  // Se desejar permitir regra específica para espécie 32 etc, já existe verificaçao de parcela mínima por banco
  if (parcelaOriginal <= 0 && !permite32) {
    return {
      contrato: c.contrato,
      motivo: `etapa 1: parcela original inválida (${formatBRNumber(parcelaOriginal)})`,
      parcela: formatBRNumber(parcelaAjustada),
      saldo_devedor: formatBRNumber(toNumber(c.saldo_devedor)),
      prazo_total: totalParcelas,
      parcelas_pagas: Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0
    };
  }

  const saldoDevedor = simulacoes[c.contrato]?.saldoDevedor ?? pvFromParcela(parcelaOriginal, toNumber(c.taxa_juros_mensal), prazoRestante);

  let taxaAtualMes = simulacoes[c.contrato]?.taxaAtualMes ?? toNumber(c.taxa_juros_mensal);
  let statusTaxa = c.status_taxa || null;

  if (!(taxaAtualMes > 0)) {
    const estimada = estimarTaxaPorValorPago(c.valor_liberado, totalParcelas, parcelaOriginal);
    if (estimada > 0) {
      taxaAtualMes = estimada;
      statusTaxa = "RECALCULADA_VALOR_PAGO";
    } else {
      return {
        contrato: c.contrato,
        motivo: "etapa 4: falha ao calcular taxa",
        parcela: formatBRNumber(parcelaAjustada),
        saldo_devedor: formatBRNumber(saldoDevedor),
        prazo_total: totalParcelas,
        parcelas_pagas: Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0
      };
    }
  }

  // ===================== Bancos de simulação (prioridade baseada na espécie) =====================
  const bancosParaTestar = extrapolada ? ["BRB"] : bancosPermitidosPorEspecie(c.especie);

  console.log(`[SIMULAÇÃO] Contrato ${c.contrato} - Espécie: ${c.especie || "-"} - Bancos permitidos: ${bancosParaTestar.join(", ")} - Banco origem: ${c.banco?.nome || "N/A"} (código ${c.banco?.codigo || "N/A"}) - Parcelas pagas: ${c.parcelas_pagas}`);

  let escolhido = null;
  let motivoBloqueio = null;

  for (const banco of bancosParaTestar) {
    const aplicacao = aplicarRoteiro({ ...c, saldo_devedor: saldoDevedor }, banco);

    if (!aplicacao.valido) {
      motivoBloqueio = aplicacao.motivo;
      console.log(`[BLOQUEIO] Banco ${banco} não aplicável para contrato ${c.contrato}: ${motivoBloqueio}`);
      continue;
    }

    const roteiro = RoteiroBancos[banco];
    const taxasPermitidas = roteiro?.taxas || [];
    for (const tx of taxasPermitidas) {
      const coefNovo = getCoeficiente(tx, diaAverbacao);
      if (!coefNovo) continue;

      const valorEmprestimo = parcelaAjustada / coefNovo;
      const troco = valorEmprestimo - saldoDevedor;

      if (Number.isFinite(troco) && troco >= TROCO_MINIMO) {
        escolhido = {
          bancoNovo: banco,
          taxaSelecionada: tx,
          coeficiente_usado: coefNovo,
          saldoDevedor,
          valorEmprestimo,
          troco
        };
        console.log(`[ESCOLHIDO] Banco ${banco} - Troco: ${formatBRNumber(troco)} - Parcela paga: ${c.parcelas_pagas} - Banco de origem: ${c.banco?.nome || "N/A"} (código ${c.banco?.codigo || "N/A"})`);
        break;
      } else {
        motivoBloqueio = `Troco (${formatBRNumber(troco)}) menor que mínimo (${TROCO_MINIMO}) - banco ${banco} taxa ${tx}`;
      }
    }
    if (escolhido) break;
  }

  if (!escolhido) {
    return {
      contrato: c.contrato,
      motivo: motivoBloqueio || "Nenhum banco/taxa elegível",
      parcela: formatBRNumber(parcelaAjustada),
      saldo_devedor: formatBRNumber(saldoDevedor),
      prazo_total: totalParcelas,
      parcelas_pagas: Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0
    };
  }

  return {
    banco: c.banco,
    bancoNovo: escolhido.bancoNovo,
    contrato: c.contrato,
    parcela_original: formatBRNumber(parcelaOriginal),
    parcela: formatBRNumber(parcelaAjustada),
    prazo_total: totalParcelas,
    parcelas_pagas: Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0,
    prazo_restante: prazoRestante,
    prazo_simulado: PRAZO_SIMULADO,
    taxa_atual: formatBRTaxaPercent(taxaAtualMes),
    taxa_atual_anual: formatBRTaxaPercent((Math.pow(1 + taxaAtualMes / 100, 12) - 1) * 100),
    status_taxa: statusTaxa,
    taxa_calculada: formatBRTaxaPercent(escolhido.taxaSelecionada),
    coeficiente_usado: escolhido.coeficiente_usado,
    saldo_devedor: formatBRNumber(escolhido.saldoDevedor),
    valor_emprestimo: formatBRNumber(escolhido.valorEmprestimo),
    troco: formatBRNumber(escolhido.troco),
    data_contrato: c.data_contrato || c.data_inclusao || null,
    motivo: null
  };
}

// ===================== Extrator =====================
function extrairEmprestimos(json) {
  if (Array.isArray(json.contratos)) {
    return json.contratos.filter(c => (c.situacao || "").toLowerCase() === "ativo");
  }
  return [];
}

// ===================== Endpoint =====================
export function calcularTrocoEndpoint(JSON_DIR) {
  return (_req, res) => {
    try {
      const fileId = _req?.params?.fileId ?? "local";
      const jsonPath = path.join(JSON_DIR, `extrato_${fileId}.json`);
      if (!fs.existsSync(jsonPath)) {
        return res.status(404).json({ error: "Extrato não encontrado (pode ter expirado)" });
      }

      const extrato = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
      let contratosAtivos = extrairEmprestimos(extrato);
      const diaAverbacao = diaFromExtrato(extrato);

      // ***** AQUI: garantir que cada contrato tenha a espécie vinda do EXTRATO (conforme combinado) *****
      for (const c of contratosAtivos) {
        c.especie = String(extrato?.beneficio?.codigoBeneficio || c.beneficio?.codigoBeneficio || c.especie || "");
      }

      const simulacoes = {};
      for (const c of contratosAtivos) {
        const parcelaOriginal = toNumber(c.__parcela_original__ || c.valor_parcela);
        const totalParcelas = Number.isFinite(+c.prazo_total) ? +c.prazo_total : (toNumber(c.qtde_parcelas) || 0);
        const prazoRestante = Number.isFinite(+c.prazo_restante) ? +c.prazo_restante : totalParcelas;

        let taxaAtualMes = toNumber(c.taxa_juros_mensal);
        if (!(taxaAtualMes > 0)) {
          const estimada = estimarTaxaPorValorPago(c.valor_liberado, totalParcelas, parcelaOriginal);
          if (estimada > 0) taxaAtualMes = estimada;
        }

        const saldoDevedor = pvFromParcela(parcelaOriginal, taxaAtualMes, prazoRestante);
        c.saldo_devedor = saldoDevedor;
        simulacoes[c.contrato] = { saldoDevedor, taxaAtualMes };
      }

      const extrap = (() => {
        const m = extrato?.margens || {};
        const candidates = [m.margem_extrapolada, m.extrapolada, extrato?.margem_extrapolada, extrato?.resumo?.margem_extrapolada];
        for (const v of candidates) {
          const n = toNumber(v);
          if (n > 0) return n;
        }
        return 0;
      })();

      let infoAjuste = null;
      if (extrap > 0) {
        const { contratosAjustados, info } = aplicarAjusteMargemExtrapolada(contratosAtivos, extrap);
        contratosAtivos = contratosAjustados;
        infoAjuste = info;
      }

      const calculados = contratosAtivos.map(c => calcularParaContrato(c, diaAverbacao, ORDEM_BANCOS, simulacoes, extrap > 0, extrap));

      const contratosValidos = calculados.filter(c => c && !c.motivo);
      const contratosInvalidos = calculados.filter(c => c && c.motivo);

      const ordenados = contratosValidos.sort((a, b) => toNumber(b.troco) - toNumber(a.troco));

      const bancosResumo = ordenados.map(c => c.bancoNovo || c.banco?.nome);
      const parcelas = ordenados.map(c => c.parcela);
      const parcelasOrig = ordenados.map(c => c.parcela_original);
      const taxas = ordenados.map(c => c.taxa_calculada);
      const saldos = ordenados.map(c => c.saldo_devedor);
      const totalTroco = ordenados.reduce((s, c) => s + toNumber(c.troco), 0);

      return res.json({
        fileId,
        matricula: extrato?.beneficio?.nb || null,
        contratos: ordenados,
        contratos_inativos: contratosInvalidos,
        resumo: {
          bancos: bancosResumo.join(", "),
          parcelas: parcelas.join(", "),
          parcelas_original: parcelasOrig.join(", "),
          taxas_calculadas: taxas.join(", "),
          saldos_devedores: saldos.join(", "),
          total_troco: formatBRNumber(totalTroco),
          total_contratos_simulados: ordenados.length,
          bancos_novos: [...new Set(bancosResumo)].join(", ")
        },
        ajuste_margem: infoAjuste || null
      });
    } catch (err) {
      console.error("Erro /calcular", err);
      res.status(500).json({ error: "Erro interno no cálculo", detalhe: err.message });
    }
  };
}
