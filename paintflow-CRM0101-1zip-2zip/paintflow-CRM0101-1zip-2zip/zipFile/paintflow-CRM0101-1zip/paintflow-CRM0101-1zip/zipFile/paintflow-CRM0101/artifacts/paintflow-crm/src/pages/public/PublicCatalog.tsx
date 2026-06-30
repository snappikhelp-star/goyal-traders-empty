import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, MessageCircle, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useShopProfile } from "@/lib/shopProfile";
import {
  useStorefrontProducts,
  availability,
  AVAILABILITY_LABEL,
  AVAILABILITY_CLASS,
  type PublicProduct,
} from "@/lib/storefront";
import { buildInvoiceMessage, openWhatsApp } from "@/lib/whatsapp";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function orderProductMessage(
  p: PublicProduct,
  shopName: string,
  shopPhone: string,
): string {
  void buildInvoiceMessage; // reserved for future bill share
  return [
    `Namaste *${shopName}*,`,
    ``,
    `I would like to order:`,
    `• *${p.name}*${p.brand ? ` (${p.brand})` : ""}`,
    p.pack_size ? `  Pack: ${p.pack_size}` : "",
    `  Price: ${INR.format(p.price)} / ${p.unit}`,
    ``,
    `Please confirm availability and delivery.`,
    ``,
    `(Order placed via your website. ${shopPhone})`,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function PublicCatalog() {
  const { profile } = useShopProfile();
  const productsQ = useStorefrontProducts();
  const [params, setParams] = useSearchParams();
  const initialCategory = params.get("category") ?? "all";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(initialCategory);

  const products = productsQ.data ?? [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return ["all", ...Array.from(set).sort()];
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        (p.shade_name ?? "").toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, search, category]);

  const applyCategory = (next: string) => {
    setCategory(next);
    if (next === "all") {
      params.delete("category");
    } else {
      params.set("category", next);
    }
    setParams(params, { replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Product Catalog
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse our range — tap any product to order on WhatsApp.
        </p>
      </div>

      {/* Filter bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand or shade…"
            className="pl-9"
            data-testid="catalog-search-input"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => applyCategory(c)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                category === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              }`}
              data-testid={`catalog-filter-${c}`}
            >
              {c === "all" ? "All" : c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {productsQ.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : productsQ.error ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Could not load products. Please reach us on WhatsApp at{" "}
            {profile.phone}.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              No products match your search.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                applyCategory("all");
              }}
            >
              Clear filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => {
            const avail = availability(p);
            const handleOrder = (e: React.MouseEvent) => {
              e.preventDefault();
              const msg = orderProductMessage(
                p,
                profile.shop_name,
                profile.phone,
              );
              openWhatsApp(profile.phone, msg);
            };
            return (
              <Link
                key={p.id}
                to={`/shop/products/${p.id}`}
                className="group rounded-xl border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden flex flex-col"
                data-testid={`catalog-product-${p.id}`}
              >
                <div className="aspect-square bg-gradient-to-br from-muted/60 to-muted flex items-center justify-center text-4xl font-black text-muted-foreground/40">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="p-3 space-y-1 flex-1 flex flex-col">
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {p.brand ?? p.category}
                  </p>
                  <p className="text-sm font-semibold line-clamp-2 leading-tight">
                    {p.name}
                  </p>
                  {(p.pack_size || p.shade_name) && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {[p.pack_size, p.shade_name].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1.5">
                    <span className="text-sm font-bold text-primary">
                      {INR.format(p.price)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border ${AVAILABILITY_CLASS[avail]}`}
                    >
                      {AVAILABILITY_LABEL[avail]}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full mt-2 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleOrder}
                    data-testid={`catalog-order-${p.id}`}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Order on WhatsApp
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
