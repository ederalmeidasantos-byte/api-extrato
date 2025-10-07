# Gerar Nova Chave SSH para VPS
Write-Host "🔑 GERANDO NOVA CHAVE SSH PARA VPS" -ForegroundColor Green

# 1. Gerar nova chave SSH
Write-Host "`n🔧 1. Gerando nova chave SSH..." -ForegroundColor Yellow
try {
    # Gerar chave SSH
    $sshKeyGen = "ssh-keygen -t rsa -b 4096 -f ./nova_chave_vps -N '' -C 'vps-hostinger-$(Get-Date -Format 'yyyyMMdd')'"
    Invoke-Expression $sshKeyGen
    
    Write-Host "✅ Chave SSH gerada com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro ao gerar chave SSH: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Ler chave pública
Write-Host "`n📖 2. Lendo chave pública..." -ForegroundColor Yellow
try {
    $chavePublica = Get-Content "./nova_chave_vps.pub" -Raw
    Write-Host "🔑 CHAVE PÚBLICA:" -ForegroundColor Cyan
    Write-Host $chavePublica -ForegroundColor White
} catch {
    Write-Host "❌ Erro ao ler chave pública: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Ler chave privada
Write-Host "`n📖 3. Lendo chave privada..." -ForegroundColor Yellow
try {
    $chavePrivada = Get-Content "./nova_chave_vps" -Raw
    Write-Host "🔐 CHAVE PRIVADA:" -ForegroundColor Cyan
    Write-Host $chavePrivada -ForegroundColor White
} catch {
    Write-Host "❌ Erro ao ler chave privada: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n📋 PRÓXIMOS PASSOS:" -ForegroundColor Magenta
Write-Host "1. Copie a CHAVE PÚBLICA acima" -ForegroundColor Yellow
Write-Host "2. Adicione no VPS: ~/.ssh/authorized_keys" -ForegroundColor Yellow
Write-Host "3. Atualize o secret VPS_SSH_KEY no GitHub" -ForegroundColor Yellow
Write-Host "4. Teste a conexão SSH" -ForegroundColor Yellow

Write-Host "`n✅ Chaves geradas em:" -ForegroundColor Green
Write-Host "📁 Chave pública: ./nova_chave_vps.pub" -ForegroundColor Cyan
Write-Host "📁 Chave privada: ./nova_chave_vps" -ForegroundColor Cyan
