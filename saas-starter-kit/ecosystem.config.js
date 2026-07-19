module.exports = {
  apps: [
    {
      name: "saas-api",
      cwd: "./apps/api",
      script: "dist/main.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      exp_backoff_restarts: true,
      max_memory_restart: "512M",
    },
    {
      name: "saas-web",
      cwd: "./apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
