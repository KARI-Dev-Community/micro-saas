# Documentation

This folder contains the deliverables for the SaaS Starter Kit.

| Document | Contents |
|----------|----------|
| [ERD.md](./ERD.md) | Entity relationship diagram (Mermaid) + relationship table |
| [RBAC.md](./RBAC.md) | Role-based access control permission matrix (6 roles) + how it works |
| [API.md](./API.md) | Full API specification (auth, orgs, billing, users, projects, AI, notifications, search, dashboard, admin) |
| [AUTH_FLOW.md](./AUTH_FLOW.md) | Authentication & security flow (login, refresh, 2FA, passkeys, social, sessions) |
| [MULTITENANT.md](./MULTITENANT.md) | Multi-tenancy architecture (org/workspace/team/membership, isolation, switching) |
| [PATTERNS.md](./PATTERNS.md) | Reusable code patterns for extending the kit |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production deployment guide (Docker, PM2, Nginx, CI/CD, hardening) |

Supporting specs live at the repo root: `README.md`, `AGENTS.md` (if present),
`docker-compose.yml`, `Dockerfile.api`, `Dockerfile.web`, `nginx/default.conf`,
`ecosystem.config.js`, `.github/workflows/ci.yml`.
