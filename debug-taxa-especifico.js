// Debug específico do problema da taxa
console.log("🔍 DEBUG ESPECÍFICO DO PROBLEMA DA TAXA");

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

console.log("📊 Estado inicial do contrato:");
console.log(`   Taxa Original: "${contrato.taxa_juros_mensal}" (${typeof contrato.taxa_juros_mensal})`);

// Simular a conversão que acontece nas linhas 311, 992, 1196
console.log(`\n🔄 Simulando conversão (linhas 311, 992, 1196):`);
contrato.taxa_juros_mensal = toNumber(contrato.taxa_juros_mensal || 0);
console.log(`   Taxa após toNumber(): ${contrato.taxa_juros_mensal} (${typeof contrato.taxa_juros_mensal})`);

// Simular a verificação da linha 745
console.log(`\n🔍 Simulando verificação (linha 745):`);
console.log(`   !contrato.taxa_juros_mensal: ${!contrato.taxa_juros_mensal}`);
console.log(`   contrato.taxa_juros_mensal === 0: ${contrato.taxa_juros_mensal === 0}`);
console.log(`   Condição completa: ${!contrato.taxa_juros_mensal || contrato.taxa_juros_mensal === 0}`);

if (!contrato.taxa_juros_mensal || contrato.taxa_juros_mensal === 0) {
    console.log(`   ❌ PROBLEMA: Vai definir taxa padrão 1.85!`);
    contrato.taxa_juros_mensal = 1.85;
} else {
    console.log(`   ✅ OK: Não vai definir taxa padrão`);
}

console.log(`\n📊 Estado final do contrato:`);
console.log(`   Taxa Final: ${contrato.taxa_juros_mensal} (${typeof contrato.taxa_juros_mensal})`);

// Verificar se há algum problema com valores falsy
console.log(`\n🔍 Teste de valores falsy:`);
console.log(`   toNumber("0"): ${toNumber("0")}`);
console.log(`   toNumber("0,00"): ${toNumber("0,00")}`);
console.log(`   toNumber(""): ${toNumber("")}`);
console.log(`   toNumber(null): ${toNumber(null)}`);
console.log(`   toNumber(undefined): ${toNumber(undefined)}`);

// Verificar se há algum problema com a string "1,78"
console.log(`\n🔍 Teste específico com "1,78":`);
const testeTaxa = toNumber("1,78");
console.log(`   toNumber("1,78"): ${testeTaxa}`);
console.log(`   testeTaxa > 0: ${testeTaxa > 0}`);
console.log(`   !testeTaxa: ${!testeTaxa}`);
console.log(`   testeTaxa === 0: ${testeTaxa === 0}`);
