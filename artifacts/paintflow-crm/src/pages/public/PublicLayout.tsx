import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X, MessageCircle, MapPin, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { useShopProfile } from "@/lib/shopProfile";

const NAV = [
  { to: "/shop",         label: "Home",     end: true  },
  { to: "/shop/catalog", label: "Products", end: false },
  { to: "/shop/contact", label: "Contact",  end: false },
];

export default function PublicLayout() {
  const { profile } = useShopProfile();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ── Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link to="/shop" className="flex items-center gap-3 min-w-0" data-testid="public-logo-home">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-border overflow-hidden shadow-sm">
                <img
                  src={profile.logo_url}
                  alt={`${profile.shop_name} logo`}
                  className="h-10 w-10 object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold tracking-tight truncate">
                  {profile.shop_name}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {profile.tagline}
                </p>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`
                  }
                  data-testid={`public-nav-${n.label.toLowerCase()}`}
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>

            {/* Mobile toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md border border-border"
              aria-label="Toggle navigation"
              data-testid="public-mobile-nav-toggle"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <div className="md:hidden pb-3 space-y-1">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`
                  }
                  data-testid={`public-mobile-nav-${n.label.toLowerCase()}`}
                >
                  {n.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ── Routed content ───────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-border overflow-hidden">
              <img
                src={profile.logo_url}
                alt={`${profile.shop_name} logo`}
                className="h-10 w-10 object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">
                {profile.shop_name}
              </p>
              <p className="text-xs text-muted-foreground">{profile.tagline}</p>
              <p className="text-[11px] text-muted-foreground mt-2">
                GSTIN: {profile.gstin}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Visit Us</p>
            <p className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{profile.address}</span>
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0" />
              <a
                href={`tel:${profile.phone.replace(/\s+/g, "")}`}
                className="hover:text-foreground"
              >
                {profile.phone}
              </a>
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-semibold">Order &amp; Inquiries</p>
            <p className="text-muted-foreground">
              Browse our catalog and tap{" "}
              <span className="inline-flex items-center gap-1 font-medium text-green-700">
                <MessageCircle className="h-3.5 w-3.5" /> Order on WhatsApp
              </span>{" "}
              to message us directly.
            </p>
          </div>
        </div>
        <div className="border-t border-border py-3">
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} {profile.shop_name}. Proprietor:{" "}
            {profile.owner_name}.
          </p>
        </div>
      </footer>
    </div>
  );
}
