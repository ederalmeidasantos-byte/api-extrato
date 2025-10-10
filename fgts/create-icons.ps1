# Script PowerShell para criar ícones do Sistema FGTS

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   CRIANDO ICONES PARA SISTEMA FGTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Adicionar assemblies necessários
Add-Type -AssemblyName System.Drawing

# Criar diretório assets se não existir
if (!(Test-Path "assets")) {
    New-Item -ItemType Directory -Path "assets"
}

Write-Host "Criando ícone PNG..." -ForegroundColor Green

# Criar bitmap 256x256
$width = 256
$height = 256
$bitmap = New-Object System.Drawing.Bitmap($width, $height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Configurar qualidade
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Fundo azul
$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 64, 175))
$graphics.FillRectangle($brush, 0, 0, $width, $height)

# Círculo branco externo
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$graphics.FillEllipse($whiteBrush, 20, 20, 216, 216)

# Círculo azul interno
$blueBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 64, 175))
$graphics.FillEllipse($blueBrush, 40, 40, 176, 176)

# Texto R$ no centro
$font = New-Object System.Drawing.Font('Arial', 48, [System.Drawing.FontStyle]::Bold)
$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$textRect = New-Object System.Drawing.RectangleF(0, 0, $width, $height)
$stringFormat = New-Object System.Drawing.StringFormat
$stringFormat.Alignment = [System.Drawing.StringAlignment]::Center
$stringFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
$graphics.DrawString('R$', $font, $textBrush, $textRect, $stringFormat)

# Texto FGTS na parte inferior
$fontSmall = New-Object System.Drawing.Font('Arial', 20, [System.Drawing.FontStyle]::Bold)
$textRectFGTS = New-Object System.Drawing.RectangleF(0, 180, $width, 60)
$graphics.DrawString('FGTS', $fontSmall, $textBrush, $textRectFGTS, $stringFormat)

# Salvar PNG
$bitmap.Save('assets\icon.png', [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Convertendo para ICO..." -ForegroundColor Green

# Converter para ICO
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$fileStream = [System.IO.File]::Create('assets\icon.ico')
$icon.Save($fileStream)
$fileStream.Close()

# Limpar recursos
$graphics.Dispose()
$bitmap.Dispose()
$icon.Dispose()

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   ICONES CRIADOS COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Arquivos criados:" -ForegroundColor Yellow
Write-Host "- assets\icon.png (256x256)" -ForegroundColor White
Write-Host "- assets\icon.ico (Windows)" -ForegroundColor White
Write-Host ""

# Verificar se os arquivos foram criados
if (Test-Path "assets\icon.png" -and Test-Path "assets\icon.ico") {
    Write-Host "✅ Ícones criados com sucesso!" -ForegroundColor Green
} else {
    Write-Host "❌ Erro ao criar ícones" -ForegroundColor Red
}

Write-Host ""
Write-Host "Pressione qualquer tecla para continuar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")



