/**
 * Configurações do Simulador INSS
 * Centraliza todas as configurações do sistema
 */

const config = {
    // Configurações do servidor
    server: {
        port: process.env.PORT || 3000,
        host: process.env.HOST || 'localhost'
    },

    // Configurações de upload
    upload: {
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: ['application/pdf'],
        destination: 'var/data/extratos/'
    },

    // Configurações de cache
    cache: {
        ttlDays: 7, // 7 dias
        ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 dias em ms
        maxFiles: 1000
    },

    // Configurações da API OpenAI
    openai: {
        model: 'gpt-4',
        maxTokens: 4000,
        temperature: 0.1
    },

    // Configurações de simulação
    simulation: {
        defaultTerm: 96, // 96 meses padrão
        minParcelas: 1,
        maxParcelas: 120,
        defaultTaxa: 1.66 // 1.66% a.m.
    },

    // Configurações de interface
    ui: {
        mobileBreakpoint: 768,
        animationDuration: 300,
        debounceDelay: 500
    },

    // Configurações de logs
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableConsole: true,
        enableFile: true,
        logFile: 'logs/simulador.log'
    },

    // Configurações de segurança
    security: {
        rateLimit: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100 // máximo 100 requests por IP
        },
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true
        }
    },

    // Configurações de banco de dados (se necessário)
    database: {
        type: 'file', // file, mysql, postgresql
        path: 'var/data/',
        backup: {
            enabled: true,
            interval: 24 * 60 * 60 * 1000, // 24 horas
            maxBackups: 7
        }
    },

    // Configurações de notificações
    notifications: {
        email: {
            enabled: false,
            smtp: {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT,
                secure: true,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            }
        },
        webhook: {
            enabled: false,
            url: process.env.WEBHOOK_URL
        }
    },

    // Configurações de monitoramento
    monitoring: {
        enabled: true,
        metrics: {
            responseTime: true,
            errorRate: true,
            cacheHitRate: true,
            uploadSuccess: true
        },
        alerts: {
            errorThreshold: 5, // 5% de erro
            responseTimeThreshold: 5000 // 5 segundos
        }
    }
};

module.exports = config;



