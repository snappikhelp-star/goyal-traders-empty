import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Customers from "@/pages/Customers";
import CustomerForm from "@/pages/CustomerForm";
import CustomerProfile from "@/pages/CustomerProfile";
import Bills from "@/pages/Bills";
import BillCreate from "@/pages/BillCreate";
import BillView from "@/pages/BillView";
import Products from "@/pages/Products";
import Inventory from "@/pages/Inventory";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Companies from "@/pages/Companies";
import CompanyProfile from "@/pages/CompanyProfile";
import Purchases from "@/pages/Purchases";
import PurchaseForm from "@/pages/PurchaseForm";
import PurchaseView from "@/pages/PurchaseView";

// ── Public storefront ──────────────────────────────────────────────────
import PublicLayout from "@/pages/public/PublicLayout";
import PublicHome from "@/pages/public/PublicHome";
import PublicCatalog from "@/pages/public/PublicCatalog";
import PublicProductDetails from "@/pages/public/PublicProductDetails";
import PublicContact from "@/pages/public/PublicContact";

function LoadingScreen() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading Goyal Traders CRM…</p>
      </div>
    </div>
  );
}

function isSessionValid(session: { expires_at?: number | null } | null): boolean {
  if (!session) return false;
  if (!session.expires_at) return true;
  return session.expires_at * 1000 > Date.now();
}

/** Redirects to /login when unauthenticated. No role checks. */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (!user || !isSessionValid(session)) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return <>{children}</>;
}

/** Redirects logged-in users away from the login page. */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (user && isSessionValid(session)) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from ?? "/dashboard"} replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* ── Public storefront (no auth required) ───────────── */}
      <Route path="/shop" element={<PublicLayout />}>
        <Route index element={<PublicHome />} />
        <Route path="catalog" element={<PublicCatalog />} />
        <Route path="products/:id" element={<PublicProductDetails />} />
        <Route path="contact" element={<PublicContact />} />
      </Route>

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* ── Protected CRM routes — auth only, no role gating ─ */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard"  element={<Dashboard />} />

        {/* Customers */}
        <Route path="/customers"          element={<Customers />} />
        <Route path="/customers/new"      element={<CustomerForm />} />
        <Route path="/customers/:id"      element={<CustomerProfile />} />
        <Route path="/customers/:id/edit" element={<CustomerForm />} />

        {/* Bills */}
        <Route path="/bills"     element={<Bills />} />
        <Route path="/bills/new" element={<BillCreate />} />
        <Route path="/bills/:id" element={<BillView />} />

        {/* Companies */}
        <Route path="/companies"     element={<Companies />} />
        <Route path="/companies/:id" element={<CompanyProfile />} />

        {/* Purchases */}
        <Route path="/purchases"          element={<Purchases />} />
        <Route path="/purchases/new"      element={<PurchaseForm />} />
        <Route path="/purchases/:id"      element={<PurchaseView />} />
        <Route path="/purchases/:id/edit" element={<PurchaseForm />} />

        {/* Catalogue, stock, finance */}
        <Route path="/products"  element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reports"   element={<Reports />} />

        {/* Settings */}
        <Route path="/settings"  element={<Settings />} />
      </Route>

      {/* Unknown paths → dashboard (or login if not authed) */}
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter basename={base}>
            <AppRoutes />
          </BrowserRouter>
          <Toaster richColors closeButton />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
