import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <header className="border-b border-gray-100">
        <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="font-semibold text-lg">
            Boilerplate
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">{user.email}</span>
            <SignOutButton />
          </div>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
