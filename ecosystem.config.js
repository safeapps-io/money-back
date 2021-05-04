module.exports = {
  apps: [
    {
      name: 'app',

      script: 'TS_NODE_FILES=true ./node_modules/.bin/ts-node',
      args: '-r tsconfig-paths/register -T ./src/server.ts',

      exec_mode: 'cluster',
      instances: 'max',

      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'worker',

      script: 'TS_NODE_FILES=true ./node_modules/.bin/ts-node',
      args: '-r tsconfig-paths/register -T ./src/worker.ts',

      exec_mode: 'cluster',
      instances: 'max',

      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
    {
      name: 'admin',

      script: 'TS_NODE_FILES=true ./node_modules/.bin/ts-node',
      args: '-r tsconfig-paths/register -T ./src/admin/app.ts',

      exec_mode: 'cluster',
      instances: 'max',

      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
}
