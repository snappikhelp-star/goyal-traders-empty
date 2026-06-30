import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BellRing,
  MessageCircle,
  Phone,
  UserPlus,
  IndianRupee,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useShopProfile } from "@/lib/shopProfile";
import { openWhatsApp, buildReminderMessage } from "@/lib/whatsapp";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

interface PendingCustomer {
  id: string;
  name: string;
  phone: string | null;
  pending_balance: number;
  last_purchase_date: string | null;
}

function usePendingCustomers() {
  return useQuery({
    queryKey: ["dashboard", "pending-customers"],
    queryFn: async (): Promise<PendingCustomer[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("customers")
        .select("id, name, phone, pending_balance, last_purchase_date")
        .gt("pending_balance", 0)
        .order("pending_balance", { ascending: false })
        .limit(5);
      if (error) throw new Error(error.message);
      return (data ?? []) as PendingCustomer[];
    },
    staleTime: 60 * 1000,
  });
}

function daysAgo(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86_400_000);
}

export default function FollowUpReminders() {
  const { profile } = useShopProfile();
  const { data, isLoading } = usePendingCustomers();

  const handleRemind = (c: PendingCustomer) => {
    const message = buildReminderMessage({
      shop: { shop_name: profile.shop_name, phone: profile.phone },
      customerName: c.name,
      billNumber: "your pending account",
      remainingAmount: c.pending_balance,
      dueDate: null,
    });
    openWhatsApp(c.phone ?? undefined, message);
  };

  return (
    <Card
      data-testid="dashboard-follow-up-reminders"
      className="border-0 shadow-md overflow-hidden"
    >
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-500 to-rose-500">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
            <BellRing className="h-4 w-4 text-orange-100 animate-[spin-slow_4s_linear_infinite]" />
            Follow-up Reminders
          </CardTitle>
          <Link
            to="/customers"
            className="text-xs font-medium text-orange-100 hover:text-white hover:underline"
          >
            See all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center text-center py-6">
            <UserPlus className="h-7 w-7 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              No pending dues right now
            </p>
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              You&apos;re all caught up — great work!
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {data.map((c, idx) => {
              const days = daysAgo(c.last_purchase_date);
              const avatarColors = [
                "bg-rose-100 text-rose-700",
                "bg-orange-100 text-orange-700",
                "bg-amber-100 text-amber-700",
                "bg-red-100 text-red-700",
                "bg-pink-100 text-pink-700",
              ];
              return (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-orange-100 bg-orange-50/30 p-2.5 hover:border-orange-200 hover:bg-orange-50 transition-colors"
                  data-testid={`follow-up-row-${c.id}`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-sm ${avatarColors[idx % avatarColors.length]}`}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/customers/${c.id}`}
                      className="text-sm font-medium truncate hover:underline block"
                    >
                      {c.name}
                    </Link>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        variant="outline"
                        className="text-[10px] gap-1 border-orange-300 text-orange-700 bg-orange-50 px-1.5 py-0"
                      >
                        <IndianRupee className="h-2.5 w-2.5" />
                        {INR.format(c.pending_balance)} due
                      </Badge>
                      {days !== null && (
                        <span className="text-[10px] text-muted-foreground">
                          {days === 0 ? "today" : `${days}d ago`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {c.phone && (
                      <a
                        href={`tel:${c.phone.replace(/\s+/g, "")}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-orange-200 bg-white hover:bg-orange-50 text-orange-500 hover:text-orange-700"
                        title="Call"
                        data-testid={`follow-up-call-${c.id}`}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 border-green-200 text-green-700 hover:bg-green-50"
                      onClick={() => handleRemind(c)}
                      data-testid={`follow-up-remind-${c.id}`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Remind
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
