#!/bin/bash

# Script de Automação VPS Lunas Digital
# Integração com API Hostinger

echo "🚀 === AUTOMAÇÃO VPS LUNAS DIGITAL ==="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para mostrar menu
show_menu() {
    echo -e "${BLUE}Escolha uma opção:${NC}"
    echo "1) Verificar status dos serviços"
    echo "2) Criar backup do VPS"
    echo "3) Listar backups disponíveis"
    echo "4) Reiniciar serviços"
    echo "5) Deploy automático"
    echo "6) Monitoramento contínuo"
    echo "7) Verificar métricas do VPS"
    echo "8) Sair"
    echo ""
}

# Função para executar comandos Node.js
run_node_command() {
    local command=$1
    echo -e "${YELLOW}Executando: $command${NC}"
    node -e "$command"
}

# Loop principal
while true; do
    show_menu
    read -p "Digite sua escolha (1-8): " choice
    
    case $choice in
        1)
            echo -e "${GREEN}🔍 Verificando status dos serviços...${NC}"
            run_node_command "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.checkServicesStatus().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });"
            ;;
        2)
            echo -e "${GREEN}💾 Criando backup do VPS...${NC}"
            run_node_command "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.createAutomaticBackup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });"
            ;;
        3)
            echo -e "${GREEN}📋 Listando backups disponíveis...${NC}"
            run_node_command "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.listBackups().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });"
            ;;
        4)
            echo -e "${GREEN}🔄 Reiniciando serviços...${NC}"
            read -p "Quais serviços reiniciar? (fgts,inss,nginx,docker): " services
            run_node_command "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.restartServices('$services'.split(',')).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });"
            ;;
        5)
            echo -e "${GREEN}🚀 Executando deploy automático...${NC}"
            run_node_command "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.deployApplication().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });"
            ;;
        6)
            echo -e "${GREEN}📊 Iniciando monitoramento contínuo...${NC}"
            echo -e "${YELLOW}Pressione Ctrl+C para parar o monitoramento${NC}"
            run_node_command "const LunasVPS = require('./lunas-vps-automation'); const auto = new LunasVPS(); auto.startMonitoring();"
            ;;
        7)
            echo -e "${GREEN}📈 Verificando métricas do VPS...${NC}"
            run_node_command "const HostingerVPS = require('./hostinger-vps-automation'); const vps = new HostingerVPS('llr3i3O4HmftTCx0uuNzRNpjHkM1wnsmfyEkFNjC5e9050c2'); vps.getVMMetrics('1035582').then(metrics => { console.log('Métricas:', metrics); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });"
            ;;
        8)
            echo -e "${GREEN}👋 Saindo...${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Opção inválida! Escolha entre 1-8.${NC}"
            ;;
    esac
    
    echo ""
    read -p "Pressione Enter para continuar..."
    echo ""
done
