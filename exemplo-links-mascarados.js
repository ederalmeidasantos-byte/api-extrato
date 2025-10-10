// Exemplo de como usar o sistema de links mascarados

// Dados do cliente (que antes eram expostos na URL)
const clienteData = {
    nome: "EDEVALDO MACHADO JULIO",
    cpf: "52908994001",
    nascimento: "",
    telefone: "",
    email: "",
    nb: "5290899401",
    endereco: {
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: ""
    },
    beneficio: {
        nb: "5290899401",
        nomeBeneficio: "APOSENTADORIA POR INVALIDEZ PREVIDENCIARIA",
        codigoBeneficio: "88",
        especie: "32",
        origem: "INSS",
        dataExtrato: "08/10/2025",
        meio_pagamento: "Conta Corrente",
        banco_pagamento: "389",
        agencia: "1",
        conta: "0010180398"
    },
    margens: {
        margem_disponivel_empretimo: "0,00",
        margem_extrapolada: "0,00",
        margem_disponivel_rmc: "0,00",
        margem_disponivel_rcc: "0,00"
    },
    contratosExistentes: [{
        contrato: "808996770-389",
        banco: {
            codigo: "389",
            nome: "Mercantil do Brasil"
        },
        situacao: "ATIVO",
        data_inclusao: "08/04/2025",
        competencia_inicio_desconto: "05/2025",
        qtde_parcelas: 96,
        valor_parcela: "123,31",
        valor_liberado: "5.359,16",
        iof: "12,72",
        cet_mensal: "188,00",
        cet_anual: "2.505,00",
        taxa_juros_mensal: "1,85",
        taxa_juros_anual: "24,60",
        valor_pago: "5.016,33",
        primeiro_desconto: "10/06/2025",
        status_taxa: "INFORMADA_EXTRATO",
        prazo_total: 96,
        parcelas_pagas: 5,
        prazo_restante: 91,
        aprovado: true,
        id: 7,
        selecionado: true,
        simulacao: {
            aprovado: true,
            banco: "C6",
            troco: 358.31,
            taxa: 1.66,
            parcela: 123.31,
            parcelasPagas: 5,
            valorEmprestimo: 5753.01,
            coeficiente: 0.021434
        },
        troco: 358.31,
        editando: false,
        saldo_devedor: 5394.701161598548,
        especie: "32"
    }],
    dadosBancarios: {
        banco_pagamento: "389",
        agencia: "1",
        conta: "0010180398",
        meio_pagamento: "Conta Corrente"
    }
};

const contratosData = [{
    id: 1,
    banco: "Mercantil do Brasil",
    parcelas: 96,
    valorParcela: "R$ 123.31",
    taxa: "1.66%",
    troco: "R$ 358.31",
    editando: false
}];

const clientId = "cliente_1760104585807_7bmmjyxo8";
const proposalId = "proposta_1760104585807_nvu6kf69r";

// Função para criar link mascarado
async function criarLinkMascarado() {
    try {
        console.log("🔗 Criando link mascarado...");
        
        const response = await fetch('/api/criar-link-temporario', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clienteData,
                contratosData,
                clientId,
                proposalId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log("✅ Link mascarado criado:", result.maskedUrl);
            console.log("🔗 Link completo:", window.location.origin + result.maskedUrl);
            
            // Exemplo de uso: redirecionar para o link mascarado
            // window.location.href = result.maskedUrl;
            
            return result.maskedUrl;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error("❌ Erro ao criar link mascarado:", error);
        throw error;
    }
}

// Exemplo de uso
console.log("📋 Exemplo de uso do sistema de links mascarados:");
console.log("1. Chame criarLinkMascarado() para gerar um link temporário");
console.log("2. O link será algo como: /operacional/formulario-cliente.html?linkId=temp_1234567890_abc123def");
console.log("3. Os dados do cliente não aparecem na URL");
console.log("4. O link expira em 30 minutos");

// Para testar, descomente a linha abaixo:
// criarLinkMascarado();
