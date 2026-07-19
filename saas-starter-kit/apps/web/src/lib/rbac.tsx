import { useAuthStore } from "./auth-store";
import { Permission } from "@shared/enums";

// <Can permission="project.create"> ... </Can> — UI authorization component.
// Renders children only when the active org context grants the permission.
export function Can({
  permission,
  any,
  children,
  fallback = null,
}: {
  permission?: Permission | string;
  any?: (Permission | string)[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const perms = useAuthStore((s) => s.permissions);
  const granted = permission
    ? perms.includes(permission)
    : any
    ? any.some((p) => perms.includes(p))
    : true;
  return <>{granted ? children : fallback}</>;
}

export function hasPermission(perm: Permission | string): boolean {
  return useAuthStore.getState().permissions.includes(perm);
}
