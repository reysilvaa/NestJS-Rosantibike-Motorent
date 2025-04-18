module.exports = {
  apps: [
    {
      name: 'rental-backend',
      script: 'dist/src/main.js',
      exec_mode: 'cluster',
      instances: 'max',
      max_memory_restart: process.env.PM2_MAX_MEMORY || '750M',
      node_args: process.env.PM2_NODE_ARGS || '--max-old-space-size=700',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      watch: false,
      source_map_support: false,
      error_file: 'logs/error.log',
      out_file: 'logs/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      min_uptime: '60s',
      max_restarts: 10,
      restart_delay: 5000,
      autorestart: true,
      listen_timeout: 30000,
      kill_timeout: 5000,
    },
  ],
};
