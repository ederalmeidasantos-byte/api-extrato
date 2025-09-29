import fs from 'fs';
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

import RoteiroBancos from './roteiro-bancos.js';

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

// Função principal de simulação (baseada no calculo (1).js)
function simularContrato(contrato, especie, diaAverbacao = "15") {
  const resultados = [];
  const bancos = bancosPermitidosPorEspecie(especie);
  
  // Calcular saldo devedor correto
  const parcelaOriginal = toNumber(contrato.parcela);
  const prazoRestante = contrato.prazo || contrato.prazo_total || 96;
  let taxaAtualMes = toNumber(contrato.taxa);
  
  // Se não tem taxa, estimar pelo valor pago
  if (!(taxaAtualMes > 0) && contrato.valorLiberado && contrato.prazoTotal) {
    taxaAtualMes = estimarTaxaPorValorPago(contrato.valorLiberado, contrato.prazoTotal, parcelaOriginal);
  }
  
  // Se ainda não tem taxa, usar padrão
  if (!(taxaAtualMes > 0)) {
    taxaAtualMes = 1.85; // Taxa padrão
  }
  
  const saldoDevedor = pvFromParcela(parcelaOriginal, taxaAtualMes, prazoRestante);
  
  // Armazena apenas a última taxa por banco
  const motivosBloqueio = {};
  
  for (const bancoNome of bancos) {
    const aplicacao = aplicarRoteiro({ ...contrato, saldo_devedor: saldoDevedor, especie: especie }, bancoNome);
    
    if (!aplicacao.valido) {
      motivosBloqueio[bancoNome] = aplicacao.motivo;
      resultados.push({
        banco: bancoNome,
        aprovado: false,
        motivo: aplicacao.motivo
      });
      continue;
    }

    const roteiro = RoteiroBancos[bancoNome];
    const taxasPermitidas = roteiro?.taxas || [];
    
    // Testar cada taxa
    let melhorResultado = null;
    let melhorTroco = 0;

    for (const taxa of taxasPermitidas) {
      const coef = getCoeficiente(taxa, diaAverbacao);
      if (!coef) continue;

      const valorEmprestimo = parcelaOriginal / coef;
      const troco = valorEmprestimo - saldoDevedor;

      if (Number.isFinite(troco) && troco >= TROCO_MINIMO) {
        melhorTroco = troco;
        melhorResultado = {
          banco: bancoNome,
          aprovado: true,
          troco: troco,
          taxa: taxa,
          valorEmprestimo: valorEmprestimo,
          coeficiente: coef,
          saldoDevedor: saldoDevedor,
          parcela: parcelaOriginal,
          parcelasPagas: contrato.pagas || 0
        };
        break; // banco válido encontrado
      } else {
        // Sobrescreve apenas a última taxa testada para esse banco
        motivosBloqueio[bancoNome] = `Troco (${formatBRNumber(troco)}) TX ${taxa}`;
      }
    }

    if (melhorResultado) {
      resultados.push(melhorResultado);
    } else {
      resultados.push({
        banco: bancoNome,
        aprovado: false,
        motivo: motivosBloqueio[bancoNome] || `Troco insuficiente (mínimo: R$ ${formatBRNumber(TROCO_MINIMO)})`
      });
    }
  }

  return resultados;
}

// Endpoint para calcular troco
function calcularTrocoEndpoint(req, res) {
  try {
    const { contratos, especie, diaAverbacao = "15" } = req.body;

    if (!contratos || !Array.isArray(contratos)) {
      return res.status(400).json({
        status: 'error',
        message: 'Lista de contratos é obrigatória'
      });
    }

    if (!especie) {
      return res.status(400).json({
        status: 'error',
        message: 'Espécie do benefício é obrigatória'
      });
    }

    const calculados = [];
    const contratosInvalidos = [];

    contratos.forEach((contrato, index) => {
      try {
        const simulacao = simularContrato(contrato, especie, diaAverbacao);
        calculados.push({
          ...contrato,
          simulacao: simulacao
        });
      } catch (error) {
        console.error(`Erro no contrato ${index}:`, error);
        contratosInvalidos.push({
          contrato: contrato.contrato || `Contrato ${index + 1}`,
          erro: error.message
        });
      }
    });

    // Calcular resumo
    const aprovados = calculados.filter(c => 
      c.simulacao && c.simulacao.some(s => s.aprovado)
    );

    const ordenados = aprovados.sort((a, b) => {
      const trocoA = Math.max(...a.simulacao.filter(s => s.aprovado).map(s => s.troco));
      const trocoB = Math.max(...b.simulacao.filter(s => s.aprovado).map(s => s.troco));
      return trocoB - trocoA;
    });

    // Agrupar por banco
    const bancosAgrupados = {};
    const motivosBloqueio = {};

    ordenados.forEach(contrato => {
      contrato.simulacao.forEach(result => {
        if (result.aprovado) {
          if (!bancosAgrupados[result.banco]) {
            bancosAgrupados[result.banco] = 0;
          }
          bancosAgrupados[result.banco] += result.troco;
        } else {
          motivosBloqueio[result.motivo] = (motivosBloqueio[result.motivo] || 0) + 1;
        }
      });
    });

    const totalTroco = Object.values(bancosAgrupados).reduce((sum, val) => sum + val, 0);

    return res.json({
      status: 'success',
      message: 'Simulação concluída',
      dados: {
        contratos: ordenados,
        contratosInvalidos: contratosInvalidos,
        resumo: {
          totalContratos: calculados.length,
          contratosAprovados: ordenados.length,
          totalTroco: totalTroco,
          bancosAgrupados: bancosAgrupados,
          motivosBloqueio: motivosBloqueio
        }
      },
      estatisticas: {
        bancos_agrupados: bancosAgrupados,
        motivos_bloqueio: motivosBloqueio,
        taxa_aprovacao: ordenados.length / (ordenados.length + contratosInvalidos.length) * 100,
        melhor_troco: ordenados.length > 0 ? formatBRNumber(Math.max(...ordenados.map(c => toNumber(c.troco)))) : "0,00",
        pior_troco: ordenados.length > 0 ? formatBRNumber(Math.min(...ordenados.map(c => toNumber(c.troco)))) : "0,00"
      },
      simulacao_info: {
        dia_averbacao: diaAverbacao,
        total_contratos_processados: calculados.length
      }
    });

  } catch (error) {
    console.error('Erro no cálculo:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Erro interno no cálculo',
      error: error.message
    });
  }
}

export {
  simularContrato,
  calcularTrocoEndpoint,
  formatBRNumber,
  toNumber,
  getCoeficiente,
  aplicarRoteiro,
  bancosPermitidosPorEspecie,
  validarEspecieParaRoteiro
};
