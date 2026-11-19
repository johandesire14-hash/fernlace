import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, FileDown, LogOut, Package, RefreshCw, Truck, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { formatPrice } from "@/lib/commerce";
import "leaflet/dist/leaflet.css";

type ClientState =
  | { status: "loading" }
  | { status: "authenticated"; email: string }
  | { status: "error"; message: string };
type CustomerOrder = Pick<Tables<"orders">, "id" | "created_at" | "total" | "status" | "items" | "customer_name" | "phone" | "address" | "city" | "tracking_latitude" | "tracking_longitude" | "tracking_updated_at">;
type OrderItem = { name: string; price: number; quantity: number; size: string | null; color: string | null };
const trackingSteps = ["En attente", "Confirmée", "Expédiée", "Livrée"] as const;

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
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersError, setOrdersError] = useState(false);
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [refreshingOrderId, setRefreshingOrderId] = useState<string | null>(null);

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
      setCustomerId(data.user.id);

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, created_at, total, status, items, customer_name, phone, address, city, tracking_latitude, tracking_longitude, tracking_updated_at")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false });
      setOrdersError(Boolean(orderError));
      if (!orderError) setOrders((orderData ?? []) as CustomerOrder[]);

      const orderChannel = supabase
        .channel(`customer-orders-${data.user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${data.user.id}` },
          (payload) => {
            const updatedOrder = payload.new as CustomerOrder;
            setOrders((current) => current.map((order) => (
              order.id === updatedOrder.id
                ? { ...order, status: updatedOrder.status, total: updatedOrder.total, items: updatedOrder.items, tracking_latitude: updatedOrder.tracking_latitude, tracking_longitude: updatedOrder.tracking_longitude, tracking_updated_at: updatedOrder.tracking_updated_at }
                : order
            )));
          },
        )
        .subscribe();

      return orderChannel;
    }

    let orderChannel: ReturnType<typeof supabase.channel> | null = null;
    void loadClient().then((channel) => {
      orderChannel = channel ?? null;
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT" || !session?.user) {
        void navigate({ to: "/connexion" });
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      if (orderChannel) void supabase.removeChannel(orderChannel);
    };
  }, [navigate]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    await navigate({ to: "/connexion" });
  }

  async function refreshOrder(orderId: string) {
    if (!customerId) return;
    setRefreshingOrderId(orderId);
    const { data, error } = await supabase
      .from("orders")
      .select("id, created_at, total, status, items, customer_name, phone, address, city, tracking_latitude, tracking_longitude, tracking_updated_at")
      .eq("id", orderId)
      .eq("user_id", customerId)
      .maybeSingle();
    if (!error && data) {
      setOrders((current) => current.map((order) => (order.id === orderId ? data as CustomerOrder : order)));
    }
    setRefreshingOrderId(null);
  }

  async function downloadInvoice(order: CustomerOrder) {
    setDownloadingOrderId(order.id);

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const items = Array.isArray(order.items) ? (order.items as unknown as OrderItem[]) : [];
      const euro = (value: number) => formatPrice(value).replace(/\u202f/g, " ");
      let y = 22;

      doc.setTextColor(35, 35, 35);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("fern", margin, y);
      doc.setTextColor(92, 148, 91);
      doc.text("lace", margin + 24, y);
      doc.setTextColor(35, 35, 35);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Boutique de démonstration", margin, y + 7);

      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("FACTURE", pageWidth - margin, y, { align: "right" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`N° ${order.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, y + 7, { align: "right" });
      doc.text(new Date(order.created_at).toLocaleDateString("fr-FR"), pageWidth - margin, y + 13, { align: "right" });

      y += 32;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
      doc.setFont("helvetica", "bold");
      doc.text("Client", margin, y);
      doc.setFont("helvetica", "normal");
      y += 6;
      doc.text(doc.splitTextToSize(order.customer_name, 75), margin, y);
      y += 5;
      doc.text(doc.splitTextToSize(`${order.address}, ${order.city}`, 75), margin, y);
      y += 5;
      doc.text(order.phone, margin, y);
      doc.text(`Statut : ${order.status}`, pageWidth - margin, y, { align: "right" });

      y += 18;
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 5, pageWidth - margin * 2, 9, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Article", margin + 3, y);
      doc.text("Total", pageWidth - margin - 3, y, { align: "right" });
      y += 12;
      doc.setFont("helvetica", "normal");

      for (const item of items) {
        const details = [item.size && `Taille ${item.size}`, item.color].filter(Boolean).join(" · ");
        const lines = doc.splitTextToSize(`${item.quantity} × ${item.name}${details ? ` — ${details}` : ""}`, 125);
        doc.text(lines, margin + 3, y);
        doc.text(euro(item.price * item.quantity), pageWidth - margin - 3, y, { align: "right" });
        y += Math.max(7, lines.length * 5) + 3;
      }

      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 12;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Total", margin, y);
      doc.text(euro(Number(order.total)), pageWidth - margin, y, { align: "right" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("Aucun paiement réel n’est demandé pour cette boutique de démonstration.", margin, 280);
      doc.save(`facture-${order.id.slice(0, 8).toUpperCase()}.pdf`);
    } finally {
      setDownloadingOrderId(null);
    }
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
          <Link
            className="mt-5 inline-flex items-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
            to="/espace-client/profil"
          >
            Modifier mes informations
          </Link>
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

      <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Suivi</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-foreground">Historique de mes commandes</h2>
          </div>
          <p className="text-sm text-muted-foreground">{orders.length} commande{orders.length > 1 ? "s" : ""}</p>
        </div>

        {ordersError ? (
          <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            L’historique de vos commandes est momentanément indisponible.
          </p>
        ) : orders.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border px-5 py-8 text-center">
            <Package className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Vos commandes apparaîtront ici après votre prochain achat.</p>
            <Link className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline" to="/catalogue">
              Découvrir le catalogue
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => {
              const items = Array.isArray(order.items) ? (order.items as unknown as OrderItem[]) : [];
              return (
                <article className="rounded-2xl border border-border bg-background p-4 sm:p-5" key={order.id}>
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-mono text-sm font-bold">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Passée le {new Date(order.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:text-right">
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{order.status}</span>
                      <strong className="font-display text-xl">{formatPrice(Number(order.total))}</strong>
                    </div>
                  </div>
                  <div className="mt-5 rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Truck className="size-4 text-primary" />
                        <p className="text-sm font-semibold">Suivi de livraison en direct</p>
                      </div>
                      <button
                        aria-label="Actualiser le suivi de livraison"
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={refreshingOrderId === order.id}
                        onClick={() => void refreshOrder(order.id)}
                        type="button"
                      >
                        <RefreshCw className={`size-4 ${refreshingOrderId === order.id ? "animate-spin" : ""}`} />
                      </button>
                    </div>
                    {order.status === "Annulée" ? (
                      <p className="mt-4 rounded-xl bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">Cette commande a été annulée.</p>
                    ) : (
                      <div className="mt-5 grid grid-cols-4 gap-2">
                        {trackingSteps.map((step, index) => {
                          const currentIndex = trackingSteps.indexOf(order.status as (typeof trackingSteps)[number]);
                          const isComplete = currentIndex >= index;
                          return (
                            <div className="relative text-center" key={step}>
                              {index < trackingSteps.length - 1 ? <span className={`absolute left-1/2 top-3 h-0.5 w-full ${currentIndex > index ? "bg-primary" : "bg-border"}`} /> : null}
                              <span className={`relative z-10 mx-auto flex size-6 items-center justify-center rounded-full border-2 ${isComplete ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}>
                                {isComplete ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-current" />}
                              </span>
                              <span className={`mt-2 block text-[10px] leading-tight sm:text-xs ${isComplete ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-4 text-xs text-muted-foreground">Le statut se met à jour automatiquement lorsque votre commande avance.</p>
                  </div>
                  {order.tracking_latitude !== null && order.tracking_longitude !== null ? (
                    <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                      <div className="flex items-center justify-between gap-3 bg-card px-4 py-3">
                        <div>
                          <p className="flex items-center gap-2 text-sm font-semibold"><Truck className="size-4 text-primary" /> Position actuelle du colis</p>
                          {order.tracking_updated_at ? <p className="mt-1 text-xs text-muted-foreground">Mise à jour le {new Date(order.tracking_updated_at).toLocaleString("fr-FR")}</p> : null}
                        </div>
                        <span className="text-xs text-muted-foreground">OpenStreetMap</span>
                      </div>
                      <LivePackageMap latitude={order.tracking_latitude} longitude={order.tracking_longitude} />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-border bg-card px-4 py-4 text-sm text-muted-foreground">
                      La carte apparaîtra dès que le transporteur transmettra la position du colis.
                    </div>
                  )}
                  <div className="mt-4 divide-y divide-border border-t border-border">
                    {items.map((item, index) => (
                      <div className="flex justify-between gap-4 py-3 text-sm" key={`${item.name}-${index}`}>
                        <div>
                          <p className="font-semibold">{item.quantity} × {item.name}</p>
                          <p className="text-xs text-muted-foreground">{[item.size && `Taille ${item.size}`, item.color].filter(Boolean).join(" · ")}</p>
                        </div>
                        <p className="shrink-0 font-semibold">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end border-t border-border pt-4">
                    <button
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={downloadingOrderId === order.id}
                      onClick={() => void downloadInvoice(order)}
                      type="button"
                    >
                      <FileDown className="size-4" />
                      {downloadingOrderId === order.id ? "Génération…" : "Télécharger la facture PDF"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function LivePackageMap({ latitude, longitude }: { latitude: number; longitude: number }) {
  const mapElement = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let map: import("leaflet").Map | undefined;

    void import("leaflet").then((L) => {
      if (disposed || !mapElement.current) return;
      map = L.map(mapElement.current, { zoomControl: true }).setView([latitude, longitude], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      L.circleMarker([latitude, longitude], {
        color: "#4f8f52",
        fillColor: "#79bd7b",
        fillOpacity: 0.9,
        radius: 9,
        weight: 3,
      }).addTo(map);
    });

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [latitude, longitude]);

  return <div className="h-64 w-full bg-muted" ref={mapElement} />;
}
