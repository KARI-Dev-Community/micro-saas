import Link from "next/link";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <main>
      <Navbar />

      <section className="max-w-3xl mx-auto text-center px-6 py-24">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Ship your SaaS this weekend
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Auth, billing, and a dashboard — already wired up. Replace this
          copy with your product's actual pitch.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/signup"
            className="bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-dark transition-colors"
          >
            Start free
          </Link>
          <Link
            href="/#pricing"
            className="border border-gray-200 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            See pricing
          </Link>
        </div>
      </section>

      <section id="pricing" className="max-w-3xl mx-auto px-6 py-16">
        <div className="border border-gray-200 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-semibold">Pro plan</h2>
          <p className="mt-2 text-gray-600">
            Everything you need, one simple price.
          </p>
          <p className="mt-6 text-4xl font-bold">
            $29<span className="text-base font-normal text-gray-500">/mo</span>
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-block bg-brand text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-dark transition-colors"
          >
            Get started
          </Link>
        </div>
      </section>
    </main>
  );
}
