import { useQuery } from "@tanstack/react-query";
import {
  Users,
  FileText,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import type { Bill, InventoryItem } from "@/types";

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
            {trend && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowUpRight className="h-3 w-3 text-green-500" />
                {trend}
              </p>
            )}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["dashboard", "customers-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ["dashboard", "products-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: billsData, isLoading: loadingBills } = useQuery({
    queryKey: ["dashboard", "bills"],
    queryFn: async () => {
      const { data } = await supabase
        .from("bills")
        .select("id, status, total, date")
        .order("date", { ascending: false })
        .limit(5);
      return data as Bill[] | null;
    },
  });

  const { data: lowStock, isLoading: loadingStock } = useQuery({
    queryKey: ["dashboard", "low-stock"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inventory")
        .select("id, quantity, min_quantity, product:products(name)")
        .filter("quantity", "lte", supabase.from("inventory").select("min_quantity"))
        .limit(5);
      return data as InventoryItem[] | null;
    },
  });

  const { data: monthRevenue, isLoading: loadingRevenue } = useQuery({
    queryKey: ["dashboard", "month-revenue"],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      const { data } = await supabase
        .from("bills")
        .select("total")
        .eq("status", "paid")
        .gte("date", start.toISOString().split("T")[0]);
      const rows = (data ?? []) as { total: number }[];
      const total = rows.reduce((sum, b) => sum + (b.total ?? 0), 0);
      return total;
    },
  });

  const { data: pendingBills, isLoading: loadingPending } = useQuery({
    queryKey: ["dashboard", "pending-bills"],
    queryFn: async () => {
      const { count } = await supabase
        .from("bills")
        .select("*", { count: "exact", head: true })
        .in("status", ["sent", "overdue"]);
      return count ?? 0;
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  const statusColor: Record<string, string> = {
    paid: "bg-green-100 text-green-700",
    sent: "bg-blue-100 text-blue-700",
    draft: "bg-gray-100 text-gray-700",
    overdue: "bg-red-100 text-red-700",
    cancelled: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Dashboard" subtitle="Overview of your paint shop operations" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Customers"
            value={customers ?? 0}
            icon={Users}
            color="bg-blue-50 text-blue-600"
            loading={loadingCustomers}
          />
          <StatCard
            title="Revenue This Month"
            value={monthRevenue != null ? formatCurrency(monthRevenue) : "—"}
            icon={TrendingUp}
            color="bg-green-50 text-green-600"
            loading={loadingRevenue}
          />
          <StatCard
            title="Pending Bills"
            value={pendingBills ?? 0}
            icon={Clock}
            color="bg-amber-50 text-amber-600"
            loading={loadingPending}
          />
          <StatCard
            title="Total Products"
            value={products ?? 0}
            icon={Package}
            color="bg-purple-50 text-purple-600"
            loading={loadingProducts}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Bills */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recent Bills</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {loadingBills ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                  ))}
                </div>
              ) : !billsData || billsData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No bills yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {billsData.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{bill.bill_number}</p>
                        <p className="text-xs text-muted-foreground">{bill.date}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold">
                          {formatCurrency(bill.total)}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[bill.status] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {bill.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Low Stock Alert</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              {loadingStock ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
                  ))}
                </div>
              ) : !lowStock || lowStock.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">All stock levels are healthy</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lowStock.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">
                        {item.product?.name ?? "Unknown product"}
                      </p>
                      <Badge variant="destructive" className="shrink-0">
                        {item.quantity} left
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
