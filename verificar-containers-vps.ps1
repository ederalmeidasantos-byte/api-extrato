# Script para verificar todos os containers no VPS

Write-Host "Conectando ao VPS para verificar containers..." -ForegroundColor Green

# Comandos para executar no VPS
$comandos = @(
    "echo '=== STATUS DOS CONTAINERS ==='",
    "docker ps -a",
    "echo ''",
    "echo '=== DOCKER COMPOSE STATUS ==='",
    "docker-compose ps",
    "echo ''",
    "echo '=== LOGS DO NGINX ==='",
    "docker-compose logs nginx --tail=10",
    "echo ''",
    "echo '=== LOGS DO API-SIMULADOR ==='",
    "docker-compose logs api-simulador --tail=10",
    "echo ''",
    "echo '=== LOGS DO SERVIDOR-PRINCIPAL ==='",
    "docker-compose logs servidor-principal --tail=10",
    "echo ''",
    "echo '=== TESTE DE CONECTIVIDADE ==='",
    "curl -I http://localhost/inss/simulador.html || echo 'Erro ao acessar simulador'",
    "echo ''",
    "echo '=== VERIFICACAO DE REDE ==='",
    "docker network ls",
    "echo ''",
    "echo '=== VERIFICACAO DE VOLUMES ==='",
    "docker volume ls"
)

# Executar comandos no VPS
foreach ($comando in $comandos) {
    Write-Host "Executando: $comando" -ForegroundColor Yellow
    # Aqui você precisaria executar via SSH
    # ssh root@seu-vps "$comando"
    Write-Host "Comando: $comando" -ForegroundColor Cyan
}

Write-Host "Para executar no VPS, conecte via SSH e execute os comandos acima" -ForegroundColor Blue




