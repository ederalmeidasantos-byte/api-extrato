#!/bin/bash

# 🚀 Script de Automação Completa VPS + Docker + API Hostinger
# Integração completa para gerenciar VPS via API e Docker

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configurações
API_TOKEN="llr3i3O4HmftTCx0uuNzRNpjHkM1wnsmfyEkFNjC5e9050c2"
VPS_ID="1035582"
VPS_IP="72.60.159.149"
BASE_URL="https://developers.hostinger.com/api/vps/v1"

# Função para fazer requisições à API Hostinger
api_request() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -n "$data" ]; then
        curl -s -X $method "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s -X $method "$BASE_URL$endpoint" \
            -H "Authorization: Bearer $API_TOKEN" \
            -H "Content-Type: application/json"
    fi
}

# Função para mostrar menu principal
show_main_menu() {
    echo -e "${BLUE}🚀 === AUTOMAÇÃO COMPLETA VPS + DOCKER ===${NC}"
    echo ""
    echo -e "${CYAN}Escolha uma categoria:${NC}"
    echo "1) 🖥️  Gerenciamento VPS (API Hostinger)"
    echo "2) 🐳 Gerenciamento Docker"
    echo "3) 🚀 Deploy e Backup"
    echo "4) 📊 Monitoramento"
    echo "5) 🔧 Manutenção"
    echo "6) 📋 Status Completo"
    echo "7) ❓ Ajuda"
    echo "8) 🚪 Sair"
    echo ""
}

# Função para menu VPS
show_vps_menu() {
    echo -e "${BLUE}🖥️  === GERENCIAMENTO VPS ===${NC}"
    echo ""
    echo "1) Verificar status do VPS"
    echo "2) Criar backup do VPS"
    echo "3) Listar backups disponíveis"
    echo "4) Reiniciar VPS"
    echo "5) Obter métricas do VPS"
    echo "6) Voltar ao menu principal"
    echo ""
}

# Função para menu Docker
show_docker_menu() {
    echo -e "${BLUE}🐳 === GERENCIAMENTO DOCKER ===${NC}"
    echo ""
    echo "1) Status dos containers"
    echo "2) Iniciar container"
    echo "3) Parar container"
    echo "4) Reiniciar container"
    echo "5) Ver logs do container"
    echo "6) Reiniciar todos os containers"
    echo "7) Voltar ao menu principal"
    echo ""
}

# Função para menu Deploy/Backup
show_deploy_menu() {
    echo -e "${BLUE}🚀 === DEPLOY E BACKUP ===${NC}"
    echo ""
    echo "1) Deploy completo do sistema"
    echo "2) Backup completo do sistema"
    echo "3) Restore do sistema"
    echo "4) Deploy apenas CRM"
    echo "5) Deploy apenas INSS"
    echo "6) Backup apenas Docker"
    echo "7) Voltar ao menu principal"
    echo ""
}

# Função para menu Monitoramento
show_monitor_menu() {
    echo -e "${BLUE}📊 === MONITORAMENTO ===${NC}"
    echo ""
    echo "1) Status completo do sistema"
    echo "2) Health check dos serviços"
    echo "3) Monitoramento contínuo"
    echo "4) Verificar conectividade"
    echo "5) Logs do sistema"
    echo "6) Voltar ao menu principal"
    echo ""
}

# Função para menu Manutenção
show_maintenance_menu() {
    echo -e "${BLUE}🔧 === MANUTENÇÃO ===${NC}"
    echo ""
    echo "1) Limpar containers parados"
    echo "2) Limpar imagens não utilizadas"
    echo "3) Limpar volumes não utilizados"
    echo "4) Atualizar sistema"
    echo "5) Verificar espaço em disco"
    echo "6) Verificar uso de memória"
    echo "7) Voltar ao menu principal"
    echo ""
}

