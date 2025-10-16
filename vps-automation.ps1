# Script de Automação VPS Lunas Digital - PowerShell
# Integração com API Hostinger

Write-Host "🚀 === AUTOMAÇÃO VPS LUNAS DIGITAL ===" -ForegroundColor Blue
Write-Host ""

# Função para mostrar menu
function Show-Menu {
    Write-Host "Escolha uma opção:" -ForegroundColor Blue
    Write-Host "1) Verificar status dos serviços"
    Write-Host "2) Criar backup do VPS"
    Write-Host "3) Listar backups disponíveis"
    Write-Host "4) Reiniciar serviços"
    Write-Host "5) Deploy automático"
    Write-Host "6) Monitoramento contínuo"
    Write-Host "7) Verificar métricas do VPS"
    Write-Host "8) Sair"
    Write-Host ""
}

# Função para executar comandos Node.js
function Invoke-NodeCommand {
    param([string]$Command)
    Write-Host "Executando: $Command" -ForegroundColor Yellow
    node -e $Command
}

# Loop principal
do {
    Show-Menu
    $choice = Read-Host "Digite sua escolha (1-8)"
    
    switch ($choice) {
        "1" {
            Write-Host "🔍 Verificando status dos serviços..." -ForegroundColor Green
            $command = "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.checkServicesStatus().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });"
            Invoke-NodeCommand $command
        }
        "2" {
            Write-Host "💾 Criando backup do VPS..." -ForegroundColor Green
            $command = "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.createAutomaticBackup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });"
            Invoke-NodeCommand $command
        }
        "3" {
            Write-Host "📋 Listando backups disponíveis..." -ForegroundColor Green
            $command = "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.listBackups().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });"
            Invoke-NodeCommand $command
        }
        "4" {
            Write-Host "🔄 Reiniciando serviços..." -ForegroundColor Green
            $services = Read-Host "Quais serviços reiniciar? (fgts,inss,nginx,docker)"
            $command = "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.restartServices('$services'.split(',')).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });"
            Invoke-NodeCommand $command
        }
        "5" {
            Write-Host "🚀 Executando deploy automático..." -ForegroundColor Green
            $command = "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.deployApplication().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });"
            Invoke-NodeCommand $command
        }
        "6" {
            Write-Host "📊 Iniciando monitoramento contínuo..." -ForegroundColor Green
            Write-Host "Pressione Ctrl+C para parar o monitoramento" -ForegroundColor Yellow
            $command = "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.startMonitoring();"
            Invoke-NodeCommand $command
        }
        "7" {
            Write-Host "📈 Verificando métricas do VPS..." -ForegroundColor Green
            $command = "const HostingerVPS = require('./hostinger-vps-automation'); const vps = new HostingerVPS('llr3i3O4HmftTCx0uuNzRNpjHkM1wnsmfyEkFNjC5e9050c2'); vps.getVMMetrics('1035582').then(metrics => { console.log('Métricas:', metrics); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"
            Invoke-NodeCommand $command
        }
        "8" {
            Write-Host "👋 Saindo..." -ForegroundColor Green
            exit 0
        }
        default {
            Write-Host "❌ Opção inválida! Escolha entre 1-8." -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Read-Host "Pressione Enter para continuar"
    Write-Host ""
} while ($true)
