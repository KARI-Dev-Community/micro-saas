"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api-client";
import { Can } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Permission } from "@shared/enums";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/projects", label: "Projects", perm: Permission.PROJECT_READ },
  { href: "/dashboard/billing", label: "Billing", perm: Permission.ORG_BILLING_READ },
  { href: "/dashboard/ai", label: "AI Assistant", perm: Permission.AI_CHAT },
  { href: "/dashboard/admin", label: "Admin", perm: Permission.PLATFORM_READ },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { tokens, user, organizations, activeOrgId, setOrganizations, setActiveOrg, logout } = useAuthStore();

  useEffect(() => {
    if (!tokens) router.push("/login");
  }, [tokens, router]);

  useEffect(() => {
    if (tokens && organizations.length === 0) {
      api.get<{ id: string; name: string; slug: string }[]>("/api/organizations/mine")
        .then((orgs) => {
          setOrganizations(orgs);
          if (orgs.length && !activeOrgId) setActiveOrg(orgs[0].id);
        })
        .catch(() => {});
    }
  }, [tokens, organizations.length, activeOrgId, setOrganizations, setActiveOrg]);

  const org = organizations.find((o) => o.id === activeOrgId);

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r bg-card p-4 hidden md:block">
        <div className="font-semibold mb-6 px-2">SaaS Kit</div>
        <nav className="space-y-1">
          {NAV.map((item) =>
            item.perm ? (
              <Can key={item.href} permission={item.perm}>
                <Link href={item.href} className="block rounded-md px-3 py-2 text-sm hover:bg-accent">
                  {item.label}
                </Link>
              </Can>
            ) : (
              <Link key={item.href} href={item.href} className="block rounded-md px-3 py-2 text-sm hover:bg-accent">
                {item.label}
              </Link>
            )
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center justify-between px-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">{org ? org.name : "Select org"}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Organizations</DropdownMenuLabel>
              {organizations.map((o) => (
                <DropdownMenuItem key={o.id} onClick={() => setActiveOrg(o.id)}>
                  {o.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => { logout(); router.push("/login"); }}>
              Sign out
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
