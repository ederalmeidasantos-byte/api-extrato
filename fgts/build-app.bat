@echo off
echo ========================================
echo    CRIANDO APLICATIVO EXECUTAVEL
echo ========================================
echo.

echo Parando processos Node.js existentes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

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
echo Criando aplicativo executavel...
call npm run build-win

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo    APLICATIVO CRIADO COM SUCESSO!
    echo ========================================
    echo.
    echo O instalador foi criado em: dist\
    echo.
    echo Para instalar:
    echo 1. Execute o arquivo .exe em dist\
    echo 2. Siga o assistente de instalacao
    echo 3. O aplicativo sera instalado no sistema
    echo.
) else (
    echo.
    echo ERRO: Falha ao criar aplicativo
    echo Verifique os logs acima
)

pause
