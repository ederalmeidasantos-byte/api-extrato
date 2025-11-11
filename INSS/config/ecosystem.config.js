module.exports = {
  apps: [
    {
      name: 'inss-simulador',
      script: 'server-inss.js',
      cwd: '/root/api-lunas/INSS',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      log_file: '/root/api-lunas/INSS/logs/combined.log',
      out_file: '/root/api-lunas/INSS/logs/out.log',
      error_file: '/root/api-lunas/INSS/logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      autorestart: true,
      watch_delay: 1000
    }
  ]
};

