// Debug da conversão de taxa no contrato
console.log("🔍 DEBUG DA CONVERSÃO DE TAXA NO CONTRATO");

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
    taxa_juros_mensal: "1,78"
};

console.log("📊 Estado inicial:");
console.log(`   Taxa Original: "${contrato.taxa_juros_mensal}" (${typeof contrato.taxa_juros_mensal})`);

// Simular todas as conversões que acontecem no código
console.log(`\n🔄 Simulando conversões:`);

// Conversão 1: Linha 311, 992, 1196
console.log(`1. Conversão (linhas 311, 992, 1196):`);
contrato.taxa_juros_mensal = toNumber(contrato.taxa_juros_mensal || 0);
console.log(`   Resultado: ${contrato.taxa_juros_mensal} (${typeof contrato.taxa_juros_mensal})`);

// Verificar se há algum problema com a conversão
console.log(`\n🔍 Verificações:`);
console.log(`   toNumber("1,78"): ${toNumber("1,78")}`);
console.log(`   toNumber("1.78"): ${toNumber("1.78")}`);
console.log(`   toNumber("1"): ${toNumber("1")}`);

// Verificar se há algum problema com parseFloat
console.log(`\n🔍 Comparação com parseFloat:`);
console.log(`   parseFloat("1,78"): ${parseFloat("1,78")}`);
console.log(`   parseFloat("1.78"): ${parseFloat("1.78")}`);
console.log(`   parseFloat("1"): ${parseFloat("1")}`);

// Verificar se há algum problema com a string
console.log(`\n🔍 Análise da string "1,78":`);
const taxaString = "1,78";
console.log(`   String: "${taxaString}"`);
console.log(`   Length: ${taxaString.length}`);
console.log(`   CharAt(0): "${taxaString.charAt(0)}"`);
console.log(`   CharAt(1): "${taxaString.charAt(1)}"`);
console.log(`   CharAt(2): "${taxaString.charAt(2)}"`);
console.log(`   CharAt(3): "${taxaString.charAt(3)}"`);
console.log(`   Includes(","): ${taxaString.includes(",")}`);
console.log(`   Includes("."): ${taxaString.includes(".")}`);

// Verificar se há algum problema com a conversão step by step
console.log(`\n🔍 Conversão step by step:`);
let s = taxaString.replace(/[R$\s%]/g, "").trim();
console.log(`   Após replace: "${s}"`);
const hasDot = s.includes(".");
const hasComma = s.includes(",");
console.log(`   hasDot: ${hasDot}, hasComma: ${hasComma}`);
if (hasDot && hasComma) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
} else if (hasComma) s = s.replace(/\./g, "").replace(",", ".");
console.log(`   Após processamento: "${s}"`);
const n = parseFloat(s);
console.log(`   parseFloat: ${n}`);
console.log(`   Number.isFinite: ${Number.isFinite(n)}`);
console.log(`   Resultado final: ${Number.isFinite(n) ? n : 0}`);
