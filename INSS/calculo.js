import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar coeficientes
const coeficientesPath = path.join(__dirname, 'coeficientes_96.json');
let coeficientes = {};

try {
  coeficientes = JSON.parse(fs.readFileSync(coeficientesPath, 'utf8'));
} catch (error) {
  console.error('Erro ao carregar coeficientes:', error);
  // Coeficientes padrão se arquivo não existir
  coeficientes = {
    "1.66": { "15": 0.021434 },
    "1.79": { "15": 0.022488 },
    "1.85": { "15": 0.022974 }
  };
}

import { RoteiroBancosSimulador as RoteiroBancos } from './roteiro-bancos-simulador.js';

const TROCO_MINIMO = 100;
const PRAZO_SIMULADO = 96;
const ORDEM_BANCOS = ["FINANTO", "C6", "PICPAY", "BRB", "DAYCOVAL", "INBURSA", "FINTECH", "DIGIO", "FACTA"];

// Função para formatar números em padrão brasileiro
function formatBRNumber(n) {
  return Number(n).toLocaleString("pt-BR", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Função para converter string para número
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

// Função para obter coeficiente baseado na taxa e dia
function getCoeficiente(taxa, dia) {
  const tabela = coeficientes[Number(taxa).toFixed(2)];
  if (!tabela) return null;
  return (
    tabela[dia] ??
    tabela[String(+dia)] ??
    tabela["01"] ??
    tabela["1"] ??
    (Object.keys(tabela).length ? tabela[Object.keys(tabela)[0]] : null)
  );
}

// Função para calcular PV (Valor Presente) de uma série uniforme
function pvFromParcela(parcela, taxaPercentMes, n) {
  const i = Number(taxaPercentMes) / 100;
  if (!(i > 0) || !(n > 0)) return 0;
  const fator = (1 - Math.pow(1 + i, -n)) / i;
  return parcela * fator;
}

// Função para estimar taxa de juros por valor pago
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

// Função para bancos permitidos por espécie
function bancosPermitidosPorEspecie(especie) {
  if (especie === "87") return ["BRB", "PICPAY", "C6", "FACTA"];
  if (especie === "88") return ["FINANTO", "BRB", "PICPAY", "C6", "FACTA"];
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

// Função para aplicar roteiro (baseada no calculo (1).js)
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

  const parcelasPagas = Number.isFinite(+c.parcelas_pagas) ? +c.parcelas_pagas : (Number.isFinite(+c.pagas) ? +c.pagas : 0);
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

// ===================== Calcular contrato (baseado no calculoreserva.js) =====================
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

  // IMPORTANTE: Saldo devedor sempre usa a PARCELA ORIGINAL, não a ajustada
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

      // Valor do empréstimo usa parcela ajustada, mas troco compara com saldo da parcela original
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

// Função para formatar taxa em percentual
function formatBRTaxaPercent(nPercent) {
  return Number(nPercent).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Função para obter dia do extrato
function diaFromExtrato(extrato) {
  const d = (extrato && extrato.data_extrato) || null;
  if (d) {
    const dd = d.split("/")[0];
    if (dd) return dd.padStart(2, "0");
  }
  const x = new Date();
  return String(x.getDate()).padStart(2, "0");
}

// Função principal de simulação (mantida para compatibilidade)
function simularContrato(contrato, especie, diaAverbacao = "15", extrapolada = false) {
  // Converter para o formato esperado pelo calcularParaContrato
  const contratoFormatado = {
    contrato: contrato.contrato,
    valor_parcela: contrato.parcela,
    prazo_total: contrato.prazo || contrato.prazo_total || 96,
    parcelas_pagas: contrato.pagas || 0,
    taxa_juros_mensal: contrato.taxa,
    valor_liberado: contrato.valorLiberado,
    banco: contrato.banco,
    especie: especie,
    situacao: "ATIVO"
  };

  // Criar simulações mock
  const simulacoes = {};
  const resultado = calcularParaContrato(contratoFormatado, diaAverbacao, ORDEM_BANCOS, simulacoes, extrapolada, 0);
  
  // Converter resultado para formato esperado
  if (resultado.motivo) {
    return [{
      banco: "NENHUM",
        aprovado: false,
      motivo: resultado.motivo
    }];
  }
  
  return [{
    banco: resultado.bancoNovo,
    aprovado: true,
    troco: toNumber(resultado.troco),
    taxa: toNumber(resultado.taxa_calculada),
    valorEmprestimo: toNumber(resultado.valor_emprestimo),
    coeficiente: resultado.coeficiente_usado,
    saldoDevedor: toNumber(resultado.saldo_devedor),
    parcela: toNumber(resultado.parcela),
    parcelasPagas: resultado.parcelas_pagas
  }];
}

// ===================== Endpoint (baseado no calculoreserva.js) =====================
// Função para buscar propostaId relacionado ao fileId
function buscarPropostaId(fileId) {
  try {
    const propostasDir = path.join(__dirname, '..', 'var', 'data', 'propostas');
    if (!fs.existsSync(propostasDir)) return null;
    
    const propostas = fs.readdirSync(propostasDir).filter(f => f.endsWith('.json'));
    
    for (const propostaFile of propostas) {
      const propostaPath = path.join(propostasDir, propostaFile);
      const proposta = JSON.parse(fs.readFileSync(propostaPath, 'utf-8'));
      
      // Verificar se tem extratoId diretamente no objeto
      if (proposta.extratoId === fileId) {
        return proposta.id;
      }
      
      // Verificar se tem dados como string JSON
      if (proposta.dados) {
        const dadosProposta = JSON.parse(proposta.dados);
        if (dadosProposta.extratoId === fileId || dadosProposta.idoportunidade) {
          return proposta.id;
        }
      }
    }
  } catch (error) {
    console.log(`⚠️ [CALCULO] Erro ao buscar propostaId: ${error.message}`);
  }
  return null;
}

function calcularTrocoEndpoint(JSON_DIR) {
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

      // Sistema de simulações: calcular saldo devedor SEMPRE com parcela original
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

        // CRÍTICO: Saldo devedor sempre baseado na PARCELA ORIGINAL
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

      // Adicionar links seguindo o padrão do simulador
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? 'https://inss.lunasdigital.com.br' 
        : `http://localhost:${process.env.PORT || 3000}`;
      
      // Buscar propostaId relacionado ao fileId
      const propostaId = buscarPropostaId(fileId);
      
      // Link para o simulador geral (inss/simulador.html)
      const simulador_link = `${baseUrl}/inss/simulador.html`;
      
      // Link para detalhes da proposta específica
      const proposta_resumo_link = propostaId 
        ? `${baseUrl}/detalhesdaproposta/${propostaId}`
        : null;

      // Determinar status da simulação
      const status = ordenados.length > 0 ? "aprovado" : "não aprovado";
      const totalContratos = ordenados.length + contratosInvalidos.length;

      return res.json({
        fileId,
        matricula: extrato?.beneficio?.nb || null,
        status: status,
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
          total_contratos_processados: totalContratos,
          bancos_novos: [...new Set(bancosResumo)].join(", ")
        },
        ajuste_margem: infoAjuste || null,
        simulador_link: simulador_link,
        proposta_resumo_link: proposta_resumo_link
      });
    } catch (err) {
      console.error("Erro /calcular", err);
      res.status(500).json({ error: "Erro interno no cálculo", detalhe: err.message });
    }
  };
}

export {
  simularContrato,
  calcularParaContrato,
  calcularTrocoEndpoint,
  formatBRNumber,
  formatBRTaxaPercent,
  toNumber,
  getCoeficiente,
  aplicarRoteiro,
  bancosPermitidosPorEspecie,
  validarEspecieParaRoteiro,
  extrairEmprestimos,
  diaFromExtrato
};
