export function LandingHowItWorks() {
  const steps = [
    {
      step: "01",
      title: "Install & scaffold",
      description:
        "Clone the repo, run `npm install`, and the starter kit is ready. PostgreSQL + Redis via Docker Compose.",
    },
    {
      step: "02",
      title: "Configure your tenant",
      description:
        "Set your org name, domain, and billing plan. All RBAC, migrations, and API routes are ready to go.",
    },
    {
      step: "03",
      title: "Ship with confidence",
      description:
        "Deploy with Docker or PM2. Every route is scoped, every response is wrapped, and your users are isolated by default.",
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-secondary/20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From zero to deployed in 20 minutes
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No boilerplate. No guesswork. Just a working SaaS app that you can customize.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={s.step} className="relative">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] right-0 h-px bg-border" />
              )}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
