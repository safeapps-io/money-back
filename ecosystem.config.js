module.exports = {
  apps: [
    {
      name: 'app',

      script: 'dist/server.js',

      exec_mode: 'cluster',
      instances: 'max',

      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
}
