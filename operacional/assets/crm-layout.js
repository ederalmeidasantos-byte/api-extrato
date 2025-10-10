// CRM Layout JavaScript - Sistema Operacional Lunas

// Utilitários gerais
const Utils = {
    // Formatar CPF
    formatCPF(cpf) {
        if (!cpf) return '';
        const cleaned = cpf.replace(/\D/g, '');
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    },

    // Formatar telefone
    formatPhone(phone) {
        if (!phone) return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 11) {
            return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (cleaned.length === 10) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        return phone;
    },

    // Formatar moeda
    formatCurrency(value) {
        if (!value) return 'R$ 0,00';
        const num = typeof value === 'string' ? parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) : value;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(num);
    },

    // Formatar data
    formatDate(date) {
        if (!date) return '';
        try {
            const d = new Date(date);
            return d.toLocaleDateString('pt-BR');
        } catch {
            return date;
        }
    },

    // Formatar data e hora
    formatDateTime(date) {
        if (!date) return '';
        try {
            const d = new Date(date);
            return d.toLocaleString('pt-BR');
        } catch {
            return date;
        }
    },

    // Validar CPF
    validateCPF(cpf) {
        if (!cpf) return false;
        const cleaned = cpf.replace(/\D/g, '');
        
        if (cleaned.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(cleaned)) return false;

        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cleaned.charAt(i)) * (10 - i);
        }
        let remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleaned.charAt(9))) return false;

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cleaned.charAt(i)) * (11 - i);
        }
        remainder = (sum * 10) % 11;
        if (remainder === 10 || remainder === 11) remainder = 0;
        if (remainder !== parseInt(cleaned.charAt(10))) return false;

        return true;
    },

    // Debounce para inputs
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Mostrar loading
    showLoading(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) {
            element.innerHTML = '<div class="loading"><div class="spinner"></div>Carregando...</div>';
        }
    },

    // Mostrar erro
    showError(element, message) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) {
            element.innerHTML = `
                <div class="empty-state">
                    <div style="width: 64px; height: 64px; background: #fef2f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                        <i data-feather="alert-triangle" style="color: #ef4444;"></i>
                    </div>
                    <h3>Erro</h3>
                    <p>${message}</p>
                </div>
            `;
            feather.replace();
        }
    },

    // Mostrar estado vazio
    showEmpty(element, title = 'Nenhum item encontrado', message = 'Tente ajustar os filtros de busca') {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        if (element) {
            element.innerHTML = `
                <div class="empty-state">
                    <div style="width: 64px; height: 64px; background: #f9fafb; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                        <i data-feather="search" style="color: #6b7280;"></i>
                    </div>
                    <h3>${title}</h3>
                    <p>${message}</p>
                </div>
            `;
            feather.replace();
        }
    }
};

// Gerenciador de API
const API = {
    baseURL: '/api',

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Erro na API:', error);
            throw error;
        }
    },

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
};

// Gerenciador de Notificações
const Notifications = {
    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i data-feather="${this.getIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Adicionar estilos se não existirem
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    padding: 1rem;
                    z-index: 10000;
                    animation: slideIn 0.3s ease;
                    max-width: 400px;
                }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .notification-success { border-left: 4px solid #10b981; }
                .notification-error { border-left: 4px solid #ef4444; }
                .notification-warning { border-left: 4px solid #f59e0b; }
                .notification-info { border-left: 4px solid #3b82f6; }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);
        feather.replace();

        // Remover após o tempo especificado
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    getIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            warning: 'alert-triangle',
            info: 'info'
        };
        return icons[type] || 'info';
    },

    success(message) {
        this.show(message, 'success');
    },

    error(message) {
        this.show(message, 'error');
    },

    warning(message) {
        this.show(message, 'warning');
    },

    info(message) {
        this.show(message, 'info');
    }
};

// Gerenciador de Modal
const Modal = {
    show(content, options = {}) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${options.title || 'Modal'}</h3>
                    <button class="modal-close" onclick="Modal.hide()">
                        <i data-feather="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${options.footer ? `<div class="modal-footer">${options.footer}</div>` : ''}
            </div>
        `;

        // Adicionar estilos se não existirem
        if (!document.querySelector('#modal-styles')) {
            const styles = document.createElement('style');
            styles.id = 'modal-styles';
            styles.textContent = `
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                    animation: fadeIn 0.3s ease;
                }
                .modal {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    overflow: hidden;
                    animation: scaleIn 0.3s ease;
                }
                .modal-header {
                    padding: 1.5rem;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                .modal-close {
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: 6px;
                    color: #6b7280;
                }
                .modal-close:hover {
                    background: #f3f4f6;
                    color: #374151;
                }
                .modal-body {
                    padding: 1.5rem;
                    max-height: 60vh;
                    overflow-y: auto;
                }
                .modal-footer {
                    padding: 1.5rem;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(modal);
        feather.replace();

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hide();
            }
        });

        return modal;
    },

    hide() {
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.style.animation = 'fadeIn 0.3s ease reverse';
            setTimeout(() => modal.remove(), 300);
        }
    }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Feather Icons
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // Adicionar funcionalidade de sidebar mobile
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Adicionar funcionalidade de busca em tempo real
    const searchInputs = document.querySelectorAll('input[data-search]');
    searchInputs.forEach(input => {
        const debouncedSearch = Utils.debounce((value) => {
            const target = input.dataset.search;
            const callback = window[target];
            if (typeof callback === 'function') {
                callback(value);
            }
        }, 300);

        input.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
    });

    // Adicionar validação de CPF em tempo real
    const cpfInputs = document.querySelectorAll('input[data-cpf]');
    cpfInputs.forEach(input => {
        input.addEventListener('blur', (e) => {
            const cpf = e.target.value;
            if (cpf && !Utils.validateCPF(cpf)) {
                e.target.classList.add('is-invalid');
                Notifications.warning('CPF inválido');
            } else {
                e.target.classList.remove('is-invalid');
                e.target.classList.add('is-valid');
            }
        });
    });

    console.log('🚀 CRM Layout inicializado');
});

// Exportar para uso global
window.Utils = Utils;
window.API = API;
window.Notifications = Notifications;
window.Modal = Modal;