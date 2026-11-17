import type { ReactNode } from "react";

export function InfoPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 md:py-20">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-bold md:text-5xl">{title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{intro}</p>
      <div className="mt-10 space-y-8">{children}</div>
    </main>
  );
}

export function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
