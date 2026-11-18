import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — Fernlace" },
      {
        name: "description",
        content: "Connectez-vous à votre espace client Fernlace.",
      },
      { property: "og:title", content: "Connexion — Fernlace" },
      {
        property: "og:description",
        content: "Accédez à votre espace client Fernlace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(
        error.message.includes("Invalid login credentials")
          ? "Adresse email ou mot de passe incorrect."
          : "Impossible de vous connecter pour le moment. Réessayez dans un instant.",
      );
      return;
    }

    await navigate({ to: "/espace-client" });
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-6xl items-center justify-center px-4 py-16">
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Espace client
          </p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            Ravi de vous revoir.
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Retrouvez vos commandes et profitez d’une expérience Fernlace plus fluide.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground" htmlFor="email">
              Adresse email
            </label>
            <input
              autoComplete="email"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@exemple.fr"
              required
              type="email"
              value={email}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-semibold text-foreground" htmlFor="password">
                Mot de passe
              </label>
              <button
                className="text-xs font-semibold text-primary hover:underline"
                onClick={() => setErrorMessage("La récupération du mot de passe sera bientôt disponible.")}
                type="button"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <input
              autoComplete="current-password"
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          {errorMessage ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <button
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link className="font-semibold text-primary hover:underline" to="/contact">
            Contactez-nous
          </Link>
        </p>
      </section>
    </main>
  );
}
