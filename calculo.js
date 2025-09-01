const fs = require("fs");

// ... [utils iguais de antes: toNumber, parseBRDate, coeficienteDiario etc.] ...

function calcular(filePath) {
  const extrato = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const dataExtrato = extrato.data_extrato || todayBR();

  const taxas = [1.85, 1.79, 1.66];
  let resultados = [];

  extrato.contratos.forEach(c => {
    const dataProposta = dataExtrato;
    const parcela = toNumber(c.parcela);
    const prazoRestante = parseInt(c.prazo_restante || 0, 10);

    let saldoDevedor, valorEmprestimo, troco, taxaUsada;

    for (let taxa of taxas) {
      const coef = coeficienteDiario(taxa, prazoRestante, dataProposta);
      saldoDevedor = (coef > 0 && parcela > 0) ? (parcela / coef) : NaN;
      valorEmprestimo = (coef > 0 && parcela > 0) ? (parcela / coef) : NaN;
      troco = valorEmprestimo - saldoDevedor;
      taxaUsada = taxa;

      if (troco >= 100) break;
    }

    if (troco > 0) {
      resultados.push({
        contrato: c.numero,
        banco: c.banco,
        parcela: +parcela.toFixed(2),
        saldo_devedor: +saldoDevedor.toFixed(2),
        valor_emprestimo: +valorEmprestimo.toFixed(2),
        troco: +troco.toFixed(2),
        taxa_utilizada: taxaUsada
      });
    }
  });

  const trocoTotal = resultados.reduce((s,r) => s + r.troco, 0);
  const bancos = resultados.map(r => r.banco).join(", ");
  const parcelas = resultados.map(r => r.parcela.toFixed(2)).join(", ");
  const saldos = resultados.map(r => r.saldo_devedor.toFixed(2)).join(", ");

  return {
    data_extrato: dataExtrato,
    trocos: resultados,
    troco_total: +trocoTotal.toFixed(2),
    resumo: {
      bancos,
      parcelas,
      saldos_devedor: saldos
    }
  };
}

module.exports = { calcular };
