import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/dashboard", label: "Home",      icon: LayoutDashboard },
  { to: "/bills",     label: "Bills",     icon: FileText        },
  { to: "/customers", label: "Customers", icon: Users           },
  { to: "/products",  label: "Products",  icon: Package         },
  { to: "/reports",   label: "Reports",   icon: BarChart3       },
];

export default function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch bg-background border-t border-border shadow-[0_-1px_8px_rgba(0,0,0,0.08)]">
      {tabs.map(({ to, label, icon: Icon }) => {
        const isActive =
          to === "/dashboard"
            ? location.pathname === "/" || location.pathname === "/dashboard"
            : location.pathname.startsWith(to);

        return (
          <NavLink
            key={to}
            to={to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive
                ? "text-blue-700"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 transition-transform",
                isActive && "scale-110"
              )}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
            <span className={cn(isActive && "font-semibold")}>{label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
