import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "SaaS Boilerplate",
    template: "%s | SaaS Boilerplate",
  },
  description: "Next.js + MySQL + Stripe starter",
  openGraph: {
    title: "SaaS Boilerplate",
    description: "Next.js + MySQL + Stripe starter",
    url: siteUrl,
    siteName: "SaaS Boilerplate",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SaaS Boilerplate",
    description: "Next.js + MySQL + Stripe starter",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased text-gray-900 bg-white">{children}</body>
    </html>
  );
}
