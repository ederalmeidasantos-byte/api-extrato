@echo off
echo ========================================
echo    SISTEMA FGTS - APLICATIVO UNICO
echo ========================================
echo.

echo Parando processos Node.js existentes...
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

echo Verificando porta 3004...
netstat -an | findstr :3004 >nul
if %errorlevel% equ 0 (
    echo Porta 3004 em uso, aguardando liberacao...
    timeout /t 3 >nul
)

echo.
echo Iniciando Sistema FGTS como aplicativo...
echo Aguarde alguns segundos...
echo.

call npm start

echo.
echo Aplicativo finalizado.
pause
