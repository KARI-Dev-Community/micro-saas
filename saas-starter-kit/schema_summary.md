# SaaS Starter Kit Schema Overview

- Multi‑tenant via `organizationId` on all tenant‑scoped tables.
- Core tables: users, user_profiles, sessions, passkeys, organizations, workspaces, teams, memberships.
- RBAC: `roles` + `permissions` + junction `role_permissions`; memberships link users to organizations/teams with a role.
- Example permission grant for a member to access projects:

```sql
INSERT INTO permissions (key,label) VALUES ('projects.read','Read Projects') ON CONFLICT (key) DO NOTHING;
INSERT INTO role_permissions (roleId,permissionId)
  SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key='projects.read' WHERE r.name='member';
UPDATE memberships SET role='member' WHERE userId='<user>' AND organizationId='<org>';
```