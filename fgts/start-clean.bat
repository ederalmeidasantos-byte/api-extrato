@echo off
echo ========================================
echo    SISTEMA FGTS - INICIO LIMPO
echo ========================================
echo.

echo Parando processos Node.js existentes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

echo Verificando porta 3004...
netstat -an | findstr :3004 >nul
if %errorlevel% equ 0 (
    echo Porta 3004 ainda em uso, aguardando...
    timeout /t 3 >nul
)

echo.
echo Iniciando servidor diretamente...
echo Aguarde o servidor inicializar...
echo.

start "Servidor FGTS" cmd /c "node server.js"

echo Aguardando servidor inicializar...
timeout /t 5 >nul

echo.
echo Iniciando aplicacao Electron...
start "Sistema FGTS" cmd /c "npm start"

echo.
echo ========================================
echo    APLICACAO INICIADA!
echo ========================================
echo.
echo Duas janelas foram abertas:
echo 1. Servidor FGTS (terminal)
echo 2. Sistema FGTS (aplicacao)
echo.
echo Se a aplicacao nao abrir, aguarde alguns segundos
echo ou verifique se o servidor esta rodando na porta 3004
echo.
pause