# Função para verificar status do VPS
check_vps_status() {
    echo -e "${YELLOW}🔍 Verificando status do VPS...${NC}"
    
    local response=$(api_request "GET" "/virtual-machines/$VPS_ID")
    
    if [ $? -eq 0 ]; then
        local state=$(echo "$response" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
        local hostname=$(echo "$response" | grep -o '"hostname":"[^"]*"' | cut -d'"' -f4)
        local ip=$(echo "$response" | grep -o '"address":"[^"]*"' | cut -d'"' -f4)
        
        echo -e "${GREEN}✅ VPS Status:${NC}"
        echo "   Hostname: $hostname"
        echo "   Estado: $state"
        echo "   IP: $ip"
        echo "   ID: $VPS_ID"
    else
        echo -e "${RED}❌ Erro ao verificar status do VPS${NC}"
    fi
}

# Função para criar backup do VPS
create_vps_backup() {
    echo -e "${YELLOW}💾 Criando backup do VPS...${NC}"
    
    local response=$(api_request "POST" "/virtual-machines/$VPS_ID/backups" "{}")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup do VPS criado com sucesso!${NC}"
        echo "Resposta: $response"
    else
        echo -e "${RED}❌ Erro ao criar backup do VPS${NC}"
    fi
}

# Função para reiniciar VPS
restart_vps() {
    echo -e "${YELLOW}🔄 Reiniciando VPS...${NC}"
    echo -e "${RED}⚠️  ATENÇÃO: Esta ação irá reiniciar o VPS!${NC}"
    read -p "Tem certeza? (s/N): " confirm
    
    if [[ $confirm =~ ^[Ss]$ ]]; then
        local response=$(api_request "POST" "/virtual-machines/$VPS_ID/restart" "{}")
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ VPS reiniciado com sucesso!${NC}"
            echo "Resposta: $response"
        else
            echo -e "${RED}❌ Erro ao reiniciar VPS${NC}"
        fi
    else
        echo -e "${YELLOW}Operação cancelada${NC}"
    fi
}

# Função para status dos containers Docker
check_docker_status() {
    echo -e "${YELLOW}🐳 Verificando status dos containers Docker...${NC}"
    
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✅ Containers Docker:${NC}"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo -e "${RED}❌ Docker não está instalado${NC}"
    fi
}

# Função para reiniciar container
restart_container() {
    echo -e "${YELLOW}🔄 Reiniciando container...${NC}"
    echo "Containers disponíveis:"
    docker ps --format "{{.Names}}"
    echo ""
    read -p "Nome do container: " container_name
    
    if [ -n "$container_name" ]; then
        echo -e "${YELLOW}Reiniciando $container_name...${NC}"
        docker restart "$container_name"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Container $container_name reiniciado com sucesso!${NC}"
        else
            echo -e "${RED}❌ Erro ao reiniciar container $container_name${NC}"
        fi
    else
        echo -e "${RED}❌ Nome do container não fornecido${NC}"
    fi
}

# Função para ver logs do container
view_container_logs() {
    echo -e "${YELLOW}📋 Visualizando logs do container...${NC}"
    echo "Containers disponíveis:"
    docker ps --format "{{.Names}}"
    echo ""
    read -p "Nome do container: " container_name
    
    if [ -n "$container_name" ]; then
        echo -e "${YELLOW}Logs do $container_name (últimas 50 linhas):${NC}"
        docker logs --tail 50 "$container_name"
    else
        echo -e "${RED}❌ Nome do container não fornecido${NC}"
    fi
}

# Função para deploy completo
deploy_complete() {
    echo -e "${YELLOW}🚀 Executando deploy completo...${NC}"
    echo -e "${RED}⚠️  ATENÇÃO: Esta operação irá parar e reiniciar todos os serviços!${NC}"
    read -p "Continuar? (s/N): " confirm
    
    if [[ $confirm =~ ^[Ss]$ ]]; then
        # 1. Backup antes do deploy
        echo -e "${YELLOW}1️⃣ Criando backup antes do deploy...${NC}"
        create_vps_backup
        
        # 2. Parar containers
        echo -e "${YELLOW}2️⃣ Parando containers...${NC}"
        docker stop $(docker ps -q) 2>/dev/null || true
        
        # 3. Deploy CRM
        echo -e "${YELLOW}3️⃣ Deploy CRM...${NC}"
        if [ -d "/opt/lunasdigital/crm-lunasdigital" ]; then
            cd /opt/lunasdigital/crm-lunasdigital
            docker-compose down
            docker-compose build --no-cache
            docker-compose up -d
            echo -e "${GREEN}✅ CRM deployado${NC}"
        else
            echo -e "${RED}❌ Diretório CRM não encontrado${NC}"
        fi
        
        # 4. Deploy INSS
        echo -e "${YELLOW}4️⃣ Deploy INSS...${NC}"
        if [ -d "/opt/lunasdigital/inss-simulador" ]; then
            cd /opt/lunasdigital/inss-simulador
            docker-compose down
            docker-compose build --no-cache
            docker-compose up -d
            echo -e "${GREEN}✅ INSS deployado${NC}"
        else
            echo -e "${RED}❌ Diretório INSS não encontrado${NC}"
        fi
        
        # 5. Reiniciar Nginx
        echo -e "${YELLOW}5️⃣ Reiniciando Nginx...${NC}"
        systemctl reload nginx
        echo -e "${GREEN}✅ Nginx reiniciado${NC}"
        
        # 6. Verificar status
        echo -e "${YELLOW}6️⃣ Verificando status final...${NC}"
        sleep 10
        check_docker_status
        
        echo -e "${GREEN}🎉 Deploy completo finalizado!${NC}"
    else
        echo -e "${YELLOW}Deploy cancelado${NC}"
    fi
}

# Função para backup completo
backup_complete() {
    echo -e "${YELLOW}💾 Criando backup completo do sistema...${NC}"
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_dir="/opt/lunasdigital/backups/backup-$timestamp"
    
    # 1. Backup VPS
    echo -e "${YELLOW}1️⃣ Backup VPS via API...${NC}"
    create_vps_backup
    
    # 2. Criar diretório
    echo -e "${YELLOW}2️⃣ Criando diretório de backup...${NC}"
    mkdir -p "$backup_dir"
    
    # 3. Backup containers
    echo -e "${YELLOW}3️⃣ Backup containers Docker...${NC}"
    docker save crm-lunas-digital > "$backup_dir/crm-lunas-digital.tar" 2>/dev/null || true
    docker save inss-lunas-digital > "$backup_dir/inss-lunas-digital.tar" 2>/dev/null || true
    
    # 4. Backup configurações
    echo -e "${YELLOW}4️⃣ Backup configurações...${NC}"
    cp -r /etc/nginx "$backup_dir/" 2>/dev/null || true
    cp -r /opt/lunasdigital/configs "$backup_dir/" 2>/dev/null || true
    
    # 5. Compactar
    echo -e "${YELLOW}5️⃣ Compactando backup...${NC}"
    tar -czf "/opt/lunasdigital/backups/backup-$timestamp.tar.gz" -C /opt/lunasdigital/backups "backup-$timestamp"
    rm -rf "$backup_dir"
    
    echo -e "${GREEN}✅ Backup completo criado: backup-$timestamp.tar.gz${NC}"
}

# Função para status completo
show_complete_status() {
    echo -e "${BLUE}📊 === STATUS COMPLETO DO SISTEMA ===${NC}"
    echo ""
    
    # Status VPS
    echo -e "${CYAN}🖥️  VPS Status:${NC}"
    check_vps_status
    echo ""
    
    # Status Docker
    echo -e "${CYAN}🐳 Docker Status:${NC}"
    check_docker_status
    echo ""
    
    # Status Serviços
    echo -e "${CYAN}🌐 Serviços HTTP:${NC}"
    local services=("CRM:3001" "INSS:3002" "Nginx:80")
    
    for service in "${services[@]}"; do
        local name=$(echo $service | cut -d: -f1)
        local port=$(echo $service | cut -d: -f2)
        
        if curl -s --connect-timeout 3 "http://$VPS_IP:$port" > /dev/null; then
            echo -e "   ${GREEN}✅ $name: Online${NC}"
        else
            echo -e "   ${RED}❌ $name: Offline${NC}"
        fi
    done
    echo ""
    
    # Uso de recursos
    echo -e "${CYAN}💻 Recursos do Sistema:${NC}"
    echo "   Uso de Memória:"
    free -h | grep "Mem:"
    echo "   Uso de Disco:"
    df -h / | tail -1
    echo ""
}

# Função para health check
health_check() {
    echo -e "${YELLOW}🏥 Executando health check...${NC}"
    
    local all_healthy=true
    
    # Verificar VPS
    local vps_response=$(api_request "GET" "/virtual-machines/$VPS_ID")
    if [ $? -eq 0 ]; then
        local vps_state=$(echo "$vps_response" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
        if [ "$vps_state" = "running" ]; then
            echo -e "   ${GREEN}✅ VPS: Healthy ($vps_state)${NC}"
        else
            echo -e "   ${RED}❌ VPS: Unhealthy ($vps_state)${NC}"
            all_healthy=false
        fi
    else
        echo -e "   ${RED}❌ VPS: API Error${NC}"
        all_healthy=false
    fi
    
    # Verificar Docker
    if docker ps > /dev/null 2>&1; then
        local container_count=$(docker ps | wc -l)
        echo -e "   ${GREEN}✅ Docker: Healthy ($container_count containers)${NC}"
    else
        echo -e "   ${RED}❌ Docker: Unhealthy${NC}"
        all_healthy=false
    fi
    
    # Verificar serviços
    local services=("CRM:3001" "INSS:3002" "Nginx:80")
    for service in "${services[@]}"; do
        local name=$(echo $service | cut -d: -f1)
        local port=$(echo $service | cut -d: -f2)
        
        if curl -s --connect-timeout 3 "http://$VPS_IP:$port" > /dev/null; then
            echo -e "   ${GREEN}✅ $name: Healthy${NC}"
        else
            echo -e "   ${RED}❌ $name: Unhealthy${NC}"
            all_healthy=false
        fi
    done
    
    echo ""
    if [ "$all_healthy" = true ]; then
        echo -e "${GREEN}🎉 Sistema: HEALTHY${NC}"
    else
        echo -e "${RED}🚨 Sistema: UNHEALTHY${NC}"
    fi
}

# Função para monitoramento contínuo
continuous_monitoring() {
    echo -e "${YELLOW}📊 Iniciando monitoramento contínuo...${NC}"
    echo -e "${YELLOW}Pressione Ctrl+C para parar${NC}"
    echo ""
    
    while true; do
        local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        echo -e "${BLUE}[$timestamp] === MONITORAMENTO ===${NC}"
        
        # Status rápido
        local vps_response=$(api_request "GET" "/virtual-machines/$VPS_ID")
        if [ $? -eq 0 ]; then
            local vps_state=$(echo "$vps_response" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
            echo -e "   VPS: $vps_state"
        else
            echo -e "   VPS: ${RED}API Error${NC}"
        fi
        
        local container_count=$(docker ps | wc -l)
        echo -e "   Docker: $container_count containers"
        
        # Verificar serviços críticos
        local services=("CRM:3001" "INSS:3002")
        for service in "${services[@]}"; do
            local name=$(echo $service | cut -d: -f1)
            local port=$(echo $service | cut -d: -f2)
            
            if curl -s --connect-timeout 2 "http://$VPS_IP:$port" > /dev/null; then
                echo -e "   $name: ${GREEN}Online${NC}"
            else
                echo -e "   $name: ${RED}Offline${NC}"
            fi
        done
        
        echo ""
        sleep 30
    done
}

# Função para limpeza do Docker
cleanup_docker() {
    echo -e "${YELLOW}🧹 Limpando Docker...${NC}"
    
    echo -e "${YELLOW}Removendo containers parados...${NC}"
    docker container prune -f
    
    echo -e "${YELLOW}Removendo imagens não utilizadas...${NC}"
    docker image prune -f
    
    echo -e "${YELLOW}Removendo volumes não utilizados...${NC}"
    docker volume prune -f
    
    echo -e "${YELLOW}Removendo redes não utilizadas...${NC}"
    docker network prune -f
    
    echo -e "${GREEN}✅ Limpeza do Docker concluída!${NC}"
}

# Função para mostrar ajuda
show_help() {
    echo -e "${BLUE}❓ === AJUDA ===${NC}"
    echo ""
    echo -e "${CYAN}Este script automatiza o gerenciamento do VPS Lunas Digital usando:${NC}"
    echo "• API Hostinger para controle do VPS"
    echo "• Docker para gerenciamento de containers"
    echo "• Scripts de deploy e backup"
    echo ""
    echo -e "${CYAN}Funcionalidades principais:${NC}"
    echo "• 🖥️  Controle completo do VPS via API"
    echo "• 🐳 Gerenciamento de containers Docker"
    echo "• 🚀 Deploy automático de aplicações"
    echo "• 💾 Backup e restore do sistema"
    echo "• 📊 Monitoramento em tempo real"
    echo "• 🔧 Ferramentas de manutenção"
    echo ""
    echo -e "${CYAN}Configurações:${NC}"
    echo "• VPS ID: $VPS_ID"
    echo "• VPS IP: $VPS_IP"
    echo "• API Token: ${API_TOKEN:0:10}..."
    echo ""
    echo -e "${CYAN}Para mais informações, consulte:${NC}"
    echo "• README.md"
    echo "• DEPLOY-RAPIDO.md"
    echo "• CONFIGURACAO-VPS.md"
    echo ""
}

# Loop principal
while true; do
    show_main_menu
    read -p "Digite sua escolha (1-8): " choice
    
    case $choice in
        1) # Menu VPS
            while true; do
                show_vps_menu
                read -p "Digite sua escolha (1-6): " vps_choice
                case $vps_choice in
                    1) check_vps_status ;;
                    2) create_vps_backup ;;
                    3) echo -e "${YELLOW}Funcionalidade em desenvolvimento${NC}" ;;
                    4) restart_vps ;;
                    5) echo -e "${YELLOW}Funcionalidade em desenvolvimento${NC}" ;;
                    6) break ;;
                    *) echo -e "${RED}Opção inválida${NC}" ;;
                esac
                echo ""
                read -p "Pressione Enter para continuar..."
            done
            ;;
        2) # Menu Docker
            while true; do
                show_docker_menu
                read -p "Digite sua escolha (1-7): " docker_choice
                case $docker_choice in
                    1) check_docker_status ;;
                    2) echo -e "${YELLOW}Funcionalidade em desenvolvimento${NC}" ;;
                    3) echo -e "${YELLOW}Funcionalidade em desenvolvimento${NC}" ;;
                    4) restart_container ;;
                    5) view_container_logs ;;
                    6) docker restart $(docker ps -q) ;;
                    7) break ;;
                    *) echo -e "${RED}Opção inválida${NC}" ;;
                esac
                echo ""
                read -p "Pressione Enter para continuar..."
            done
            ;;
        3) # Menu Deploy/Backup
            while true; do
                show_deploy_menu
                read -p "Digite sua escolha (1-7): " deploy_choice
                case $deploy_choice in
                    1) deploy_complete ;;
                    2) backup_complete ;;
                    3) echo -e "${YELLOW}Funcionalidade em desenvolvimento${NC}" ;;
                    4) echo -e "${YELLOW}Funcionalidade em desenvolvimento${NC}" ;;
                    5) echo -e "${YELLOW}Funcionalidade em desenvolvimento${NC}" ;;
                    6) echo -e "${YELLOW}Funcionalidade em desenvolvimento${NC}" ;;
                    7) break ;;
                    *) echo -e "${RED}Opção inválida${NC}" ;;
                esac
                echo ""
                read -p "Pressione Enter para continuar..."
            done
            ;;
        4) # Menu Monitoramento
            while true; do
                show_monitor_menu
                read -p "Digite sua escolha (1-6): " monitor_choice
                case $monitor_choice in
                    1) show_complete_status ;;
                    2) health_check ;;
                    3) continuous_monitoring ;;
                    4) echo -e "${YELLOW}Funcionalidade em desenvolvimento${NC}" ;;
                    5) echo -e "${YELLOW}Funcionalidade em desenvolvimento${NC}" ;;
                    6) break ;;
                    *) echo -e "${RED}Opção inválida${NC}" ;;
                esac
                echo ""
                read -p "Pressione Enter para continuar..."
            done
            ;;
        5) # Menu Manutenção
            while true; do
                show_maintenance_menu
                read -p "Digite sua escolha (1-7): " maintenance_choice
                case $maintenance_choice in
                    1) cleanup_docker ;;
                    2) cleanup_docker ;;
                    3) cleanup_docker ;;
                    4) echo -e "${YELLOW}Funcionalidade em desenvolvimento${NC}" ;;
                    5) df -h ;;
                    6) free -h ;;
                    7) break ;;
                    *) echo -e "${RED}Opção inválida${NC}" ;;
                esac
                echo ""
                read -p "Pressione Enter para continuar..."
            done
            ;;
        6) # Status Completo
            show_complete_status
            echo ""
            read -p "Pressione Enter para continuar..."
            ;;
        7) # Ajuda
            show_help
            echo ""
            read -p "Pressione Enter para continuar..."
            ;;
        8) # Sair
            echo -e "${GREEN}👋 Saindo...${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Opção inválida! Escolha entre 1-8.${NC}"
            ;;
    esac
    
    echo ""
done
