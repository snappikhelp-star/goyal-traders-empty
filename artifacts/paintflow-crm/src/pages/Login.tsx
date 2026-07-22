import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useShopProfile } from "@/lib/shopProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const { login } = useAuth();
  const { profile } = useShopProfile();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await login(email, password);
    if (err) setError(err);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left panel — branding */}
      <div className="hidden md:flex flex-col justify-between bg-sidebar p-10 text-sidebar-foreground">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm overflow-hidden">
            <img
              src={profile.logo_url}
              alt={`${profile.shop_name} logo`}
              className="h-12 w-12 object-contain"
            />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight">{profile.shop_name}</p>
            <p className="text-xs text-sidebar-foreground/50">{profile.tagline}</p>
          </div>
        </div>

        <div className="space-y-6">
          <blockquote className="space-y-2">
            <p className="text-2xl font-medium leading-relaxed text-sidebar-foreground">
              "Manage your customers, inventory, and billing — all in one place."
            </p>
            <footer className="text-sm text-sidebar-foreground/60">
              Proprietor: {profile.owner_name} · {profile.address}
            </footer>
          </blockquote>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { label: "Customers", value: "CRM" },
              { label: "Inventory", value: "Live" },
              { label: "Billing", value: "Fast" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-sidebar-accent p-3">
                <p className="text-lg font-bold text-sidebar-primary">{item.value}</p>
                <p className="text-xs text-sidebar-foreground/60">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} {profile.shop_name}. GSTIN: {profile.gstin}
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white border border-border overflow-hidden">
              <img
                src={profile.logo_url}
                alt={`${profile.shop_name} logo`}
                className="h-10 w-10 object-contain"
              />
            </div>
            <p className="text-lg font-bold tracking-tight">{profile.shop_name}</p>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
