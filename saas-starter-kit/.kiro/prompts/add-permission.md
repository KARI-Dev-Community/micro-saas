# Kiro Prompt: Add a New Permission

Add a new permission `[resource].[action]` to the SaaS starter kit.

## Steps

1. Add enum value to `Permission` in `packages/shared/src/enums.ts`
2. Add it to the appropriate role arrays in `ROLE_PERMISSIONS`
3. Apply `@Permissions(Permission.[RESOURCE]_[ACTION])` to the controller method
4. In the frontend, gate UI with `<Can permission={Permission.[RESOURCE]_[ACTION]}>`