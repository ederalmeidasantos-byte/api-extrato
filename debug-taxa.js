// Debug completo da lógica de taxa
console.log("🔍 DEBUG COMPLETO DA LÓGICA DE TAXA");

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

// Simular o contrato exato
const contrato = {
    contrato: "0063476189",
    taxa_juros_mensal: "1,78",
    valor_liberado: "20.413,71",
    prazo_total: 84,
    valor_parcela: "470,64",
    parcelas_pagas: 22
};

console.log("📊 Dados do contrato:");
console.log(`   Contrato: ${contrato.contrato}`);
console.log(`   Taxa Original: "${contrato.taxa_juros_mensal}"`);
console.log(`   Valor Liberado: "${contrato.valor_liberado}"`);
console.log(`   Prazo Total: ${contrato.prazo_total}`);
console.log(`   Valor Parcela: "${contrato.valor_parcela}"`);
console.log(`   Parcelas Pagas: ${contrato.parcelas_pagas}`);

// Simular a lógica do calcularSaldoDevedor
console.log(`\n🧮 SIMULAÇÃO DA LÓGICA calcularSaldoDevedor:`);

const parcelaOriginal = toNumber(contrato.valor_parcela);
const prazoRestante = contrato.prazo_total - contrato.parcelas_pagas;
let taxaAtualMes = toNumber(contrato.taxa_juros_mensal);

console.log(`   Parcela Original: ${parcelaOriginal}`);
console.log(`   Prazo Restante: ${prazoRestante}`);
console.log(`   Taxa Atual Mes: ${taxaAtualMes}`);

// Verificar condições
console.log(`\n🔍 VERIFICAÇÃO DAS CONDIÇÕES:`);
console.log(`   taxaAtualMes > 0: ${taxaAtualMes > 0}`);
console.log(`   !(taxaAtualMes > 0): ${!(taxaAtualMes > 0)}`);
console.log(`   contrato.valor_liberado: "${contrato.valor_liberado}"`);
console.log(`   contrato.prazo_total: ${contrato.prazo_total}`);

if (!(taxaAtualMes > 0) && contrato.valor_liberado && contrato.prazo_total) {
    console.log(`   ❌ VAI ESTIMAR TAXA!`);
} else {
    console.log(`   ✅ NÃO VAI ESTIMAR TAXA`);
}

// Simular a lógica do calcularParaContrato
console.log(`\n🧮 SIMULAÇÃO DA LÓGICA calcularParaContrato:`);

let taxaAtualMes2 = toNumber(contrato.taxa_juros_mensal);
console.log(`   Taxa Atual Mes 2: ${taxaAtualMes2}`);

if (!(taxaAtualMes2 > 0)) {
    console.log(`   ❌ VAI ESTIMAR TAXA NO calcularParaContrato!`);
} else {
    console.log(`   ✅ NÃO VAI ESTIMAR TAXA NO calcularParaContrato`);
}

// Verificar se há algum problema com a conversão
console.log(`\n🔢 TESTE DE CONVERSÃO DETALHADO:`);
console.log(`   toNumber("1,78"): ${toNumber("1,78")}`);
console.log(`   toNumber("1.78"): ${toNumber("1.78")}`);
console.log(`   toNumber("1"): ${toNumber("1")}`);
console.log(`   toNumber(""): ${toNumber("")}`);
console.log(`   toNumber(null): ${toNumber(null)}`);
console.log(`   toNumber(undefined): ${toNumber(undefined)}`);

// Verificar se o problema está em outro lugar
console.log(`\n🔍 VERIFICAÇÃO ADICIONAL:`);
console.log(`   typeof contrato.taxa_juros_mensal: ${typeof contrato.taxa_juros_mensal}`);
console.log(`   contrato.taxa_juros_mensal === "1,78": ${contrato.taxa_juros_mensal === "1,78"}`);
console.log(`   contrato.taxa_juros_mensal.length: ${contrato.taxa_juros_mensal.length}`);
