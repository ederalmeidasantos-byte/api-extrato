import fs from "fs";
import path from "path";
import RoteiroBancos from "./RoteiroBancos.js";

// ===================== Configurações =====================
const TROCO_MINIMO = 100;
const ORDEM_BANCOS = ["FINANTO", "C6", "PICPAY", "BRB", "DAYCOVAL", "INBURSA", "FINTECH", "DIGIO", "FACTA"];
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
    const f = (pmt * (1 - Math.pow(1 + denom, -n))) / denom - pv;
    if (Math.abs(f) < 1e-7) break;

    const h = 1e-5;
    const ip = denom + h;
    const fp = (pmt * (1 - Math.pow(1 + ip, -n))) / ip - pv;
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

  const ajustados = contratos.map((c) => {
    if (c.contrato === maior.contrato) {
      return {
        ...c,
        __parcela_original__: formatBRNumber(original),
        valor_parcela: formatBRNumber(nova),
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
      extrapolada_utilizada: formatBRNumber(extrapoladaAbs),
    },
  };
}

// ===================== Validação de espécie e bancos =====================
function bancosPermitidosPorEspecie(especie) {
  if (especie === "87") return ["BRB", "PICPAY", "C6"];
  if (especie === "88") return ["FINANTO", "BRB", "PICPAY", "C6"];
  return ORDEM_BANCOS;
}

function validarEspecieParaRoteiro(especie, roteiro) {
  if (!roteiro || !roteiro.especiesAceitas) return true;

  const ea = roteiro.especiesAceitas;
  if (ea.todas === true) {
    if (Array.isArray(ea.exceto) && ea.exceto.includes(String(especie))) {
      return false;
    }
    return true;
  }

  if (ea.todas === false) {
    if (Array.isArray(ea.permitidas)) {
      return ea.permitidas.includes(String(especie));
    }
    return false;
  }

  return true;
}

// ===================== Validar contrato pelo roteiro =====================
function aplicarRoteiro(c, banco) {
  const roteiro = RoteiroBancos[banco];
  if (!roteiro) return { valido: false, motivo: "Banco não encontrado" };

  const saldo = toNumber(c.saldo_devedor);
  if (typeof roteiro.saldoDevedorMinimo === "number" && saldo < roteiro.saldoDevedorMinimo) {
    return { valido: false, motivo: `Saldo mínimo (${roteiro.saldoDevedorMinimo}) - ${banco}` };
  }

  if (!validarEspecieParaRoteiro(c.especie, roteiro)) {
    return { valido: false, motivo: `Banco ${banco} não permitido esp ${c.especie}` };
  }

  const parcelasPagas = Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0;
  let regraParcelas = null;

  if (Array.isArray(roteiro.excecoes)) {
    const excecao = roteiro.excecoes.find((e) => String(e.codigo) === String(c.banco?.codigo));
    if (excecao && typeof excecao.regra === "string") {
      regraParcelas = Number(excecao.regra.split(" ")[0]);
    }
  }

  if (regraParcelas === null && Array.isArray(roteiro.excecoes)) {
    const demais = roteiro.excecoes.find((e) => e.nome.toLowerCase().includes("demais bancos"));
    if (demais && demais.regra) {
      regraParcelas = Number(demais.regra.split(" ")[0]);
    }
  }

  if (regraParcelas === null) {
    regraParcelas = Number(roteiro.regraGeral?.split(" ")[0] || 0);
  }

  if (parcelasPagas < regraParcelas) {
    return {
      valido: false,
      motivo: `Parcelas abaixo do mínimo (${regraParcelas}) - banco: ${c.banco?.nome || "N/A"} (código ${c.banco?.codigo || "N/A"})`,
    };
  }

  if (Array.isArray(roteiro.naoPorta) && roteiro.naoPorta.some((b) => String(b.codigo) === String(c.banco?.codigo))) {
    return { valido: false, motivo: `Banco não permitido (${c.banco?.nome || "N/A"})` };
  }

  return { valido: true, motivo: null };
}

// ===================== Calcular contrato =====================
function calcularParaContrato(c, diaAverbacao, simulacoes, extrapolada = false, extrapoladaAbs = 0) {
  if (!c || (c.situacao && c.situacao.toLowerCase() !== "ativo")) {
    return { contrato: c?.contrato, motivo: "Contrato não ativo", banco: c?.banco };
  }

  c.especie = String(c.especie || "");

  const parcelaOriginal = toNumber(c.__parcela_original__ || c.valor_parcela);
  const parcelaAjustada = toNumber(c.valor_parcela);
  const totalParcelas = Number.isFinite(+c.prazo_total) ? +c.prazo_total : toNumber(c.qtde_parcelas) || 0;
  const prazoRestante = Number.isFinite(+c.prazo_restante) ? +c.prazo_restante : totalParcelas;

  // Reforço da validação: bloqueia definitivamente contratos com parcela original < 25 (exceto espécie 32)
  if (parcelaOriginal < 25 && c.especie !== "32") {
    return {
      contrato: c.contrato,
      motivo: `Parcela (${formatBRNumber(parcelaOriginal)}) abaixo da mínima (25,00)`,
      parcela: formatBRNumber(parcelaAjustada),
      saldo_devedor: formatBRNumber(toNumber(c.saldo_devedor)),
      prazo_total: totalParcelas,
      parcelas_pagas: Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0,
      banco: c.banco,
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
        motivo: "Falha ao calcular taxa",
        parcela: formatBRNumber(parcelaAjustada),
        saldo_devedor: formatBRNumber(saldoDevedor),
        prazo_total: totalParcelas,
        parcelas_pagas: Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0,
        banco: c.banco,
      };
    }
  }

  // ===================== Bancos de simulação =====================
  const bancosParaSimular = bancosPermitidosPorEspecie(c.especie);
  let escolhido = null;

  // Armazena apenas a última taxa por banco
  const motivosBloqueio = {};

  for (const banco of bancosParaSimular) {
    const aplicacao = aplicarRoteiro({ ...c, saldo_devedor: saldoDevedor }, banco);

    if (!aplicacao.valido) {
      motivosBloqueio[banco] = aplicacao.motivo;
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
          troco,
        };
        break; // banco válido encontrado
      } else {
        // Sobrescreve apenas a última taxa testada para esse banco
        motivosBloqueio[banco] = `Troco (${formatBRNumber(troco)}) TX ${tx}`;
      }
    }
    if (escolhido) break;
  }

  // ===================== Contrato não elegível =====================
  if (!escolhido) {
    const todosMotivos = Object.entries(motivosBloqueio)
      .map(([banco, motivo]) => `${banco}: ${motivo}`)
      .join(" | ");
    return {
      contrato: c.contrato,
      motivo: `Nenhum banco/taxa elegível - motivos: ${todosMotivos}`,
      parcela: formatBRNumber(parcelaAjustada),
      saldo_devedor: formatBRNumber(saldoDevedor),
      prazo_total: totalParcelas,
      parcelas_pagas: Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0,
      banco: c.banco,
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
    motivo: null,
  };
}

