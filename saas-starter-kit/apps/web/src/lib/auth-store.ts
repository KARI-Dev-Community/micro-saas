import { create } from "zustand";
import { Permission } from "@shared/enums";

interface AuthState {
  tokens: Tokens | null;
  user: { id: string; email: string } | null;
  permissions: string[];
  activeOrgId: string | null;
  organizations: { id: string; name: string; slug: string }[];
  setSession: (tokens: Tokens, user: { id: string; email: string }, permissions: string[]) => void;
  setActiveOrg: (orgId: string) => void;
  setOrganizations: (organizations: { id: string; name: string; slug: string }[]) => void;
  setPermissions: (perms: string[]) => void;
  logout: () => void;
  hasPermission: (perm: Permission | string) => boolean;
  hasAny: (perms: (Permission | string)[]) => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  tokens: null,
  user: null,
  permissions: [],
  activeOrgId: null,
  organizations: [],
  setSession: (_tokens, user, permissions) => {
    set({ tokens: _tokens, user, permissions, activeOrgId: null, organizations: [] });
  },
  setActiveOrg: (orgId) => set({ activeOrgId: orgId }),
  setOrganizations: (organizations) => set({ organizations }),
  setPermissions: (permissions) => set({ permissions }),
  logout: () => {
    set({ tokens: null, user: null, permissions: [], activeOrgId: null, organizations: [] });
  },
  hasPermission: (perm) => get().permissions.includes(perm),
  hasAny: (perms) => perms.some((p) => get().permissions.includes(p)),
}));

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
