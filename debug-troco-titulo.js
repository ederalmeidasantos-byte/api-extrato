// Debug do cálculo do troco no título
console.log("🔍 DEBUG DO CÁLCULO DO TROCO NO TÍTULO");

// Simular o cálculo do troco para o contrato 0063476189
const contrato = {
    contrato: "0063476189",
    valor_parcela: "470,64",  // Parcela original
    taxa_juros_mensal: "1,78", // Taxa original
    saldo_devedor: 17561.36   // Saldo calculado corretamente
};

console.log("📊 Dados do contrato:");
console.log(`   Contrato: ${contrato.contrato}`);
console.log(`   Parcela: "${contrato.valor_parcela}"`);
console.log(`   Taxa: "${contrato.taxa_juros_mensal}"`);
console.log(`   Saldo Devedor: ${contrato.saldo_devedor}`);

// Simular o cálculo do troco com taxa 1.66% (C6)
const taxa = 1.66;
const coeficiente = 0.021434; // Coeficiente C6 para taxa 1.66%

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
    return Number(n).toLocaleString("pt-BR", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
}

const parcelaOriginal = toNumber(contrato.valor_parcela);
const valorEmprestimo = parcelaOriginal / coeficiente;
const troco = valorEmprestimo - contrato.saldo_devedor;

console.log(`\n💰 Cálculo do troco:`);
console.log(`   Parcela Original: ${parcelaOriginal}`);
console.log(`   Coeficiente C6 (1.66%): ${coeficiente}`);
console.log(`   Valor Empréstimo: ${valorEmprestimo.toFixed(2)}`);
console.log(`   Saldo Devedor: ${contrato.saldo_devedor}`);
console.log(`   Troco: ${troco.toFixed(2)}`);

console.log(`\n🎯 Resultado formatado:`);
console.log(`   Troco formatado: "R$ ${formatBRNumber(Math.max(0, troco))}"`);

// Verificar se o problema é que o troco deveria ser muito maior
console.log(`\n🤔 Análise:`);
if (troco < 100) {
    console.log(`   ⚠️  Troco muito baixo: R$ ${formatBRNumber(troco)}`);
    console.log(`   ⚠️  Talvez deveria ser R$ ${formatBRNumber(troco * 1000)} ?`);
}

if (troco > 1000) {
    console.log(`   ✅ Troco alto: R$ ${formatBRNumber(troco)}`);
}

console.log(`\n📝 Conclusão:`);
console.log(`   Se o troco no título está aparecendo como "R$ 2,90"`);
console.log(`   Isso pode indicar que:`);
console.log(`   1. O saldo devedor está incorreto (muito alto)`);
console.log(`   2. A parcela está incorreta (muito baixa)`);
console.log(`   3. O coeficiente está incorreto`);
console.log(`   4. O cálculo está sendo feito com dados errados`);
