@echo off
echo ========================================
echo    SISTEMA FGTS - EXECUTAR
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
echo Iniciando Sistema FGTS...
call npm start

pause



