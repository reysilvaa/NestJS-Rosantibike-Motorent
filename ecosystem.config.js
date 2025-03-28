module.exports = {
  apps: [
    {
      name: 'rental-api',
      script: 'dist/main.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      node_args: '--max-old-space-size=300',
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      merge_logs: true,
      max_logs: 5,
      log_size: '10M',
    },
  ],
}; 