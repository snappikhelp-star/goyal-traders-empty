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

const actions = [
  {
    label: "Create Bill",
    sub: "New invoice",
    icon: FilePlus2,
    to: "/bills/new",
    iconColor: "text-blue-600",
    bg: "bg-blue-50",
    ring: "ring-blue-100",
    testId: "quick-create-bill-btn",
  },
  {
    label: "Add Customer",
    sub: "New buyer",
    icon: UserPlus,
    to: "/customers/new",
    iconColor: "text-green-600",
    bg: "bg-green-50",
    ring: "ring-green-100",
    testId: "quick-add-customer-btn",
  },
  {
    label: "Check Stock",
    sub: "Inventory",
    icon: PackageSearch,
    to: "/inventory",
    iconColor: "text-amber-600",
    bg: "bg-amber-50",
    ring: "ring-amber-100",
    testId: "quick-check-stock-btn",
  },
  {
    label: "Reports",
    sub: "Sales & dues",
    icon: BarChart3,
    to: "/reports",
    iconColor: "text-purple-600",
    bg: "bg-purple-50",
    ring: "ring-purple-100",
    testId: "quick-view-reports-btn",
  },
] as const;

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <Card
      data-testid="dashboard-quick-actions"
      className="border-border/60 shadow-sm bg-gradient-to-br from-card to-blue-50/30"
    >
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-orange-500" />
          Quick Actions
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {actions.map((a) => (
            <Button
              key={a.label}
              variant="outline"
              className="h-auto flex-col py-3.5 px-2 gap-2 bg-white shadow-sm border-border/60 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 transition-[transform,box-shadow,border-color] duration-200"
              onClick={() => navigate(a.to)}
              data-testid={a.testId}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ${a.ring} ${a.bg}`}
              >
                <a.icon className={`h-5 w-5 ${a.iconColor}`} />
              </span>
              <span className="w-full flex flex-col items-center text-center gap-0.5">
                <span className="text-[13px] font-semibold leading-tight">
                  {a.label}
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  {a.sub}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
