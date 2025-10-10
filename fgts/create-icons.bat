@echo off
echo ========================================
echo    CRIANDO ICONES PARA SISTEMA FGTS
echo ========================================
echo.

echo Criando icones a partir do SVG...

REM Verificar se o ImageMagick está instalado
where magick >nul 2>nul
if %errorlevel% neq 0 (
    echo ImageMagick nao encontrado. Instalando...
    echo Baixando ImageMagick...
    powershell -Command "Invoke-WebRequest -Uri 'https://imagemagick.org/script/download.php#windows' -OutFile 'imagemagick-setup.exe'"
    echo Execute o instalador do ImageMagick e rode este script novamente.
    pause
    exit /b 1
)

echo Convertendo SVG para PNG (256x256)...
magick assets\icon.svg -resize 256x256 assets\icon.png

echo Convertendo SVG para ICO (Windows)...
magick assets\icon.svg -resize 256x256 assets\icon.ico

echo Convertendo SVG para ICNS (Mac)...
magick assets\icon.svg -resize 256x256 assets\icon.icns

echo.
echo ========================================
echo    ICONES CRIADOS COM SUCESSO!
echo ========================================
echo.
echo Arquivos criados:
echo - assets\icon.png (256x256)
echo - assets\icon.ico (Windows)
echo - assets\icon.icns (Mac)
echo.
pause



