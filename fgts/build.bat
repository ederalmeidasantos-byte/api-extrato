@echo off
echo ========================================
echo    SISTEMA FGTS - BUILD DESKTOP
echo ========================================
echo.

echo [1/4] Instalando dependencias...
call npm install
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar dependencias
    pause
    exit /b 1
)

echo.
echo [2/4] Instalando Electron Builder...
call npm install -g electron-builder
if %errorlevel% neq 0 (
    echo ERRO: Falha ao instalar Electron Builder
    pause
    exit /b 1
)

echo.
echo [3/4] Limpando builds anteriores...
if exist dist rmdir /s /q dist
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo [4/4] Construindo aplicacao...
call npm run build-win
if %errorlevel% neq 0 (
    echo ERRO: Falha ao construir aplicacao
    pause
    exit /b 1
)

echo.
echo ========================================
echo    BUILD CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo O instalador foi criado em: dist\
echo.
pause



