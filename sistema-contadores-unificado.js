// ===== SISTEMA UNIFICADO DE CONTADORES =====
// Este sistema centraliza todas as atualizações de contadores

class SistemaContadores {
    constructor() {
        this.contadores = {
            totalCPFs: 0,
            processados: 0,
            sucessos: 0,
            pendentes: 0,
            naoAutorizados: 0,
            descartados: 0,
            agendados: 0
        };
        
        this.elementos = {};
        this.isInitialized = false;
    }

    // Inicializar sistema
    init() {
        if (this.isInitialized) return;
        
        this.cacheElementos();
        this.setupSocketListeners();
        this.isInitialized = true;
        
        console.log('✅ Sistema de contadores unificado inicializado');
    }

    // Cache de elementos DOM
    cacheElementos() {
        this.elementos = {
            totalCPFs: document.getElementById('totalCPFs'),
            processedCPFs: document.getElementById('processedCPFs'),
            successCPFs: document.getElementById('successCPFs'),
            pendingCPFs: document.getElementById('pendingCPFs'),
            countSuccess: document.getElementById('countSuccess'),
            countPending: document.getElementById('countPending'),
            countNoAuth: document.getElementById('countNoAuth'),
            countDiscarded: document.getElementById('countDiscarded'),
            countScheduled: document.getElementById('countScheduled'),
            agendadosCPFs: document.getElementById('agendadosCPFs')
        };
    }

    // Setup de listeners Socket.IO (apenas um sistema)
    setupSocketListeners() {
        if (typeof io === 'undefined') return;
        
        const socket = io();
        
        // ÚNICO listener para contadores - substitui todos os outros
        socket.on('contadoresTempoReal', (dados) => {
            this.atualizarContadores(dados);
        });
        
        // Manter apenas listeners essenciais
        socket.on('totalCPFs', (total) => {
            this.contadores.totalCPFs = total;
            this.atualizarElemento('totalCPFs', total);
        });
        
        socket.on('progress', (dados) => {
            if (dados.processados !== undefined) {
                this.contadores.processados = dados.processados;
                this.atualizarElemento('processedCPFs', dados.processados);
            }
        });
    }

    // Atualizar contadores (método principal)
    atualizarContadores(dados) {
        if (!dados) return;
        
        // Atualizar objeto interno
        Object.assign(this.contadores, dados);
        
        // Atualizar elementos DOM
        this.atualizarElemento('totalCPFs', dados.totalCPFs);
        this.atualizarElemento('processedCPFs', dados.processados);
        this.atualizarElemento('successCPFs', dados.sucessos);
        this.atualizarElemento('pendingCPFs', dados.pendentes);
        this.atualizarElemento('countSuccess', dados.sucessos);
        this.atualizarElemento('countPending', dados.pendentes);
        this.atualizarElemento('countNoAuth', dados.naoAutorizados);
        this.atualizarElemento('countDiscarded', dados.descartados);
        this.atualizarElemento('countScheduled', dados.agendados);
        this.atualizarElemento('agendadosCPFs', dados.agendados);
        
        console.log('📊 Contadores atualizados:', this.contadores);
    }

    // Atualizar elemento individual
    atualizarElemento(id, valor) {
        const elemento = this.elementos[id];
        if (elemento && valor !== undefined) {
            elemento.textContent = valor;
        }
    }

    // Incrementar contador específico
    incrementar(tipo, valor = 1) {
        if (this.contadores[tipo] !== undefined) {
            this.contadores[tipo] += valor;
            this.atualizarElemento(tipo, this.contadores[tipo]);
        }
    }

    // Definir contador específico
    definir(tipo, valor) {
        if (this.contadores[tipo] !== undefined) {
            this.contadores[tipo] = valor;
            this.atualizarElemento(tipo, valor);
        }
    }

    // Resetar todos os contadores
    resetar() {
        this.contadores = {
            totalCPFs: 0,
            processados: 0,
            sucessos: 0,
            pendentes: 0,
            naoAutorizados: 0,
            descartados: 0,
            agendados: 0
        };
        
        Object.keys(this.contadores).forEach(tipo => {
            this.atualizarElemento(tipo, 0);
        });
        
        console.log('🔄 Contadores resetados');
    }

    // Obter contadores atuais
    obterContadores() {
        return { ...this.contadores };
    }

    // Carregar contadores do servidor
    async carregarDoServidor() {
        try {
            const response = await fetch('/fgts/contadores-status');
            const data = await response.json();
            
            if (data.success && data.contadores) {
                this.atualizarContadores(data.contadores);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar contadores:', error);
        }
    }
}

// Instância global
const contadores = new SistemaContadores();

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    contadores.init();
});

// Exportar para uso global
window.SistemaContadores = contadores;
