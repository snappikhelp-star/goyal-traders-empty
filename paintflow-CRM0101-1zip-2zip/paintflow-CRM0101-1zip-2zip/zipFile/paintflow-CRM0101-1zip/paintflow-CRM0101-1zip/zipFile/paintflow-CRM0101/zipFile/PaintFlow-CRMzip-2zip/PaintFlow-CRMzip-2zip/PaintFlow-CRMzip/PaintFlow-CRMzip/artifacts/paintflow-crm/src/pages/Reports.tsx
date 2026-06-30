import { useQuery } from "@tanstack/react-query";
import { BarChart3, TrendingUp, Users, DollarSign, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";

function ReportCard({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription className="text-xs">{description}</CardDescription>
          )}
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function Reports() {
  const { data: revenueSummary, isLoading: loadingRevenue } = useQuery({
    queryKey: ["reports", "revenue-by-month"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bills")
        .select("date, total, status")
        .eq("status", "paid")
        .order("date", { ascending: false });
      return (data ?? []) as { date: string; total: number; status: string }[];
    },
  });

  const { data: topCustomers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["reports", "top-customers"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bills")
        .select("customer_id, total, customer:customers(name)")
        .eq("status", "paid");

      if (!data) return [];

      type BillRow = { customer_id: string; total: number; customer: { name: string } | null };
      const map = new Map<string, { name: string; total: number }>();
      for (const bill of data as BillRow[]) {
        const name = bill.customer?.name ?? "Unknown";
        const existing = map.get(bill.customer_id) ?? { name, total: 0 };
        map.set(bill.customer_id, { name, total: existing.total + bill.total });
      }

      return [...map.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
    },
  });

  const { data: topProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ["reports", "top-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bill_items")
        .select("product_id, quantity, total, product:products(name)");

      if (!data) return [];

      type ItemRow = { product_id: string; quantity: number; total: number; product: { name: string } | null };
      const map = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const item of data as ItemRow[]) {
        const name = item.product?.name ?? "Unknown";
        const existing = map.get(item.product_id) ?? { name, quantity: 0, revenue: 0 };
        map.set(item.product_id, {
          name,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.total,
        });
      }

      return [...map.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const totalRevenue = (revenueSummary ?? []).reduce((s, b) => s + b.total, 0);

  return (
    <div className="flex flex-col h-full">
      <Header title="Reports" subtitle="Business performance and analytics" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
                {loadingRevenue ? (
                  <div className="h-6 w-24 animate-pulse rounded bg-muted mt-1" />
                ) : (
                  <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Top Customers</p>
                {loadingCustomers ? (
                  <div className="h-6 w-16 animate-pulse rounded bg-muted mt-1" />
                ) : (
                  <p className="text-xl font-bold">{topCustomers?.length ?? 0}</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Top Products</p>
                {loadingProducts ? (
                  <div className="h-6 w-16 animate-pulse rounded bg-muted mt-1" />
                ) : (
                  <p className="text-xl font-bold">{topProducts?.length ?? 0}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Top Customers */}
          <ReportCard
            title="Top Customers by Revenue"
            description="Customers with the highest lifetime value"
            icon={Users}
          >
            {loadingCustomers ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : !topCustomers || topCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No paid bills yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topCustomers.map((customer, idx) => (
                  <div key={customer.name} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{customer.name}</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">
                      {formatCurrency(customer.total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ReportCard>

          {/* Top Products */}
          <ReportCard
            title="Top Products by Revenue"
            description="Best-performing products in your catalog"
            icon={Package}
          >
            {loadingProducts ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : !topProducts || topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No sales data yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, idx) => (
                  <div key={product.name} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.quantity} units sold</p>
                    </div>
                    <p className="text-sm font-semibold shrink-0">
                      {formatCurrency(product.revenue)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ReportCard>
        </div>
      </div>
    </div>
  );
}
