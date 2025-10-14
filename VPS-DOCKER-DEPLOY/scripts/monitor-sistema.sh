#!/bin/bash

# Script de Monitoramento do Sistema Lunas Digital
# Versão: 1.0.0
# Autor: Lunas Digital

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Configurações
BASE_DIR="/opt/lunasdigital"
LOG_FILE="$BASE_DIR/logs/monitor.log"
ALERT_EMAIL="admin@lunasdigital.com.br"

# Criar diretório de logs se não existir
mkdir -p $BASE_DIR/logs

# Função para verificar status do sistema
check_system_status() {
    echo -e "${CYAN}=== STATUS DO SISTEMA ===${NC}"
    echo "Data: $(date)"
    echo "Uptime: $(uptime)"
    echo "Load Average: $(cat /proc/loadavg)"
    echo ""
}

# Função para verificar containers Docker
check_docker_containers() {
    echo -e "${CYAN}=== CONTAINERS DOCKER ===${NC}"
    
    if command -v docker > /dev/null 2>&1; then
        echo "Containers rodando:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Size}}"
        echo ""
        
        # Verificar containers específicos
        CRM_CONTAINER=$(docker ps -q --filter "name=crm")
        INSS_CONTAINER=$(docker ps -q --filter "name=inss")
        
        if [ ! -z "$CRM_CONTAINER" ]; then
            success "Container CRM está rodando"
        else
            error "Container CRM não está rodando"
        fi
        
        if [ ! -z "$INSS_CONTAINER" ]; then
            success "Container INSS está rodando"
        else
            error "Container INSS não está rodando"
        fi
        
        echo ""
    else
        error "Docker não está instalado"
    fi
}

# Função para verificar uso de recursos
check_resource_usage() {
    echo -e "${CYAN}=== USO DE RECURSOS ===${NC}"
    
    # Memória
    echo "Memória:"
    free -h
    echo ""
    
    # Disco
    echo "Disco:"
    df -h
    echo ""
    
    # CPU
    echo "CPU:"
    top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print "CPU Usage: " 100 - $1 "%"}'
    echo ""
    
    # Verificar limites de recursos
    MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if (( $(echo "$MEMORY_USAGE > 80" | bc -l) )); then
        warning "Uso de memória alto: ${MEMORY_USAGE}%"
    else
        success "Uso de memória normal: ${MEMORY_USAGE}%"
    fi
    
    if [ "$DISK_USAGE" -gt 80 ]; then
        warning "Uso de disco alto: ${DISK_USAGE}%"
    else
        success "Uso de disco normal: ${DISK_USAGE}%"
    fi
    
    echo ""
}

# Função para verificar serviços
check_services() {
    echo -e "${CYAN}=== SERVIÇOS ===${NC}"
    
    # Docker
    if systemctl is-active --quiet docker; then
        success "Docker está ativo"
    else
        error "Docker não está ativo"
    fi
    
    # Nginx
    if systemctl is-active --quiet nginx; then
        success "Nginx está ativo"
    else
        error "Nginx não está ativo"
    fi
    
    # SSH
    if systemctl is-active --quiet ssh; then
        success "SSH está ativo"
    else
        error "SSH não está ativo"
    fi
    
    echo ""
}

# Função para verificar conectividade
check_connectivity() {
    echo -e "${CYAN}=== CONECTIVIDADE ===${NC}"
    
    # Testar URLs locais
    if curl -s http://localhost:3001 > /dev/null; then
        success "CRM respondendo na porta 3001"
    else
        error "CRM não está respondendo na porta 3001"
    fi
    
    if curl -s http://localhost:3002 > /dev/null; then
        success "INSS respondendo na porta 3002"
    else
        error "INSS não está respondendo na porta 3002"
    fi
    
    if curl -s http://localhost > /dev/null; then
        success "Nginx respondendo na porta 80"
    else
        error "Nginx não está respondendo na porta 80"
    fi
    
    # Testar conectividade externa
    if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
        success "Conectividade externa OK"
    else
        error "Problema de conectividade externa"
    fi
    
    echo ""
}

# Função para verificar logs de erro
check_error_logs() {
    echo -e "${CYAN}=== LOGS DE ERRO ===${NC}"
    
    # Logs do Nginx
    if [ -f "/var/log/nginx/error.log" ]; then
        ERROR_COUNT=$(tail -n 100 /var/log/nginx/error.log | grep -c "error\|ERROR" || echo "0")
        if [ "$ERROR_COUNT" -gt 0 ]; then
            warning "Encontrados $ERROR_COUNT erros nos logs do Nginx"
            echo "Últimos erros:"
            tail -n 5 /var/log/nginx/error.log | grep -i error
        else
            success "Nenhum erro encontrado nos logs do Nginx"
        fi
    fi
    
    # Logs do Docker
    if command -v docker > /dev/null 2>&1; then
        echo "Logs de erro dos containers:"
        docker ps --format "{{.Names}}" | while read container; do
            ERROR_COUNT=$(docker logs $container 2>&1 | tail -n 100 | grep -c "error\|ERROR" || echo "0")
            if [ "$ERROR_COUNT" -gt 0 ]; then
                warning "Container $container: $ERROR_COUNT erros"
            else
                success "Container $container: sem erros"
            fi
        done
    fi
    
    echo ""
}

