import { useNavigate } from "react-router-dom";
import {
  FilePlus2,
  UserPlus,
  PackageSearch,
  BarChart3,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Dashboard "Quick Actions" card — owner-focused shortcuts for the daily
 * counter routine.
 *
 *  • Create New Bill → /bills/new
 *  • Add Customer    → /customers/new
 *  • Check Stock     → /inventory
 *  • View Reports    → /reports
 */
export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      label: "Create New Bill",
      sub: "Start a new invoice",
      icon: FilePlus2,
      to: "/bills/new",
      iconColor: "text-blue-600",
      bg: "bg-blue-50",
      testId: "quick-create-bill-btn",
    },
    {
      label: "Add Customer",
      sub: "Save a new buyer",
      icon: UserPlus,
      to: "/customers/new",
      iconColor: "text-green-600",
      bg: "bg-green-50",
      testId: "quick-add-customer-btn",
    },
    {
      label: "Check Stock",
      sub: "Live inventory view",
      icon: PackageSearch,
      to: "/inventory",
      iconColor: "text-amber-600",
      bg: "bg-amber-50",
      testId: "quick-check-stock-btn",
    },
    {
      label: "View Reports",
      sub: "Sales & dues summary",
      icon: BarChart3,
      to: "/reports",
      iconColor: "text-purple-600",
      bg: "bg-purple-50",
      testId: "quick-view-reports-btn",
    },
  ] as const;

  return (
    <Card
      data-testid="dashboard-quick-actions"
      className="border-border/60 shadow-sm bg-gradient-to-br from-card to-blue-50/30"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-500" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-0">
        {actions.map((a) => (
          <Button
            key={a.label}
            variant="outline"
            className="h-auto py-3 px-3 gap-3 justify-start text-left bg-white shadow-sm border-border/60 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 transition-[transform,box-shadow,border-color] duration-200"
            onClick={() => navigate(a.to)}
            data-testid={a.testId}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-inner ring-1 ring-black/[0.04] ${a.bg}`}
            >
              <a.icon className={`h-4 w-4 ${a.iconColor}`} />
            </span>
            <span className="min-w-0 flex flex-col">
              <span className="text-sm font-semibold leading-none">
                {a.label}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                {a.sub}
              </span>
            </span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
