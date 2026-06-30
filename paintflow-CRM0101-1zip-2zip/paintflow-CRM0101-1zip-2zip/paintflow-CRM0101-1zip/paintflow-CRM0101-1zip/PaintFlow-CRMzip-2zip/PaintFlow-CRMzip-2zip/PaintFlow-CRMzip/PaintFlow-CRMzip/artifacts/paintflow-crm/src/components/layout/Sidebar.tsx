import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Warehouse,
  BarChart3,
  Settings,
  PaintBucket,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/bills", label: "Bills", icon: FileText },
  { to: "/products", label: "Products", icon: Package },
  { to: "/inventory", label: "Inventory", icon: Warehouse },
  { to: "/reports", label: "Reports", icon: BarChart3 },
];

const bottomItems = [
  { to: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const NavItem = ({
    to,
    label,
    icon: Icon,
  }: {
    to: string;
    label: string;
    icon: React.ElementType;
  }) => {
    const isActive =
      to === "/dashboard"
        ? location.pathname === "/" || location.pathname === "/dashboard"
        : location.pathname.startsWith(to);

    const link = (
      <NavLink
        to={to}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70"
        )}
      >
        <Icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
        {!collapsed && <span className="truncate">{label}</span>}
      </NavLink>
    );

    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return link;
  };

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md hover:bg-sidebar-accent transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-4 py-5",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
          <PaintBucket className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-sidebar-foreground truncate">
              Goyal Traders
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">Paint CRM</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavItem {...item} />
            </li>
          ))}
        </ul>

        <div className="my-4 border-t border-sidebar-border" />

        <ul className="space-y-1">
          {bottomItems.map((item) => (
            <li key={item.to}>
              <NavItem {...item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={signOut}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-sidebar-primary font-semibold text-sm">
              {user?.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user?.email ?? "User"}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">Staff</p>
            </div>
            <button
              onClick={signOut}
              className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
