# Permission Model

- **Tenant isolation**: All tenant‑scoped tables have an `organizationId` column. Queries must filter by the `x_organization_id` header (or equivalent).
- **Roles & Permissions**: 
  - `roles` stores system and custom roles.
  - `permissions` stores individual actions (e.g., `projects.read`, `files.write`).
  - `role_permissions` junction table maps roles → permissions.
- **User‑Role mapping**: `memberships` links a user to an organization (and optionally a workspace/team) with a `role` field (e.g., `member`, `admin`). The role in memberships determines the effective role(s) for permission checks.
- **Granting a permission**:
  1. Insert the permission row into `permissions` (if not exists).
  2. Insert a row into `role_permissions` linking the appropriate `roleId` to the `permissionId`.
  3. Ensure the user has a membership with a role that includes the permission (directly via role or via a higher‑privilege role).

- **Example: Give a member read access to projects**
  ```sql
  INSERT INTO permissions (key, label) VALUES ('projects.read', 'Read Projects')
  ON CONFLICT (key) DO NOTHING;

  INSERT INTO role_permissions (roleId, permissionId)
  SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.key = 'projects.read'
  WHERE r.name = 'member';
  ```

- **Example: Check if a user can perform an action**
  ```sql
  SELECT 1
  FROM memberships m
  JOIN roles r ON m.role = r.name
  JOIN role_permissions rp ON r.id = rp.roleId
  JOIN permissions p ON rp.permissionId = p.id
  WHERE m.userId = '<user-id>'
    AND m.organizationId = '<org-id>'
    AND p.key = 'projects.read';
  ```

- **Example: List all modules a user can access**
  ```sql
  SELECT DISTINCT p.key AS module
  FROM memberships m
  JOIN roles r ON m.role = r.name
  JOIN role_permissions rp ON r.id = rp.roleId
  JOIN permissions p ON rp.permissionId = p.id
  WHERE m.userId = '<user-id>'
    AND m.organizationId = '<org-id>'
  ORDER BY p.key;
  ```

- **Tenant‑aware query example (projects)**
  ```sql
  SELECT *
  FROM projects
  WHERE organizationId = '<org-id>';
  ```

- **Notes**:
  - All tenant‑scoped queries must include `organizationId` in the WHERE clause or rely on the request header `x_organization_id` that the application layers onto the query.
  - Permissions are additive; a user can have multiple roles, and the effective permission set is the union of all role permissions.