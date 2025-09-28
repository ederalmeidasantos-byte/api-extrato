// Lógica de simulação para o Simulador INSS
import { RoteiroBancosSimulador } from './roteiro-bancos-simulador.js';
import { coeficientesSimulador } from './coeficientes-simulador.js';

const TROCO_MINIMO = 100;
const PRAZO_SIMULADO = 96;

// Função para formatar números em padrão brasileiro
export function formatBRNumber(n) {
  return Number(n).toLocaleString("pt-BR", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

// Função para converter string para número
export function toNumber(v) {
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
export function getCoeficiente(taxa, dia) {
  const tabela = coeficientesSimulador[Number(taxa).toFixed(2)];
  if (!tabela) return null;
  return (
    tabela[dia] ??
    tabela[String(+dia)] ??
    tabela["01"] ??
    tabela["1"] ??
    (Object.keys(tabela).length ? tabela[Object.keys(tabela)[0]] : null)
  );
}

// Função para validar contrato pelo roteiro
export function validarContrato(contrato, banco, especie) {
  const roteiro = RoteiroBancosSimulador[banco];
  if (!roteiro) return { valido: false, motivo: "Banco não encontrado no roteiro" };

  const saldo = toNumber(contrato.saldo);
  const parcela = toNumber(contrato.parcela);
  const parcelasPagas = toNumber(contrato.pagas);

  // 1. Saldo devedor mínimo
  if (typeof roteiro.saldoDevedorMinimo === "number" && saldo < roteiro.saldoDevedorMinimo) {
    return { 
      valido: false, 
      motivo: `Saldo devedor (R$ ${formatBRNumber(saldo)}) abaixo do mínimo (R$ ${formatBRNumber(roteiro.saldoDevedorMinimo)})` 
    };
  }

  // 2. Espécie permitida
  if (roteiro.especiesAceitas) {
    const { todas, exceto } = roteiro.especiesAceitas;
    if (Array.isArray(exceto) && exceto.includes(especie)) {
      return { valido: false, motivo: `Espécie ${especie} não permitida pelo banco ${banco}` };
    }
  }

  // 3. Parcela mínima
  if (typeof roteiro.parcelaMinima === "number" && parcela < roteiro.parcelaMinima) {
    return { 
      valido: false, 
      motivo: `Parcela (R$ ${formatBRNumber(parcela)}) abaixo da mínima (R$ ${formatBRNumber(roteiro.parcelaMinima)})` 
    };
  }

  // 4. Parcelas pagas (regra geral + exceções)
  let regraParcelas = Number(roteiro.regraGeral?.split(" ")[0] || 0);
  
  if (Array.isArray(roteiro.excecoes)) {
    const excecao = roteiro.excecoes.find(e => String(e.codigo) === String(contrato.bancoCodigo));
    if (excecao) {
      const parsed = Number(String(excecao.regra || "0").replace(/\D/g, "")) || regraParcelas;
      regraParcelas = parsed;
    }
  }

  if (parcelasPagas < regraParcelas) {
    return { 
      valido: false, 
      motivo: `Parcelas pagas (${parcelasPagas}) abaixo do mínimo (${regraParcelas})` 
    };
  }

  // 5. Banco de origem não permitido (naoPorta)
  if (Array.isArray(roteiro.naoPorta) && roteiro.naoPorta.some(b => String(b.codigo) === String(contrato.bancoCodigo))) {
    return { valido: false, motivo: `Banco de origem não permitido` };
  }

  return { valido: true, motivo: null };
}

// Função principal de simulação
export function simularContrato(contrato, especie, diaAverbacao = "15") {
  const resultados = [];
  const bancos = Object.keys(RoteiroBancosSimulador);
  
  bancos.forEach(bancoNome => {
    const roteiro = RoteiroBancosSimulador[bancoNome];
    const taxasPermitidas = roteiro?.taxas || [];
    
    // Validar contrato
    const validacao = validarContrato(contrato, bancoNome, especie);
    
    if (!validacao.valido) {
      resultados.push({
        banco: bancoNome,
        aprovado: false,
        motivo: validacao.motivo
      });
      return;
    }

    // Testar cada taxa
    let melhorResultado = null;
    let melhorTroco = 0;

    taxasPermitidas.forEach(taxa => {
      const coef = getCoeficiente(taxa, diaAverbacao);
      if (!coef) return;

      const valorEmprestimo = contrato.parcela / coef;
      const troco = valorEmprestimo - contrato.saldo;

      if (Number.isFinite(troco) && troco >= TROCO_MINIMO) {
        if (troco > melhorTroco) {
          melhorTroco = troco;
          melhorResultado = {
            banco: bancoNome,
            aprovado: true,
            troco: troco,
            taxa: taxa,
            valorEmprestimo: valorEmprestimo,
            coeficiente: coef
          };
        }
      }
    });

    if (melhorResultado) {
      resultados.push(melhorResultado);
    } else {
      resultados.push({
        banco: bancoNome,
        aprovado: false,
        motivo: `Troco insuficiente (mínimo: R$ ${formatBRNumber(TROCO_MINIMO)})`
      });
    }
  });

  return resultados;
}

// Função para simular todos os contratos selecionados
export function simularTodosContratos(contratos, especie, diaAverbacao = "15") {
  return contratos.map(contrato => {
    if (!contrato.selecionado) return contrato;
    
    const simulacao = simularContrato(contrato, especie, diaAverbacao);
    return {
      ...contrato,
      simulacao: simulacao
    };
  });
}

// Função para calcular resumo da simulação
export function calcularResumo(contratos) {
  const contratosSelecionados = contratos.filter(c => c.selecionado && c.simulacao);
  let totalTroco = 0;
  const bancosAgrupados = {};
  const motivosBloqueio = {};

  contratosSelecionados.forEach(contrato => {
    contrato.simulacao.forEach(result => {
      if (result.aprovado) {
        totalTroco += result.troco;
        if (!bancosAgrupados[result.banco]) {
          bancosAgrupados[result.banco] = 0;
        }
        bancosAgrupados[result.banco] += result.troco;
      } else {
        motivosBloqueio[result.motivo] = (motivosBloqueio[result.motivo] || 0) + 1;
      }
    });
  });

  return {
    totalTroco,
    bancosAgrupados,
    motivosBloqueio,
    contratosProcessados: contratosSelecionados.length
  };
}

export default {
  formatBRNumber,
  toNumber,
  getCoeficiente,
  validarContrato,
  simularContrato,
  simularTodosContratos,
  calcularResumo
};
