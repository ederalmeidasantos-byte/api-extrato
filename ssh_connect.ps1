# Script para conectar via SSH com senha
param(
    [string]$Command = "pm2 status"
)

$password = "Lunas@202525"
$username = "root"
$hostname = "72.60.159.149"

# Criar arquivo temporário com comando
$tempFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $tempFile -Value $Command

# Usar plink (PuTTY) se disponível, senão usar ssh
try {
    # Tentar com plink primeiro
    $result = & plink -ssh -l $username -pw $password $hostname $Command 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Output "Comando executado com sucesso:"
        Write-Output $result
    } else {
        Write-Output "Erro ao executar comando:"
        Write-Output $result
    }
} catch {
    Write-Output "Plink não disponível, tentando SSH direto..."
    # Fallback para SSH direto
    $result = & ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no -o PasswordAuthentication=yes $username@$hostname $Command 2>&1
    Write-Output $result
}

# Limpar arquivo temporário
Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue

