import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, Tags, Package, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/use-admin";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [
    { title: "Espace créateur — Fernlace" }, { name: "description", content: "Gérez les produits, catégories et commandes de votre boutique Fernlace." },
    { property: "og:title", content: "Espace créateur — Fernlace" }, { property: "og:description", content: "Le back-office de votre boutique." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: AdminLayout,
});

const input = "w-full rounded-xl border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary";

function AdminLayout() {
  const { user, isAdmin, loading } = useAdmin();
  if (loading) return <main className="mx-auto max-w-5xl px-4 py-20 text-center text-muted-foreground">Chargement…</main>;
  if (!user) return <AuthForm />;
  if (!isAdmin) return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Accès réservé</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ce compte n’est pas le compte créateur de la boutique.</p>
      <button onClick={() => supabase.auth.signOut()} className="mt-6 text-primary">Se déconnecter</button>
    </main>
  );

  const navigation = [
    { to: "/admin" as const, label: "Tableau de bord", icon: BarChart3, exact: true },
    { to: "/admin/produits" as const, label: "Produits", icon: Package, exact: false },
    { to: "/admin/categories" as const, label: "Catégories", icon: Tags, exact: false },
    { to: "/admin/commandes" as const, label: "Commandes", icon: ShoppingCart, exact: false },
  ];
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:py-10">
      <aside className="shrink-0 md:w-56">
        <div className="mb-4 hidden md:block"><p className="text-xs uppercase tracking-widest text-muted-foreground">Espace créateur</p><p className="mt-1 truncate text-sm font-semibold">{user.email}</p></div>
        <nav className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Back-office">
          {navigation.map(({ to, label, icon: Icon, exact }) => (
            <Link key={to} to={to} activeOptions={{ exact }} activeProps={{ className: "border-primary bg-primary text-primary-foreground" }} className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
              <Icon className="size-4" />{label}
            </Link>
          ))}
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="mt-4 hidden text-sm text-muted-foreground hover:text-foreground md:block">Déconnexion</button>
      </aside>
      <div className="min-w-0 flex-1"><Outlet /></div>
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
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      if (error) setMsg(error.message);
      else if (!data.session) setMsg("Compte créé ! Confirmez votre email via le lien reçu, puis connectez-vous.");
    }
    setBusy(false);
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Back-office</p>
      <h1 className="mt-2 text-3xl font-bold">Espace créateur</h1>
      <p className="mt-2 text-sm text-muted-foreground">{mode === "in" ? "Connectez-vous pour gérer votre boutique." : "Le premier compte créé devient le compte créateur."}</p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input className={input} type="email" required maxLength={255} placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={input} type="password" required minLength={6} maxLength={128} placeholder="Mot de passe" autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={busy} className="rounded-xl bg-primary py-3 font-display font-bold text-primary-foreground disabled:opacity-50">{mode === "in" ? "Se connecter" : "Créer mon compte"}</button>
      </form>
      {msg && <p className="mt-4 text-sm text-muted-foreground">{msg}</p>}
      <button onClick={() => setMode(mode === "in" ? "up" : "in")} className="mt-6 text-sm text-primary">{mode === "in" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}</button>
    </main>
  );
}
