import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Package,
  Warehouse,
  BarChart3,
  Building2,
  ShoppingCart,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useShopProfile } from "@/lib/shopProfile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bills",     label: "Bills",     icon: FileText        },
  { to: "/customers", label: "Customers", icon: Users           },
  { to: "/companies", label: "Companies", icon: Building2       },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart    },
  { to: "/products",  label: "Products",  icon: Package         },
  { to: "/inventory", label: "Inventory", icon: Warehouse       },
  { to: "/reports",   label: "Reports",   icon: BarChart3       },
];

const bottomItems: NavItem[] = [
  { to: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Called when a nav item is clicked — used on mobile to close the drawer */
  onClose?: () => void;
  /** Renders in mobile-drawer mode (no collapse toggle, close × button instead) */
  isMobile?: boolean;
}

export default function Sidebar({
  collapsed,
  onToggle,
  onClose,
  isMobile = false,
}: SidebarProps) {
  const { user, signOut } = useAuth();
  const { profile } = useShopProfile();
  const location = useLocation();

  const NavItemComponent = ({ to, label, icon: Icon }: NavItem) => {
    const isActive =
      to === "/dashboard"
        ? location.pathname === "/" || location.pathname === "/dashboard"
        : location.pathname.startsWith(to);

    const link = (
      <NavLink
        to={to}
        onClick={onClose}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground/70"
        )}
      >
        <Icon
          className={cn("shrink-0", collapsed && !isMobile ? "h-5 w-5" : "h-4 w-4")}
        />
        {(!collapsed || isMobile) && (
          <span className="truncate">{label}</span>
        )}
      </NavLink>
    );

    if (collapsed && !isMobile) {
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
        isMobile ? "w-72" : collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Desktop collapse toggle */}
      {!isMobile && (
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
      )}

      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 border-b border-sidebar-border px-4 py-5",
          collapsed && !isMobile && "justify-center px-2"
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white border border-sidebar-border overflow-hidden shadow-sm">
          <img
            src={profile.logo_url}
            alt={`${profile.shop_name} logo`}
            className="h-10 w-10 object-contain"
          />
        </div>

        {(!collapsed || isMobile) && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-sidebar-foreground truncate tracking-tight">
              {profile.shop_name}
            </p>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {profile.tagline}
            </p>
          </div>
        )}

        {/* Mobile drawer close button */}
        {isMobile && (
          <button
            onClick={onClose}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavItemComponent {...item} />
            </li>
          ))}
        </ul>

        <div className="my-4 border-t border-sidebar-border" />

        <ul className="space-y-1">
          {bottomItems.map((item) => (
            <li key={item.to}>
              <NavItemComponent {...item} />
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-3">
        {collapsed && !isMobile ? (
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
              {user?.email?.[0]?.toUpperCase() ?? "O"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">
                {user?.email ?? "Owner"}
              </p>
              <p className="text-xs text-sidebar-foreground/50 truncate">Owner</p>
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
