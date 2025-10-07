@echo off
echo 🚀 Iniciando servidor API Lunas...
echo.

REM Navegar para o diretório correto
cd /d "C:\Users\srcor\API Lunas"

REM Verificar se está no diretório correto
if not exist "server.js" (
    echo ❌ ERRO: Arquivo server.js não encontrado!
    echo 📁 Diretório atual: %CD%
    echo.
    echo 💡 SOLUÇÃO: Execute este script no diretório correto
    echo    C:\Users\srcor\API Lunas
    echo.
    pause
    exit /b 1
)

REM Verificar arquivos essenciais
echo 📋 Verificando arquivos essenciais...
if not exist ".env" (
    echo ⚠️ AVISO: Arquivo .env não encontrado!
    echo 💡 SOLUÇÃO: Crie o arquivo .env com as variáveis necessárias
)

if not exist "package.json" (
    echo ⚠️ AVISO: Arquivo package.json não encontrado!
    echo 💡 SOLUÇÃO: Execute 'npm init' para criar o package.json
)

if not exist "node_modules" (
    echo ⚠️ AVISO: Diretório node_modules não encontrado!
    echo 💡 SOLUÇÃO: Execute 'npm install' para instalar dependências
)

REM Finalizar processos Node.js existentes
echo.
echo 🔄 Finalizando processos Node.js existentes...
taskkill /F /IM node.exe 2>nul

REM Aguardar
echo ⏳ Aguardando 2 segundos...
timeout /t 2 /nobreak >nul

REM Verificar porta 3000
echo.
echo 🔍 Verificando porta 3000...
netstat -an | findstr :3000 >nul
if %errorlevel% == 0 (
    echo ⚠️ AVISO: Porta 3000 ainda está em uso!
    echo 💡 SOLUÇÃO: Aguarde mais alguns segundos ou reinicie o computador
) else (
    echo ✅ Porta 3000 está disponível
)

REM Executar servidor
echo.
echo 🚀 Iniciando servidor...
echo 📁 Diretório: %CD%
echo 🌐 URL: http://localhost:3000
echo.
echo 💡 Para parar o servidor, pressione Ctrl+C
echo.

node server.js

REM Se chegou aqui, o servidor foi finalizado
echo.
echo 👋 Servidor finalizado!
pause
