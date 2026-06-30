import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Menu, Download, X, Share, Monitor } from "lucide-react";
import Sidebar from "./Sidebar";
import MobileBottomNav from "./MobileBottomNav";
import { useShopProfile } from "@/lib/shopProfile";
import { usePWAInstall } from "@/hooks/usePWAInstall";

type HintKind = "ios" | "chrome" | null;

// ── Mobile top header (phones / tablets < lg) ────────────────
function MobileTopHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const { profile } = useShopProfile();
  const { state, isIOS, promptInstall } = usePWAInstall();
  const navigate = useNavigate();

  const [hint, setHint] = useState<HintKind>(null);

  const handleInstall = () => {
    if (state === "installable") {
      promptInstall();
    } else if (isIOS) {
      setHint("ios");
    } else {
      // Non-iOS unsupported (Firefox, Samsung Browser, etc.) — guide to Chrome
      setHint("chrome");
    }
  };

  // Show only when there's something actionable (not already installed)
  const showInstallBtn = state !== "installed";

  return (
    <>
      <header className="lg:hidden flex items-center justify-between h-14 px-3 border-b border-border bg-background shrink-0 shadow-sm">
        {/* Hamburger */}
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo + name — tap to go home */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 min-w-0 flex-1 mx-3"
          aria-label="Go to dashboard"
        >
          <img
            src={profile.logo_url}
            alt={profile.shop_name}
            className="h-8 w-8 shrink-0 object-contain rounded-lg"
          />
          <span className="font-bold text-sm text-foreground truncate">
            {profile.shop_name}
          </span>
        </button>

        {/* Install button */}
        {showInstallBtn && (
          <button
            onClick={handleInstall}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-800 active:scale-95 transition-all"
            aria-label="Install this app"
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Install
          </button>
        )}
      </header>

      {/* iOS Share-to-install hint */}
      {hint === "ios" && (
        <div className="lg:hidden flex items-start gap-3 bg-blue-50 border-b border-blue-200 px-4 py-3 text-sm">
          <Share className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
          <p className="flex-1 text-blue-800">
            <span className="font-semibold">Add to Home Screen: </span>
            Tap <span className="font-semibold">Share ⬆</span> in Safari, then{" "}
            <span className="font-semibold">Add to Home Screen</span>.
          </p>
          <button
            onClick={() => setHint(null)}
            className="text-blue-400 hover:text-blue-600"
            aria-label="Dismiss install hint"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      {/* Android / other browser — open in Chrome hint */}
      {hint === "chrome" && (
        <div className="lg:hidden flex items-start gap-3 bg-slate-50 border-b border-slate-200 px-4 py-3 text-sm">
          <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <p className="flex-1 text-slate-700">
            <span className="font-semibold">Open in Chrome: </span>
            Open this page in <span className="font-semibold">Google Chrome</span>{" "}
            and tap <span className="font-semibold">⊕ Install</span> in the address bar.
          </p>
          <button
            onClick={() => setHint(null)}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Dismiss install hint"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}

// ── Root layout ──────────────────────────────────────────────
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
        />
      </div>

      {/* ── Mobile sidebar overlay ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeMobileMenu}
            aria-hidden
          />
          {/* Drawer */}
          <div className="absolute inset-y-0 left-0 w-72 animate-in slide-in-from-left duration-200">
            <Sidebar
              collapsed={false}
              onToggle={closeMobileMenu}
              onClose={closeMobileMenu}
              isMobile
            />
          </div>
        </div>
      )}

      {/* ── Content column ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <MobileTopHeader onMenuClick={() => setMobileMenuOpen(true)} />

        {/* Page content — add bottom padding on mobile for the bottom nav */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom tab bar */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
