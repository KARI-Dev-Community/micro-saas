export function LandingSocialProof() {
  return (
    <section className="border-y border-border bg-secondary/30 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-sm font-medium text-muted-foreground mb-8">
          Trusted by teams building modern SaaS
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {[
            { name: "Acme Corp", logo: "ACME" },
            { name: "Flowbase", logo: "FLOW" },
            { name: "Nexus IO", logo: "NX" },
            { name: "Stackward", logo: "STK" },
            { name: "Orbit Labs", logo: "ORB" },
            { name: "Vertex SaaS", logo: "VTX" },
          ].map((company) => (
            <div
              key={company.name}
              className="flex items-center gap-2 text-lg font-semibold text-muted-foreground opacity-60"
            >
              <span className="w-8 h-8 rounded bg-card border border-border flex items-center justify-center text-xs text-foreground">
                {company.logo}
              </span>
              {company.name}
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-8 text-center">
          <div>
            <p className="text-3xl font-bold">1,200+</p>
            <p className="text-sm text-muted-foreground">Developers building</p>
          </div>
          <div className="w-px h-10 bg-border hidden sm:block" />
          <div>
            <p className="text-3xl font-bold">4.9</p>
            <p className="text-sm text-muted-foreground">Average rating</p>
          </div>
          <div className="w-px h-10 bg-border hidden sm:block" />
          <div>
            <p className="text-3xl font-bold">50K+</p>
            <p className="text-sm text-muted-foreground">Active organizations</p>
          </div>
        </div>
      </div>
    </section>
  );
}
