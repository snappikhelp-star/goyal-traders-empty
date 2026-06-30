// ─── Single-Owner Permission Model ───────────────────────────────────────
// Every authenticated user is treated as the shop owner with full access.
// Role/permission types are preserved for import compatibility but all
// permission checks unconditionally return true.

export type Role = "admin" | "manager" | "staff";

export type Permission =
  | "dashboard.view"
  | "customers.view"
  | "customers.manage"
  | "products.view"
  | "products.manage"
  | "inventory.view"
  | "inventory.manage"
  | "bills.view"
  | "bills.create"
  | "bills.manage"
  | "reports.view"
  | "settings.view"
  | "settings.shop.manage"
  | "settings.backup.use";

export const FALLBACK_ROLE: Role = "admin";

/** Always returns true — every logged-in user is the owner. */
export function roleHasPermission(_role: Role | null, _perm: Permission): boolean {
  return true;
}

/** Always returns "admin" for any authenticated session. */
export function useRole(): { role: Role; loading: false } {
  return { role: "admin", loading: false };
}

/** Always returns true — owner has access to everything. */
export function useCan(_perm: Permission): boolean {
  return true;
}
