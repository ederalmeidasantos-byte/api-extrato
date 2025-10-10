@echo off
echo ========================================
echo    CRIANDO ICONES SIMPLES
echo ========================================
echo.

echo Criando icone PNG simples...

REM Usar PowerShell para criar um PNG simples
powershell -Command "
$width = 256
$height = 256
$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Fundo azul
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 64, 175))
$graphics.FillRectangle($brush, 0, 0, $width, $height)

# Círculo branco
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.FillEllipse($whiteBrush, 60, 60, 136, 136)

# Círculo azul menor
$blueBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 64, 175))
$graphics.FillEllipse($blueBrush, 80, 80, 96, 96)

# Texto R$
$font = New-Object System.Drawing.Font('Arial', 48, [System.Drawing.FontStyle]::Bold)
$graphics.DrawString('R$', $font, $whiteBrush, 90, 100)

# Texto FGTS
$fontSmall = New-Object System.Drawing.Font('Arial', 24, [System.Drawing.FontStyle]::Bold)
$graphics.DrawString('FGTS', $fontSmall, $whiteBrush, 90, 200)

$bitmap.Save('assets\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose()
$bitmap.Dispose()
"

echo Convertendo para ICO...
powershell -Command "
Add-Type -AssemblyName System.Drawing
$bitmap = [System.Drawing.Bitmap]::FromFile('assets\icon.png')
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$fileStream = [System.IO.File]::Create('assets\icon.ico')
$icon.Save($fileStream)
$fileStream.Close()
$bitmap.Dispose()
$icon.Dispose()
"

echo.
echo ========================================
echo    ICONES CRIADOS COM SUCESSO!
echo ========================================
echo.
echo Arquivos criados:
echo - assets\icon.png (256x256)
echo - assets\icon.ico (Windows)
echo.
pause



