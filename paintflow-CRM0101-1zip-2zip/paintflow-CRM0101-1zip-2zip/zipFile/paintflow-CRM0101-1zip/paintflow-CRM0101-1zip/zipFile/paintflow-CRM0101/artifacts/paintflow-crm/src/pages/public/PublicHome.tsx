import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle, MapPin, Phone, ShieldCheck, Truck, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useShopProfile } from "@/lib/shopProfile";
import {
  useStorefrontProducts,
  availability,
  AVAILABILITY_LABEL,
  AVAILABILITY_CLASS,
} from "@/lib/storefront";
import { openWhatsApp } from "@/lib/whatsapp";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const CATEGORIES = [
  { label: "Paints",   icon: "🎨", q: "Paints" },
  { label: "Sanitary", icon: "🚿", q: "Sanitary" },
  { label: "Plumbing", icon: "🔧", q: "Plumbing" },
  { label: "Hardware", icon: "🛠️", q: "Hardware" },
];

export default function PublicHome() {
  const { profile } = useShopProfile();
  const productsQ = useStorefrontProducts();
  const featured = (productsQ.data ?? []).slice(0, 6);

  const handleOrderInquiry = () => {
    const msg =
      `Namaste *${profile.shop_name}*,\n\n` +
      `I would like to enquire about your products. Please share details.\n\n` +
      `Thank you.`;
    openWhatsApp(profile.phone, msg);
  };

  return (
    <div className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-primary/5 to-background border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-16">
          <div className="grid sm:grid-cols-2 items-center gap-8">
            <div className="space-y-5">
              <span className="inline-block rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
                Salamatpur, Madhya Pradesh
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                {profile.shop_name}
                <span className="block text-primary text-xl sm:text-2xl font-bold mt-1">
                  {profile.tagline}
                </span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                Browse our catalog and place orders directly on WhatsApp — fast,
                friendly, and right from your phone.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" data-testid="hero-browse-products">
                  <Link to="/shop/catalog">
                    Browse Products
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-green-200 text-green-700 hover:bg-green-50"
                  onClick={handleOrderInquiry}
                  data-testid="hero-whatsapp-order"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Order on WhatsApp
                </Button>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {profile.address.split(",")[0]}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {profile.phone}
                </span>
              </div>
            </div>
            <div className="relative flex items-center justify-center">
              <div className="aspect-square w-full max-w-sm flex items-center justify-center rounded-3xl bg-white border border-border shadow-sm">
                <img
                  src={profile.logo_url}
                  alt={`${profile.shop_name} logo`}
                  className="h-3/4 w-3/4 object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────── */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, title: "Trusted brands",    sub: "Asian Paints, Berger, Jaquar & more" },
            { icon: Truck,       title: "Local delivery",     sub: "Salamatpur & nearby villages" },
            { icon: Hammer,      title: "Expert advice",      sub: "Walk in or WhatsApp our team" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        <h2 className="text-lg font-bold tracking-tight mb-4">Shop by category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map((c) => (
            <Link
              key={c.label}
              to={`/shop/catalog?category=${encodeURIComponent(c.q)}`}
              className="rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-colors p-4 text-center"
              data-testid={`home-category-${c.label.toLowerCase()}`}
            >
              <div className="text-3xl">{c.icon}</div>
              <p className="text-sm font-semibold mt-2">{c.label}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured products ────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 py-2 sm:py-8 pb-12">
        <div className="flex items-end justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold tracking-tight">Popular products</h2>
          <Link
            to="/shop/catalog"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all →
          </Link>
        </div>

        {productsQ.isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : productsQ.error ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Could not load products right now. Please reach us on WhatsApp at{" "}
              {profile.phone}.
            </CardContent>
          </Card>
        ) : featured.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Our online catalog is being updated. Please contact us on
              WhatsApp.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {featured.map((p) => {
              const avail = availability(p);
              return (
                <Link
                  key={p.id}
                  to={`/shop/products/${p.id}`}
                  className="group rounded-xl border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden flex flex-col"
                  data-testid={`home-product-${p.id}`}
                >
                  <div className="aspect-square bg-gradient-to-br from-muted/60 to-muted flex items-center justify-center text-3xl font-black text-muted-foreground/40">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="p-3 space-y-1 flex-1 flex flex-col">
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {p.brand ?? p.category}
                    </p>
                    <p className="text-sm font-semibold line-clamp-2 leading-tight">
                      {p.name}
                    </p>
                    <div className="flex items-center justify-between pt-2 mt-auto">
                      <span className="text-sm font-bold text-primary">
                        {INR.format(p.price)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${AVAILABILITY_CLASS[avail]}`}
                      >
                        {AVAILABILITY_LABEL[avail]}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
