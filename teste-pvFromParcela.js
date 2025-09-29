// Teste da função pvFromParcela
console.log("🧮 TESTE DA FUNÇÃO pvFromParcela");

function pvFromParcela(parcela, taxaPercentMes, n) {
    const i = Number(taxaPercentMes) / 100;
    if (!(i > 0) || !(n > 0)) return 0;
    const fator = (1 - Math.pow(1 + i, -n)) / i;
    return parcela * fator;
}

// Dados do contrato
const parcela = 470.00;
const taxa = 1.85;
const prazoRestante = 74; // 96 - 22 = 74

console.log("📊 Dados para cálculo:");
console.log(`   Parcela: R$ ${parcela}`);
console.log(`   Taxa: ${taxa}%`);
console.log(`   Prazo Restante: ${prazoRestante} parcelas`);

// Cálculo do saldo devedor
const saldoDevedor = pvFromParcela(parcela, taxa, prazoRestante);

console.log(`\n💰 Cálculo do saldo devedor:`);
console.log(`   Taxa decimal: ${taxa / 100}`);
console.log(`   Fator: ${((1 - Math.pow(1 + taxa/100, -prazoRestante)) / (taxa/100)).toFixed(6)}`);
console.log(`   Saldo Devedor: R$ ${saldoDevedor.toFixed(2)}`);

// Comparação com coeficiente
const coeficiente = 0.022974;
const valorEmprestimo = parcela / coeficiente;
const troco = valorEmprestimo - saldoDevedor;

console.log(`\n🎯 Comparação:`);
console.log(`   Valor Empréstimo (coeficiente): R$ ${valorEmprestimo.toFixed(2)}`);
console.log(`   Saldo Devedor (pvFromParcela): R$ ${saldoDevedor.toFixed(2)}`);
console.log(`   Troco: R$ ${troco.toFixed(2)}`);

// Verificação
if (troco > 0) {
    console.log(`\n✅ RESULTADO POSITIVO!`);
    console.log(`   O contrato pode ser aprovado com troco de R$ ${troco.toFixed(2)}`);
} else {
    console.log(`\n❌ RESULTADO NEGATIVO!`);
    console.log(`   O contrato não pode ser aprovado (troco negativo)`);
}
