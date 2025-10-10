#!/bin/bash

# Script simples para corrigir validação do CPF
CONTAINER_NAME="api-simulador-lunasdigital"
FILE_PATH="/app/INSS/formulario-cliente.js"

echo "🔧 Aplicando correção simples de validação do CPF..."

# Substituir a validação do CPF por uma versão que aceita CPFs corrigíveis
docker exec $CONTAINER_NAME sed -i 's/if (value && !this.isValidCPF(value)) {/if (value) {\
                // Verificar se CPF pode ser corrigido automaticamente\
                const cpfLimpo = value.replace(/\\D/g, "");\
                if (cpfLimpo.length === 11) {\
                    const primeiros9 = cpfLimpo.substring(0, 9);\
                    let sum = 0;\
                    for (let i = 0; i < 9; i++) {\
                        sum += parseInt(primeiros9.charAt(i)) * (10 - i);\
                    }\
                    let primeiroDigito = 11 - (sum % 11);\
                    if (primeiroDigito === 10 || primeiroDigito === 11) primeiroDigito = 0;\
                    let cpfCom10 = primeiros9 + primeiroDigito;\
                    sum = 0;\
                    for (let i = 0; i < 10; i++) {\
                        sum += parseInt(cpfCom10.charAt(i)) * (11 - i);\
                    }\
                    let segundoDigito = 11 - (sum % 11);\
                    if (segundoDigito === 10 || segundoDigito === 11) segundoDigito = 0;\
                    const cpfCorrigido = cpfCom10 + segundoDigito;\
                    console.log(`🔧 CPF corrigido: ${cpfLimpo} → ${cpfCorrigido}`);\
                    if (this.isValidCPF(cpfCorrigido)) {\
                        // CPF pode ser corrigido, aceitar\
                        break;\
                    }\
                }\
                if (!this.isValidCPF(value)) {/' $FILE_PATH

echo "✅ Correção de validação do CPF aplicada!"
