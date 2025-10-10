// Função para corrigir CPF automaticamente
function corrigirCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    if (cpf.length !== 11) return cpf;
    
    // Verificar se já é válido
    if (isValidCPF(cpf)) return cpf;
    
    // Tentar corrigir os dígitos verificadores
    const primeiros9 = cpf.substring(0, 9);
    
    // Calcular primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(primeiros9.charAt(i)) * (10 - i);
    }
    let primeiroDigito = 11 - (sum % 11);
    if (primeiroDigito === 10 || primeiroDigito === 11) primeiroDigito = 0;
    
    // Calcular segundo dígito verificador
    let cpfCom10 = primeiros9 + primeiroDigito;
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpfCom10.charAt(i)) * (11 - i);
    }
    let segundoDigito = 11 - (sum % 11);
    if (segundoDigito === 10 || segundoDigito === 11) segundoDigito = 0;
    
    const cpfCorrigido = cpfCom10 + segundoDigito;
    
    console.log(`🔧 CPF corrigido: ${cpf} → ${cpfCorrigido}`);
    return cpfCorrigido;
}

// Função de validação do CPF (mantém a original)
function isValidCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}
