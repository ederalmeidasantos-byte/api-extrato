    // Função para verificar se CPF pode ser corrigido
    canFixCPF(cpf) {
        cpf = cpf.replace(/\D/g, "");
        if (cpf.length !== 11) return false;
        const primeiros9 = cpf.substring(0, 9);
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(primeiros9.charAt(i)) * (10 - i);
        }
        let primeiroDigito = 11 - (sum % 11);
        if (primeiroDigito === 10 || primeiroDigito === 11) primeiroDigito = 0;
        let cpfCom10 = primeiros9 + primeiroDigito;
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpfCom10.charAt(i)) * (11 - i);
        }
        let segundoDigito = 11 - (sum % 11);
        if (segundoDigito === 10 || segundoDigito === 11) segundoDigito = 0;
        const cpfCorrigido = cpfCom10 + segundoDigito;
        console.log(`🔧 CPF pode ser corrigido: ${cpf} → ${cpfCorrigido}`);
        return this.isValidCPF(cpfCorrigido);
    }
