import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Save, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/espace-client/profil")({
  head: () => ({
    meta: [
      { title: "Mon profil — Fernlace" },
      {
        name: "description",
        content: "Modifiez vos informations personnelles dans votre espace client Fernlace.",
      },
      { property: "og:title", content: "Mon profil — Fernlace" },
      {
        property: "og:description",
        content: "Gérez vos informations personnelles Fernlace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "saving">("loading");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !data.user) {
        await navigate({ to: "/connexion" });
        return;
      }

      const metadata = data.user.user_metadata ?? {};
      setEmail(data.user.email ?? "");
      setFullName(typeof metadata.full_name === "string" ? metadata.full_name : "");
      setPhone(typeof metadata.phone === "string" ? metadata.phone : "");
      setCity(typeof metadata.city === "string" ? metadata.city : "");
      setStatus("ready");
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setFeedback(null);

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
      },
    });

    if (error) {
      setFeedback({
        type: "error",
        message: "Vos informations n’ont pas pu être enregistrées. Réessayez dans un instant.",
      });
      setStatus("ready");
      return;
    }

    setFeedback({ type: "success", message: "Vos informations ont bien été enregistrées." });
    setStatus("ready");
  }

  if (status === "loading") {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-6xl items-center justify-center px-4 py-16">
        <div className="rounded-3xl border border-border bg-card px-6 py-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Chargement de votre profil…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-9rem)] max-w-6xl px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
          to="/espace-client"
        >
          <ArrowLeft className="size-4" /> Retour à l’espace client
        </Link>

        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Mon profil</p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">
                Vos informations personnelles
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Gardez vos coordonnées à jour pour faciliter le suivi de vos commandes.
              </p>
            </div>
          </div>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="profile-email">
                Adresse email
              </label>
              <input
                className="w-full rounded-xl border border-input bg-muted px-4 py-3 text-sm text-muted-foreground outline-none"
                id="profile-email"
                readOnly
                type="email"
                value={email}
              />
              <p className="text-xs text-muted-foreground">L’adresse email est liée à votre compte de connexion.</p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="full-name">
                  Nom complet
                </label>
                <input
                  autoComplete="name"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="full-name"
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Camille Martin"
                  type="text"
                  value={fullName}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground" htmlFor="phone">
                  Téléphone
                </label>
                <input
                  autoComplete="tel"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="phone"
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="06 12 34 56 78"
                  type="tel"
                  value={phone}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="city">
                Ville
              </label>
              <input
                autoComplete="address-level2"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                id="city"
                onChange={(event) => setCity(event.target.value)}
                placeholder="Paris"
                type="text"
                value={city}
              />
            </div>

            {feedback ? (
              <p
                className={`rounded-xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-primary/30 bg-primary/10 text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}
                role="status"
              >
                {feedback.message}
              </p>
            ) : null}

            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={status === "saving"}
              type="submit"
            >
              <Save className="size-4" />
              {status === "saving" ? "Enregistrement…" : "Enregistrer mes informations"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
