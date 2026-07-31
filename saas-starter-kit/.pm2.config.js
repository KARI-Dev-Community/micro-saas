# Create directory for logs and pid files
dirs:
  - logs
  - logs/saas-api
  - logs/saas-web

pm2:
  home: "/home/user/.pm2"

  script_name: "saas"

  cron:
    "*/5 * * * *": "pm2 reloadLogs"

  min_uptime: 10
  max_restarts: 10

  err_file: "./logs/saas-api-error.log"
  out_file: "./logs/saas-api-out.log"

  pid_file: "./pm2.pid"
  tmux: false

  env:
    NODE_ENV: "production"

  filter:
    error:
      - "Error:"
      - "UncaughtException"
      - "UnhandledRejection"