import { Card, CardContent } from "@/components/ui/card";

export function LandingTestimonials() {
  return (
    <section className="py-20 sm:py-28 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for teams that ship
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              name: "[PLACEHOLDER: Customer name]",
              role: "[PLACEHOLDER: Role, e.g. CTO at Flowbase]",
              quote:
                "[PLACEHOLDER: Replace with a real testimonial. Focus on the speed-to-ship and multi-tenant isolation benefits.]",
            },
            {
              name: "[PLACEHOLDER: Customer name]",
              role: "[PLACEHOLDER: Role]",
              quote:
                "[PLACEHOLDER: Replace with a real testimonial. Highlight a specific outcome — how long it took to launch, what they built on top of the kit.]",
            },
            {
              name: "[PLACEHOLDER: Customer name]",
              role: "[PLACEHOLDER: Role]",
              quote:
                "[PLACEHOLDER: Replace with a real testimonial. Mention billing, AI integration, or onboarding experience if available.]",
            },
          ].map((t, i) => (
            <Card key={i} className="flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex items-center gap-1 text-yellow-500 mb-4" aria-label="5 stars">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <StarIcon key={j} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed flex-1 italic text-muted-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}