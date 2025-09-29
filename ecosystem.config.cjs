module.exports = {
  apps: [{
    name: 'api-extrato',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '2G',
    node_args: '--max-old-space-size=2048 --expose-gc',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      PERSISTENT_DIR: '/var/data'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'cache', 'uploads'],
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
