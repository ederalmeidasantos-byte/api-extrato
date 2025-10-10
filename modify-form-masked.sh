#!/bin/bash

# Script para modificar formulário para usar links mascarados
CONTAINER_NAME="api-simulador-lunasdigital"
FILE_PATH="/app/INSS/formulario-cliente.js"

echo "🔧 Modificando formulário para usar links mascarados..."

# Adicionar função para buscar dados via API no início do arquivo
docker exec $CONTAINER_NAME sed -i '/class FormularioCliente/i\
// Função para buscar dados do link temporário\
async function buscarDadosLinkTemporario(linkId) {\
    try {\
        console.log(`🔍 Buscando dados do link temporário: ${linkId}`);\
        \
        const response = await fetch(`/api/dados-link-temporario/${linkId}`);\
        const result = await response.json();\
        \
        if (!result.success) {\
            throw new Error(result.error || "Erro ao buscar dados");\
        }\
        \
        console.log("✅ Dados do link temporário carregados:", result.data);\
        return result.data;\
    } catch (error) {\
        console.error("❌ Erro ao buscar dados do link temporário:", error);\
        throw error;\
    }\
}\
\
' $FILE_PATH

# Modificar a função de inicialização para detectar linkId
docker exec $CONTAINER_NAME sed -i '/document.addEventListener.*DOMContentLoaded/i\
// Verificar se é um link mascarado\
const urlParams = new URLSearchParams(window.location.search);\
const linkId = urlParams.get("linkId");\
\
if (linkId) {\
    console.log(`🔗 Link mascarado detectado: ${linkId}`);\
    \
    // Buscar dados do link temporário\
    buscarDadosLinkTemporario(linkId)\
        .then(data => {\
            // Substituir parâmetros da URL com dados da API\
            const newUrl = new URL(window.location);\
            newUrl.searchParams.delete("linkId");\
            newUrl.searchParams.set("clientId", data.clientId);\
            newUrl.searchParams.set("proposalId", data.proposalId);\
            newUrl.searchParams.set("clienteData", JSON.stringify(data.clienteData));\
            newUrl.searchParams.set("contratosData", JSON.stringify(data.contratosData));\
            \
            // Atualizar URL sem recarregar a página\
            window.history.replaceState({}, "", newUrl.toString());\
            \
            console.log("✅ URL atualizada com dados mascarados");\
        })\
        .catch(error => {\
            console.error("❌ Erro ao carregar dados do link mascarado:", error);\
            alert("Erro ao carregar dados do formulário. Link pode ter expirado.");\
        });\
}\
\
' $FILE_PATH

echo "✅ Formulário modificado para usar links mascarados!"