// ===================== Extrator =====================
function extrairEmprestimos(json) {
  if (Array.isArray(json.contratos)) {
    const especieDoCliente = String(json?.beneficio?.codigoBeneficio || "");
    return json.contratos
      .filter((c) => (c.situacao || "").toLowerCase() === "ativo")
      .map((c) => ({
        ...c,
        especie: String(c.especie || especieDoCliente || ""),
      }));
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

      // =====================
      // FILTRAGEM: remover contratos com parcelaOriginal < 25 (exceto espécie "32")
      // e mantê-los em uma lista de inválidos para retornar ao cliente.
      // =====================
      const removidosPorParcela = [];
      let contratosParaSimular = [];
      for (const c of contratosAtivos) {
        const parcelaOriginal = toNumber(c.__parcela_original__ || c.valor_parcela);
        if (parcelaOriginal < 25 && String(c.especie || "") !== "32") {
          removidosPorParcela.push({
            contrato: c.contrato,
            motivo: `Parcela (${formatBRNumber(parcelaOriginal)}) abaixo da mínima (25,00)`,
            parcela: formatBRNumber(toNumber(c.valor_parcela)),
            saldo_devedor: formatBRNumber(toNumber(c.saldo_devedor)),
            prazo_total: Number.isFinite(+c.prazo_total) ? +c.prazo_total : toNumber(c.qtde_parcelas) || 0,
            parcelas_pagas: Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : 0,
            banco: c.banco,
          });
        } else {
          contratosParaSimular.push(c);
        }
      }

      // =====================
      // Simulações (para contratos válidos apenas)
      // =====================
      const simulacoes = {};
      for (const c of contratosParaSimular) {
        const parcelaOriginal = toNumber(c.__parcela_original__ || c.valor_parcela);
        const totalParcelas = Number.isFinite(+c.prazo_total) ? +c.prazo_total : toNumber(c.qtde_parcelas) || 0;
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

      // ===================== Extrapo/ajuste =====================
      const extrap = (() => {
        const m = extrato?.margens || {};
        const candidates = [
          m.margem_extrapolada,
          m.extrapolada,
          extrato?.margem_extrapolada,
          extrato?.resumo?.margem_extrapolada,
        ];
        for (const v of candidates) {
          const n = toNumber(v);
          if (n > 0) return n;
        }
        return 0;
      })();

      let infoAjuste = null;
      if (extrap > 0) {
        const { contratosAjustados, info } = aplicarAjusteMargemExtrapolada(contratosParaSimular, extrap);
        // substituir apenas os contratos que vamos simular
        contratosParaSimular = contratosAjustados; // OBS: sobrescreve a lista local para simulação
        infoAjuste = info;
      }

      // ===================== Calcular para cada contrato válido (apenas contratosParaSimular) =====================
      const calculados = contratosParaSimular.map((c) =>
        calcularParaContrato(c, diaAverbacao, simulacoes, extrap > 0, extrap)
      );

      // contratos inválidos por parcela (removidos antes) + calculados com motivo
      const calculadosInvalidos = calculados.filter((c) => c && c.motivo);
      const contratosInvalidos = [...removidosPorParcela, ...calculadosInvalidos];

      const contratosValidos = calculados.filter((c) => c && !c.motivo);

      const ordenados = contratosValidos.sort((a, b) => toNumber(b.troco) - toNumber(a.troco));

      const bancosResumo = ordenados.map((c) => c.bancoNovo || c.banco?.nome);
      const parcelas = ordenados.map((c) => c.parcela);
      const parcelasOrig = ordenados.map((c) => c.parcela_original);
      const taxas = ordenados.map((c) => c.taxa_calculada);
      const saldos = ordenados.map((c) => c.saldo_devedor);
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
          bancos_novos: [...new Set(bancosResumo)].join(", "),
        },
        ajuste_margem: infoAjuste || null,
      });
    } catch (err) {
      console.error("Erro /calcular", err);
      res.status(500).json({ error: "Erro interno no cálculo", detalhe: err.message });
    }
  };
}
