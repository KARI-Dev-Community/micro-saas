import Link from "next/link";

export function Navbar() {
  return (
    <header className="border-b border-gray-100">
      <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold text-lg">
          Boilerplate
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/#pricing" className="text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
          <Link href="/login" className="text-gray-600 hover:text-gray-900">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
