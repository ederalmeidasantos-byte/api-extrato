@echo off
echo ========================================
echo    SISTEMA FGTS - EXECUTAR CORRIGIDO
echo ========================================
echo.

echo Verificando dependencias...
if not exist node_modules (
    echo Instalando dependencias...
    call npm install
    if %errorlevel% neq 0 (
        echo ERRO: Falha ao instalar dependencias
        pause
        exit /b 1
    )
)

echo.
echo Verificando arquivo .env...
if not exist .env (
    echo AVISO: Arquivo .env nao encontrado
    echo Copiando exemplo...
    copy env-example.txt .env
    echo Configure o arquivo .env com suas credenciais
)

echo.
echo Verificando porta 3004...
netstat -an | findstr :3004 >nul
if %errorlevel% equ 0 (
    echo AVISO: Porta 3004 em uso, tentando matar processo...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3004') do taskkill /f /pid %%a >nul 2>&1
    timeout /t 2 >nul
)

echo.
echo Iniciando Sistema FGTS...
echo Aguarde alguns segundos para o servidor inicializar...
echo.

call npm start

if %errorlevel% neq 0 (
    echo.
    echo ERRO: Falha ao iniciar aplicacao
    echo Verifique os logs acima para mais detalhes
    pause
)
