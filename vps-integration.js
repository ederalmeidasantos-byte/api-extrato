// Módulo de Integração VPS para server.js
// Compatível com ES6 modules

import axios from 'axios';

class VPSIntegration {
    constructor() {
        this.apiToken = 'llr3i3O4HmftTCx0uuNzRNpjHkM1wnsmfyEkFNjC5e9050c2';
        this.baseURL = 'https://developers.hostinger.com/api/vps/v1';
        this.vmId = '1035582';
        this.vpsIP = '72.60.159.149';
        this.headers = {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Verifica status do VPS
     */
    async getVPSStatus() {
        try {
            const response = await axios.get(`${this.baseURL}/virtual-machines/${this.vmId}`, {
                headers: this.headers
            });
            return {
                success: true,
                data: response.data,
                status: response.data.state
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Verifica status dos serviços locais
     */
    async checkLocalServices() {
        const services = [
            { name: 'FGTS Service', port: 3000, path: '/health' },
            { name: 'INSS Service', port: 3001, path: '/health' },
            { name: 'Nginx', port: 80, path: '/' },
            { name: 'API Principal', port: 3002, path: '/api/status' }
        ];

        const results = [];

        for (const service of services) {
            try {
                const response = await axios.get(`http://${this.vpsIP}:${service.port}${service.path}`, {
                    timeout: 5000
                });
                
                results.push({
                    service: service.name,
                    status: 'online',
                    port: service.port,
                    responseTime: response.headers['x-response-time'] || 'N/A'
                });
                
            } catch (error) {
                results.push({
                    service: service.name,
                    status: 'offline',
                    port: service.port,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Cria backup do VPS
     */
    async createBackup() {
        try {
            const response = await axios.post(`${this.baseURL}/virtual-machines/${this.vmId}/backups`, {}, {
                headers: this.headers
            });
            return {
                success: true,
                data: response.data,
                message: 'Backup criado com sucesso!'
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Lista backups disponíveis
     */
    async listBackups() {
        try {
            const response = await axios.get(`${this.baseURL}/virtual-machines/${this.vmId}/backups`, {
                headers: this.headers
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Reinicia o VPS
     */
    async restartVPS() {
        try {
            const response = await axios.post(`${this.baseURL}/virtual-machines/${this.vmId}/restart`, {}, {
                headers: this.headers
            });
            return {
                success: true,
                data: response.data,
                message: 'VPS reiniciado com sucesso!'
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Obtém métricas do VPS
     */
    async getMetrics() {
        try {
            const response = await axios.get(`${this.baseURL}/virtual-machines/${this.vmId}/metrics`, {
                headers: this.headers
            });
            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message
            };
        }
    }

    /**
     * Status completo do sistema
     */
    async getSystemStatus() {
        try {
            const [vpsStatus, servicesStatus] = await Promise.all([
                this.getVPSStatus(),
                this.checkLocalServices()
            ]);

            return {
                success: true,
                data: {
                    vps: vpsStatus,
                    services: servicesStatus,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Exportar para uso em server.js
export default VPSIntegration;
