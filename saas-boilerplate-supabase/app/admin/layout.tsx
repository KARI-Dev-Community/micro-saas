import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!user || !adminEmails.includes(user.email?.toLowerCase() ?? "")) {
    redirect("/dashboard");
  }

  return (
    <div>
      <header className="border-b border-gray-100">
        <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/admin" className="font-semibold text-lg">
            Admin
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600">
            Back to app
          </Link>
        </nav>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
    </div>
  );
}
