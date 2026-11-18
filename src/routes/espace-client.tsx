import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, Package, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ClientState =
  | { status: "loading" }
  | { status: "authenticated"; email: string }
  | { status: "error"; message: string };

export const Route = createFileRoute("/espace-client")({
  head: () => ({
    meta: [
      { title: "Espace client — Fernlace" },
      {
        name: "description",
        content: "Gérez votre compte et retrouvez vos commandes Fernlace.",
      },
      { property: "og:title", content: "Espace client — Fernlace" },
      {
        property: "og:description",
        content: "Votre espace personnel Fernlace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ClientAreaPage,
});

function ClientAreaPage() {
  const navigate = useNavigate();
  const [clientState, setClientState] = useState<ClientState>({ status: "loading" });
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadClient() {
      const { data, error } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !data.user) {
        await navigate({ to: "/connexion" });
        return;
      }

      setClientState({
        status: "authenticated",
        email: data.user.email ?? "Client Fernlace",
      });
    }

    void loadClient();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        void navigate({ to: "/connexion" });
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    await navigate({ to: "/connexion" });
  }

  if (clientState.status === "loading") {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-6xl items-center justify-center px-4 py-16">
        <div className="rounded-3xl border border-border bg-card px-6 py-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Vérification de votre session…</p>
        </div>
      </main>
    );
  }

  if (clientState.status === "error") {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-6xl items-center justify-center px-4 py-16">
        <div className="rounded-3xl border border-destructive/30 bg-destructive/10 px-6 py-8 text-center">
          <p className="text-sm text-destructive">{clientState.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-[calc(100vh-9rem)] max-w-6xl px-4 py-12 sm:py-16">
      <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Espace client</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground">
            Bonjour, bienvenue chez Fernlace.
          </h1>
          <p className="mt-3 text-muted-foreground">Connecté avec {clientState.email}</p>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSigningOut}
          onClick={() => void handleSignOut()}
          type="button"
        >
          <LogOut className="size-4" />
          {isSigningOut ? "Déconnexion…" : "Se déconnecter"}
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="size-5" />
          </div>
          <h2 className="mt-5 font-display text-xl font-bold text-foreground">Mon profil</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Votre compte est prêt. Nous utiliserons cette adresse pour vous tenir informé de vos commandes.
          </p>
          <p className="mt-4 rounded-xl bg-muted px-4 py-3 text-sm font-medium text-foreground">{clientState.email}</p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Package className="size-5" />
          </div>
          <h2 className="mt-5 font-display text-xl font-bold text-foreground">Mes commandes</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Retrouvez vos achats et préparez votre prochaine paire depuis notre catalogue.
          </p>
          <Link
            className="mt-5 inline-flex items-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            to="/catalogue"
          >
            Découvrir le catalogue
          </Link>
        </section>
      </div>
    </main>
  );
}