# Função para verificar SSL
check_ssl() {
    echo -e "${CYAN}=== CERTIFICADOS SSL ===${NC}"
    
    # Verificar certificados
    for domain in crm.lunasdigital.com.br inss.lunasdigital.com.br api.lunasdigital.com.br; do
        if [ -f "/etc/nginx/ssl/$domain.crt" ]; then
            EXPIRY_DATE=$(openssl x509 -in /etc/nginx/ssl/$domain.crt -noout -enddate | cut -d= -f2)
            EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
            CURRENT_EPOCH=$(date +%s)
            DAYS_LEFT=$(( (EXPIRY_EPOCH - CURRENT_EPOCH) / 86400 ))
            
            if [ "$DAYS_LEFT" -lt 30 ]; then
                warning "Certificado $domain expira em $DAYS_LEFT dias"
            else
                success "Certificado $domain válido por $DAYS_LEFT dias"
            fi
        else
            error "Certificado $domain não encontrado"
        fi
    done
    
    echo ""
}

# Função para verificar backups
check_backups() {
    echo -e "${CYAN}=== BACKUPS ===${NC}"
    
    BACKUP_DIR="/opt/lunasdigital/backups"
    
    if [ -d "$BACKUP_DIR" ]; then
        BACKUP_COUNT=$(ls -1 $BACKUP_DIR/backup_lunasdigital_*.tar.gz 2>/dev/null | wc -l)
        if [ "$BACKUP_COUNT" -gt 0 ]; then
            success "Encontrados $BACKUP_COUNT backups"
            
            # Verificar backup mais recente
            LATEST_BACKUP=$(ls -t $BACKUP_DIR/backup_lunasdigital_*.tar.gz 2>/dev/null | head -n1)
            if [ ! -z "$LATEST_BACKUP" ]; then
                BACKUP_DATE=$(stat -c %y "$LATEST_BACKUP" | cut -d' ' -f1)
                BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
                echo "Backup mais recente: $BACKUP_DATE ($BACKUP_SIZE)"
            fi
        else
            warning "Nenhum backup encontrado"
        fi
    else
        error "Diretório de backup não encontrado"
    fi
    
    echo ""
}

# Função para verificar segurança
check_security() {
    echo -e "${CYAN}=== SEGURANÇA ===${NC}"
    
    # Verificar firewall
    if command -v ufw > /dev/null 2>&1; then
        if ufw status | grep -q "Status: active"; then
            success "Firewall UFW ativo"
        else
            warning "Firewall UFW não está ativo"
        fi
    elif command -v firewall-cmd > /dev/null 2>&1; then
        if firewall-cmd --state | grep -q "running"; then
            success "Firewall firewalld ativo"
        else
            warning "Firewall firewalld não está ativo"
        fi
    else
        warning "Nenhum firewall encontrado"
    fi
    
    # Verificar atualizações
    if command -v apt > /dev/null 2>&1; then
        UPDATES=$(apt list --upgradable 2>/dev/null | wc -l)
        if [ "$UPDATES" -gt 1 ]; then
            warning "Há $((UPDATES-1)) atualizações disponíveis"
        else
            success "Sistema atualizado"
        fi
    fi
    
    # Verificar usuários com sudo
    SUDO_USERS=$(grep -c '^sudo:' /etc/group)
    echo "Usuários com sudo: $SUDO_USERS"
    
    echo ""
}

# Função para gerar relatório
generate_report() {
    echo -e "${PURPLE}=== RELATÓRIO DE MONITORAMENTO ===${NC}"
    echo "Sistema: Lunas Digital"
    echo "Data: $(date)"
    echo "Hostname: $(hostname)"
    echo "IP: $(hostname -I | awk '{print $1}')"
    echo ""
    
    check_system_status
    check_docker_containers
    check_resource_usage
    check_services
    check_connectivity
    check_error_logs
    check_ssl
    check_backups
    check_security
    
    echo -e "${PURPLE}=== FIM DO RELATÓRIO ===${NC}"
}

# Função para monitoramento contínuo
continuous_monitor() {
    echo -e "${CYAN}Iniciando monitoramento contínuo...${NC}"
    echo "Pressione Ctrl+C para parar"
    echo ""
    
    while true; do
        clear
        generate_report
        sleep 30
    done
}

# Função para salvar log
save_log() {
    generate_report >> $LOG_FILE
    echo "Relatório salvo em: $LOG_FILE"
}

# Função para enviar alertas
send_alerts() {
    # Verificar se há problemas críticos
    CRITICAL_ISSUES=0
    
    # Verificar containers
    if ! docker ps | grep -q "crm"; then
        CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    fi
    
    if ! docker ps | grep -q "inss"; then
        CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    fi
    
    # Verificar uso de recursos
    MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.0f", $3/$2 * 100.0)}')
    if [ "$MEMORY_USAGE" -gt 90 ]; then
        CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    fi
    
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 90 ]; then
        CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
    fi
    
    # Enviar alerta se necessário
    if [ "$CRITICAL_ISSUES" -gt 0 ]; then
        if command -v mail > /dev/null 2>&1; then
            echo "Sistema Lunas Digital - $CRITICAL_ISSUES problemas críticos detectados em $(date)" | mail -s "ALERTA: Problemas Críticos" $ALERT_EMAIL
        fi
        warning "Enviado alerta: $CRITICAL_ISSUES problemas críticos"
    fi
}

# Menu principal
case "${1:-}" in
    "continuous"|"c")
        continuous_monitor
        ;;
    "log"|"l")
        save_log
        ;;
    "alert"|"a")
        send_alerts
        ;;
    "help"|"h"|"-h"|"--help")
        echo "Uso: $0 [opção]"
        echo ""
        echo "Opções:"
        echo "  continuous, c  - Monitoramento contínuo"
        echo "  log, l         - Salvar relatório em log"
        echo "  alert, a       - Verificar e enviar alertas"
        echo "  help, h        - Mostrar esta ajuda"
        echo ""
        echo "Sem opção: Mostrar relatório único"
        ;;
    *)
        generate_report
        ;;
esac
