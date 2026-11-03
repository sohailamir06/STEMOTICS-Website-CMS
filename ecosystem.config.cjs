// PM2 process definitions for production (Phase 11 §3, Project-Folder-Structure §7.2).
// Start: pm2 start ecosystem.config.cjs --env production
module.exports = {
  apps: [
    {
      name: 'web',
      cwd: './web',
      script: '../node_modules/@react-router/serve/bin.cjs',
      args: './build/server/index.js',
      exec_mode: 'cluster',
      instances: 2,
      env_production: { NODE_ENV: 'production', PORT: 3000, API_URL: 'http://127.0.0.1:4000' }
    },
    {
      name: 'api',
      cwd: './server',
      script: 'src/server.js',
      node_args: '--env-file=.env',
      exec_mode: 'cluster',
      instances: 2,
      env_production: { NODE_ENV: 'production' }
    },
    {
      // Scheduled billing must run exactly once: fork mode, ONE instance, never scale this up.
      name: 'worker',
      cwd: './server',
      script: 'src/worker.js',
      node_args: '--env-file=.env',
      exec_mode: 'fork',
      instances: 1,
      env_production: { NODE_ENV: 'production' }
    }
  ]
};
