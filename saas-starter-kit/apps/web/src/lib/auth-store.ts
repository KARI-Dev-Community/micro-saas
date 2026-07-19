import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getTokens, clearTokens, storeTokens, Tokens } from "./api-client";
import { Permission } from "@shared/enums";

// Global auth + tenant state. Persisted to localStorage so refreshes keep
// the session. `permissions` is the RBAC set resolved for the active org.
interface AuthState {
  tokens: Tokens | null;
  user: { id: string; email: string } | null;
  permissions: string[];
  activeOrgId: string | null;
  organizations: { id: string; name: string; slug: string }[];
  setSession: (tokens: Tokens, user: { id: string; email: string }, permissions: string[]) => void;
  setActiveOrg: (orgId: string) => void;
  setOrganizations: (orgs: { id: string; name: string; slug: string }[]) => void;
  setPermissions: (perms: string[]) => void;
  logout: () => void;
  hasPermission: (perm: Permission | string) => boolean;
  hasAny: (perms: (Permission | string)[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      tokens: getTokens(),
      user: null,
      permissions: [],
      activeOrgId: null,
      organizations: [],
      setSession: (tokens, user, permissions) => {
        storeTokens(tokens);
        set({ tokens, user, permissions });
      },
      setActiveOrg: (orgId) => set({ activeOrgId: orgId }),
      setOrganizations: (organizations) => set({ organizations }),
      setPermissions: (permissions) => set({ permissions }),
      logout: () => {
        clearTokens();
        set({ tokens: null, user: null, permissions: [], activeOrgId: null });
      },
      hasPermission: (perm) => get().permissions.includes(perm),
      hasAny: (perms) => perms.some((p) => get().permissions.includes(p)),
    }),
    { name: "saas-auth" }
  )
);
