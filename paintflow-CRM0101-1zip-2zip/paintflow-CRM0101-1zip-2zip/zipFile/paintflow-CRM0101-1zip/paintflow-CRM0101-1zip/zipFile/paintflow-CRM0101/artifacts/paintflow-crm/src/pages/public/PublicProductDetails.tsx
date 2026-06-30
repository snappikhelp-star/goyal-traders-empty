import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useShopProfile } from "@/lib/shopProfile";
import {
  useStorefrontProduct,
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

export default function PublicProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useShopProfile();
  const productQ = useStorefrontProduct(id);

  if (productQ.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="aspect-square rounded-2xl bg-muted animate-pulse" />
          <div className="space-y-3">
            <div className="h-5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-8 w-72 bg-muted animate-pulse rounded" />
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (productQ.error || !productQ.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16">
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              This product is not available or has been removed.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/shop/catalog">Back to catalog</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const p = productQ.data;
  const avail = availability(p);

  const handleOrder = () => {
    const msg = [
      `Namaste *${profile.shop_name}*,`,
      ``,
      `I would like to order the following product:`,
      `• *${p.name}*${p.brand ? ` (${p.brand})` : ""}`,
      p.pack_size ? `  Pack: ${p.pack_size}` : "",
      p.shade_name ? `  Shade: ${p.shade_name}` : "",
      `  Price: ${INR.format(p.price)} / ${p.unit}`,
      ``,
      `Please confirm availability and delivery to my address.`,
      ``,
      `(Order placed via your website.)`,
    ]
      .filter(Boolean)
      .join("\n");
    openWhatsApp(profile.phone, msg);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2"
        onClick={() => navigate(-1)}
        data-testid="product-back-btn"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
      </Button>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* Image / placeholder */}
        <div className="rounded-2xl border border-border bg-gradient-to-br from-muted/40 to-muted aspect-square flex items-center justify-center">
          <span className="text-7xl font-black text-muted-foreground/30">
            {p.name.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {p.brand ?? p.category}
            </p>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight leading-tight"
              data-testid="product-name"
            >
              {p.name}
            </h1>
            {(p.pack_size || p.shade_name || p.finish) && (
              <p className="text-sm text-muted-foreground mt-1">
                {[p.pack_size, p.shade_name, p.finish].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-primary tabular-nums">
              {INR.format(p.price)}
            </span>
            <span className="text-xs text-muted-foreground">
              / {p.unit}
            </span>
            <span
              className={`text-xs font-semibold rounded-full px-3 py-1 border ${AVAILABILITY_CLASS[avail]}`}
              data-testid="product-availability"
            >
              {AVAILABILITY_LABEL[avail]}
            </span>
          </div>

          {p.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {p.description}
            </p>
          )}

          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm space-y-1">
            {p.shade_number && (
              <p>
                <span className="text-muted-foreground">Shade Code: </span>
                <span className="font-medium">{p.shade_number}</span>
              </p>
            )}
            {p.sku && (
              <p>
                <span className="text-muted-foreground">SKU: </span>
                <span className="font-medium">{p.sku}</span>
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Category: </span>
              <span className="font-medium">{p.category}</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <Button
              size="lg"
              className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleOrder}
              data-testid="product-order-whatsapp-btn"
            >
              <MessageCircle className="h-4 w-4" />
              Order on WhatsApp
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1 gap-2"
              asChild
            >
              <a href={`tel:${profile.phone.replace(/\s+/g, "")}`}>
                <Phone className="h-4 w-4" />
                Call {profile.phone}
              </a>
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Final price including taxes and delivery confirmed by the shop on
            WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
