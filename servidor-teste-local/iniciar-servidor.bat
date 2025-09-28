@echo off
echo ========================================
echo   SERVIDOR LOCAL DE TESTE - LUNAS DIGITAL
echo ========================================
echo.

REM Verificar se Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Instale o Node.js em: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js encontrado!
echo.

REM Verificar se package.json existe
if not exist "package.json" (
    echo ERRO: package.json nao encontrado!
    echo Execute: npm install
    pause
    exit /b 1
)

REM Instalar dependências se necessário
if not exist "node_modules" (
    echo Instalando dependencias...
    npm install
    echo.
)

REM Parar processos Node.js existentes
echo Parando processos Node.js existentes...
taskkill /f /im node.exe >nul 2>&1

REM Iniciar servidor
echo Iniciando servidor local...
echo.
echo ========================================
echo   SERVIDOR INICIADO COM SUCESSO!
echo ========================================
echo.
echo URL: http://localhost:3001
echo Para parar: Ctrl+C
echo.

node servidor-local.js

pause
