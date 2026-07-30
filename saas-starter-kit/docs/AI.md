# Using AI with the SaaS Starter Kit

This guide explains how to effectively use AI coding assistants (Claude, Cursor, Copilot, etc.) with the SaaS Starter Kit for different kinds of problems and requirements.

## Quick Start

1. **Open the project** in your AI-assisted editor (Cursor, VS Code + Claude, GitHub Copilot, etc.)
2. **Read the relevant context files**:
   - `CLAUDE.md` — Claude Code project overview
   - `.cursorrules` — Cursor rules
   - `.github/copilot-instructions.md` — Copilot instructions
   - `AGENTS.md` — Full prompt templates and architecture reference
3. **Use the prompt templates** in `docs/AI_PROMPTS.md` for common tasks
4. **Reference the architecture docs** in `docs/` for deep context

## How to Adapt the Boilerplate for Different Problems

### 1. Change the Domain

The boilerplate is domain-agnostic. To adapt it for a different SaaS product (e.g., marketplace, CRM, LMS, helpdesk):

1. **Rename modules**: Replace `project`/`task` with your domain entities (e.g., `listing`/`order`, `contact`/`deal`, `course`/`lesson`, `ticket`/`reply`)
2. **Update permissions**: Add new permission enum values in `packages/shared/src/enums.ts`
3. **Update roles**: Grant new permissions in `ROLE_PERMISSIONS`
4. **Update frontend pages**: Replace dashboard pages under `apps/web/src/app/dashboard/`
5. **Update the ERD**: Modify `docs/ERD.md` to reflect your entities

### 2. Add a New Feature

Use the prompt template in `docs/AI_PROMPTS.md` ("Add a new feature module") or follow this checklist:

1. Add entity with `organizationId` + `@Index()` in `apps/api/src/[feature]/entities/`
2. Add DTOs with `class-validator` in `apps/api/src/[feature]/dto/`
3. Add service with CRUD scoped by `organizationId` in `apps/api/src/[feature]/services/`
4. Add controller with `@Permissions(...)` in `apps/api/src/[feature]/controllers/`
5. Register module in `apps/api/src/app.module.ts`
6. Add permission enum values to `packages/shared/src/enums.ts`
7. Grant permissions in `ROLE_PERMISSIONS`
8. Add frontend page at `apps/web/src/app/dashboard/[feature]/page.tsx`
9. Run migration: `npm run migration:generate --workspace apps/api -- name=Add[Feature]`
10. Run migration: `npm run migrate --workspace apps/api`

### 3. Integrate a Third-Party Service

**Stripe** — Already scaffolded in `apps/api/src/billing/`. Add webhook handling in the billing controller and mark it `@Public()`.

**OpenAI** — Already scaffolded in `apps/api/src/ai/`. Configure `OPENAI_API_KEY` and `AI_CHAT_MODEL` in `.env`.

**Email (SendGrid, Resend, etc.)** — Configure `EMAIL_PROVIDER` and `EMAIL_FROM`. The email module uses BullMQ; add your provider to `apps/api/src/email/`.

**Storage (S3, etc.)** — Configure `STORAGE_PROVIDER` and `STORAGE_BASE_URL`. The file module already supports pluggable storage.

### 4. Change Authentication

The boilerplate supports JWT + Google OAuth + TOTP + Passkeys. To add a new provider:

1. Add strategy in `apps/api/src/auth/strategies/`
2. Add controller endpoint in `apps/api/src/auth/`
3. Add provider config in `apps/api/src/config/app.config.ts`
4. Update `apps/api/src/auth/auth.module.ts` imports

### 5. Multi-Tenancy Changes

The boilerplate uses `organizationId` for tenant isolation. If you need a different isolation model (e.g., workspace-only, no tenant):

1. Remove `organizationId` from entities that don't need it
2. Remove `x-organization-id` header requirement from relevant routes
3. Update `PermissionGuard` to skip tenant context when not needed
4. Update frontend `api-client.ts` to not send `x-organization-id`

## AI Tool Configuration

### Cursor

The `.cursorrules` file at the repo root provides Cursor-specific rules. It covers:
- Critical rules (guards, responses, entities)
- File patterns (backend module, frontend feature)
- Do-not list
- Key reference files

### Claude Code

The `CLAUDE.md` file at the repo root provides Claude Code with:
- Project overview and architecture
- Critical rules
- File patterns
- Key reference files

### GitHub Copilot

The `.github/copilot-instructions.md` file provides Copilot with:
- Project structure overview
- Backend and frontend rules
- Code patterns
- Do-not list

## Prompt Templates

See `docs/AI_PROMPTS.md` for ready-to-use prompts for:
- Adding a new feature module
- Adding a new API endpoint
- Adding a new frontend page
- Fixing a bug
- Adding a new permission
- Adding an email template
- Adding a Stripe webhook

## Architecture Reference

| Doc | Contents |
|-----|----------|
| `docs/API.md` | Full API specification |
| `docs/ERD.md` | Entity relationship diagram |
| `docs/RBAC.md` | Permission matrix |
| `docs/PATTERNS.md` | Reusable code patterns |
| `docs/MULTITENANT.md` | Multi-tenancy architecture |
| `docs/AUTH_FLOW.md` | Authentication flow |
| `docs/DEPLOYMENT.md` | Deployment guide |
| `docs/MODULE_TEMPLATE.md` | Copy-paste skeletons for new modules |

## Tips for Better AI Results

1. **Be specific about the module**: Instead of "add a feature", say "add a `Coupon` module to the billing area"
2. **Reference existing patterns**: Point to specific files like `apps/api/src/project/project.controller.ts`
3. **Include constraints**: Mention "must use `ok()`/`fail()`", "must scope by `organizationId`"
4. **Ask for migrations**: Always request a TypeORM migration when adding entities
5. **Ask for frontend + backend**: The boilerplate is full-stack; specify both sides
6. **Use the permission system**: Always ask to add proper permissions, not just route protection
7. **Request tests**: Ask for unit tests following the existing patterns in `apps/api/src/`