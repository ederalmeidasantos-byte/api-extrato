module.exports = {
  apps: [{
    name: 'inss-sistema',
    script: './server-inss.js',
    cwd: './INSS',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      INSS_PORT: 3003
    },
    error_file: '../logs/inss-error.log',
    out_file: '../logs/inss-out.log',
    log_file: '../logs/inss-combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};


