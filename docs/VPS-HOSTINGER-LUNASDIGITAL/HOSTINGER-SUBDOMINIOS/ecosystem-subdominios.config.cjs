// Configuração PM2 para Múltiplos Subdomínios
// Execute: pm2 start ecosystem-subdominios.config.cjs

module.exports = {
  apps: [
    {
      // API Principal - Subdomínio: api.seudominio.com
      name: 'api-principal',
      script: 'server.js',
      cwd: '/root/API Lunas',
      instances: 1,
      exec_mode: 'fork',
      port: 3000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SUBDOMINIO: 'api'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        SUBDOMINIO: 'api'
      },
      log_file: '/var/log/api/api-principal.log',
      out_file: '/var/log/api/api-principal-out.log',
      error_file: '/var/log/api/api-principal-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024 --expose-gc',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'var/data', 'uploads'],
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      // Sistema FGTS - Subdomínio: fgts.seudominio.com
      name: 'fgts-sistema',
      script: 'fgts/server-fgts.js',
      cwd: '/root/API Lunas',
      instances: 1,
      exec_mode: 'fork',
      port: 3001,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        SUBDOMINIO: 'fgts'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        SUBDOMINIO: 'fgts'
      },
      log_file: '/var/log/api/fgts-sistema.log',
      out_file: '/var/log/api/fgts-sistema-out.log',
      error_file: '/var/log/api/fgts-sistema-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024 --expose-gc',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'var/data', 'uploads'],
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      // Sistema INSS - Subdomínio: inss.seudominio.com
      name: 'inss-sistema',
      script: 'INSS/server-inss.js',
      cwd: '/root/API Lunas',
      instances: 1,
      exec_mode: 'fork',
      port: 3002,
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        SUBDOMINIO: 'inss'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        SUBDOMINIO: 'inss'
      },
      log_file: '/var/log/api/inss-sistema.log',
      out_file: '/var/log/api/inss-sistema-out.log',
      error_file: '/var/log/api/inss-sistema-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024 --expose-gc',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'var/data', 'uploads'],
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      // Painel Administrativo - Subdomínio: admin.seudominio.com
      name: 'admin-painel',
      script: 'operacional/server-admin.js',
      cwd: '/root/API Lunas',
      instances: 1,
      exec_mode: 'fork',
      port: 3003,
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
        SUBDOMINIO: 'admin'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003,
        SUBDOMINIO: 'admin'
      },
      log_file: '/var/log/api/admin-painel.log',
      out_file: '/var/log/api/admin-painel-out.log',
      error_file: '/var/log/api/admin-painel-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024 --expose-gc',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'var/data', 'uploads'],
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ],

  // Configurações de deploy
  deploy: {
    production: {
      user: 'root',
      host: '72.60.159.149',
      ref: 'origin/main',
      repo: 'git@github.com:ederalmeidasantos-byte/api-extrato.git',
      path: '/root/API Lunas',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem-subdominios.config.cjs --env production',
      'pre-setup': ''
    }
  }
};
