import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/connexion")({
  head: () => ({ meta: [
    { title: "Connexion client — Fernlace" },
    { name: "description", content: "Connectez-vous ou créez votre compte client Fernlace pour suivre vos commandes." },
    { property: "og:title", content: "Connexion client — Fernlace" },
    { property: "og:description", content: "Accédez à votre compte client Fernlace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ConnexionPage,
});

const input = "w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary";

function ConnexionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { setUser(data.user); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <main className="mx-auto max-w-sm px-4 py-20 text-center text-muted-foreground">Chargement…</main>;
  if (user) return <SignedIn user={user} />;
  return <AuthForm />;
}

function SignedIn({ user }: { user: User }) {
  return (
    <main className="mx-auto max-w-sm px-4 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Mon compte</p>
      <h1 className="mt-2 text-3xl font-bold">Bonjour !</h1>
      <p className="mt-2 truncate text-sm text-muted-foreground">{user.email}</p>
      <div className="mt-8 flex flex-col gap-3">
        <Link to="/catalogue" className="rounded-xl bg-primary py-3 font-display font-bold text-primary-foreground">Continuer mes achats</Link>
        <button onClick={() => supabase.auth.signOut()} className="rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
          Se déconnecter
        </button>
      </div>
    </main>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("Email ou mot de passe incorrect.");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/connexion` } });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Compte créé ! Confirmez votre email via le lien reçu, puis connectez-vous.");
    }
    setBusy(false);
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Espace client</p>
      <h1 className="mt-2 text-3xl font-bold">{mode === "in" ? "Connexion" : "Créer un compte"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mode === "in" ? "Connectez-vous pour retrouver votre compte Fernlace." : "Créez votre compte client en quelques secondes."}
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input className={input} type="email" required maxLength={255} placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" required minLength={6} maxLength={128} placeholder="Mot de passe" autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={busy} className="rounded-xl bg-primary py-3 font-display font-bold text-primary-foreground disabled:opacity-50">
          {mode === "in" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>
      {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
      <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="mt-6 text-sm text-primary">
        {mode === "in" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
      </button>
    </main>
  );
}
