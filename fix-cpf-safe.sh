#!/bin/bash

# Script para corrigir CPF automaticamente no formulário - versão segura
CONTAINER_NAME="api-simulador-lunasdigital"
FILE_PATH="/app/INSS/formulario-cliente.js"

echo "🔧 Aplicando correção automática de CPF..."

# Primeiro, vamos adicionar a função corrigirCPF antes da função isValidCPF
docker exec $CONTAINER_NAME sed -i '/isValidCPF(cpf) {/i\
    // Função para corrigir CPF automaticamente\
    corrigirCPF(cpf) {\
        cpf = cpf.replace(/\\D/g, "");\
        \
        if (cpf.length !== 11) return cpf;\
        \
        // Verificar se já é válido\
        if (this.isValidCPF(cpf)) return cpf;\
        \
        // Tentar corrigir os dígitos verificadores\
        const primeiros9 = cpf.substring(0, 9);\
        \
        // Calcular primeiro dígito verificador\
        let sum = 0;\
        for (let i = 0; i < 9; i++) {\
            sum += parseInt(primeiros9.charAt(i)) * (10 - i);\
        }\
        let primeiroDigito = 11 - (sum % 11);\
        if (primeiroDigito === 10 || primeiroDigito === 11) primeiroDigito = 0;\
        \
        // Calcular segundo dígito verificador\
        let cpfCom10 = primeiros9 + primeiroDigito;\
        sum = 0;\
        for (let i = 0; i < 10; i++) {\
            sum += parseInt(cpfCom10.charAt(i)) * (11 - i);\
        }\
        let segundoDigito = 11 - (sum % 11);\
        if (segundoDigito === 10 || segundoDigito === 11) segundoDigito = 0;\
        \
        const cpfCorrigido = cpfCom10 + segundoDigito;\
        \
        console.log(`🔧 CPF corrigido: ${cpf} → ${cpfCorrigido}`);\
        return cpfCorrigido;\
    }\
\
' $FILE_PATH

# Agora vamos modificar a validação do CPF para usar a correção automática
# Substituir a linha de validação do CPF
docker exec $CONTAINER_NAME sed -i 's/if (value && !this.isValidCPF(value)) {/if (value) {\
                const cpfCorrigido = this.corrigirCPF(value);\
                if (!this.isValidCPF(cpfCorrigido)) {/' $FILE_PATH

echo "✅ Correção automática de CPF aplicada com sucesso!"
