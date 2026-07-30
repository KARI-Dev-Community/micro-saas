import { LandingNav } from "@/components/landing/nav";
import { LandingHero } from "@/components/landing/hero";
import { LandingSocialProof } from "@/components/landing/social-proof";
import { LandingFeatures } from "@/components/landing/features";
import { LandingHowItWorks } from "@/components/landing/how-it-works";
import { LandingPricing } from "@/components/landing/pricing";
import { LandingTestimonials } from "@/components/landing/testimonials";
import { LandingFaq } from "@/components/landing/faq";
import { LandingCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SaaS Starter Kit — Build multi-tenant SaaS in days",
  description:
    "Production-ready multi-tenant SaaS boilerplate with NestJS + Next.js. Auth, RBAC, billing, AI, and project management — scoped to every organization out of the box.",
};

export default function Home() {
  return (
    <main className="flex flex-col">
      <LandingNav />
      <LandingHero />
      <LandingSocialProof />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingPricing />
      <LandingTestimonials />
      <LandingFaq />
      <LandingCta />
      <LandingFooter />
    </main>
  );
}
