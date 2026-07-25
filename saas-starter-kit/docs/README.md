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
| [AI.md](../AI.md) | AI coding context — architecture, patterns, guard rules, do-nots |
| [AI_PROMPTS.md](./AI_PROMPTS.md) | Ready-to-use prompt templates for vibe coding |
| [MODULE_TEMPLATE.md](./MODULE_TEMPLATE.md) | Copy-paste skeletons for new backend/frontend modules |

Supporting specs live at the repo root: `README.md`, `AGENTS.md` (if present),
`docker-compose.yml`, `Dockerfile.api`, `Dockerfile.web`, `nginx/default.conf`,
`ecosystem.config.js`, `.github/workflows/ci.yml`, `.cursorrules`.
