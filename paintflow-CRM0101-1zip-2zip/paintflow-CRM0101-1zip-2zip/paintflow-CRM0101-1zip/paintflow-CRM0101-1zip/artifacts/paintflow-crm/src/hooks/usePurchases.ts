import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────

export type PurchaseStatus   = "paid" | "partial" | "due";
export type PaymentMethod    = "cash" | "upi" | "cheque" | "bank_transfer";

export interface PurchaseItem {
  id?:              string;
  purchase_id?:     string;
  product_id:       string | null;
  product_name:     string;
  quantity:         number;
  purchase_price:   number;
  gst_percent:      number;
  discount_percent: number;
  line_total:       number;
}

export interface Purchase {
  id:             string;
  company_id:     string | null;
  invoice_number: string;
  invoice_date:   string;
  due_date:       string | null;
  payment_method: PaymentMethod;
  status:         PurchaseStatus;
  subtotal:       number;
  gst_amount:     number;
  grand_total:    number;
  paid_amount:    number;
  due_amount:     number;
  notes:          string | null;
  created_at:     string;
  updated_at:     string;
  company?:       { name: string } | null;
  purchase_items?: PurchaseItem[];
}

export type PurchaseSortField = "invoice_date" | "invoice_number" | "grand_total" | "status" | "created_at";

interface UsePurchasesOptions {
  search?:   string;
  page?:     number;
  pageSize?: number;
  sortField?: PurchaseSortField;
  sortAsc?:   boolean;
  status?:    string;
  companyId?: string;
}

const QK = "purchases";

// ── List ──────────────────────────────────────────────────────

export function usePurchases({
  search = "", page = 1, pageSize = 15,
  sortField = "invoice_date", sortAsc = false,
  status = "", companyId = "",
}: UsePurchasesOptions = {}) {
  return useQuery({
    queryKey: [QK, { search, page, pageSize, sortField, sortAsc, status, companyId }],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let q = (supabase as any)
        .from("purchases")
        .select("*, company:companies(name)", { count: "exact" });

      if (search.trim()) {
        q = q.ilike("invoice_number", `%${search}%`);
      }
      if (status)    q = q.eq("status", status);
      if (companyId) q = q.eq("company_id", companyId);

      q = q.order(sortField, { ascending: sortAsc });
      const from = (page - 1) * pageSize;
      q = q.range(from, from + pageSize - 1);

      const { data, error, count } = await q;
      if (error) throw error;
      return { purchases: (data ?? []) as Purchase[], total: count ?? 0 };
    },
  });
}

// ── Single ────────────────────────────────────────────────────

export function usePurchase(id: string) {
  return useQuery({
    queryKey: [QK, id],
    enabled: !!id,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("purchases")
        .select("*, company:companies(name), purchase_items(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Purchase;
    },
  });
}

// ── Dashboard stats ───────────────────────────────────────────

export function usePurchaseStats() {
  return useQuery({
    queryKey: [QK, "stats"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: all } = await (supabase as any)
        .from("purchases")
        .select("grand_total, paid_amount, due_amount, invoice_date, status");

      const rows = (all ?? []) as {
        grand_total: number; paid_amount: number; due_amount: number;
        invoice_date: string; status: string;
      }[];

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split("T")[0];

      let totalPurchase = 0, totalDue = 0, monthPurchase = 0;
      for (const r of rows) {
        totalPurchase += r.grand_total;
        totalDue      += r.due_amount;
        if (r.invoice_date >= monthStart) monthPurchase += r.grand_total;
      }

      return { totalPurchase, totalDue, monthPurchase };
    },
  });
}

export function useRecentPurchases(limit = 5) {
  return useQuery({
    queryKey: [QK, "recent", limit],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("purchases")
        .select("id, invoice_number, invoice_date, grand_total, paid_amount, due_amount, status, company:companies(name)")
        .order("invoice_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as Purchase[];
    },
  });
}

// ── Create ────────────────────────────────────────────────────

interface SavePurchasePayload {
  purchase: {
    company_id:     string | null;
    invoice_number: string;
    invoice_date:   string;
    due_date:       string | null;
    payment_method: PaymentMethod;
    status:         PurchaseStatus;
    subtotal:       number;
    gst_amount:     number;
    grand_total:    number;
    paid_amount:    number;
    due_amount:     number;
    notes:          string | null;
  };
  items: Omit<PurchaseItem, "id" | "purchase_id">[];
}

async function syncStock(
  items: Omit<PurchaseItem, "id" | "purchase_id">[],
  oldItems: PurchaseItem[] = [],
  isDelete = false
) {
  // Calculate net delta per product
  const delta = new Map<string, number>();

  if (isDelete) {
    // Reverting: subtract old quantities
    for (const it of oldItems) {
      if (!it.product_id) continue;
      delta.set(it.product_id, (delta.get(it.product_id) ?? 0) - it.quantity);
    }
  } else {
    // Reverting old items first, then applying new items
    for (const it of oldItems) {
      if (!it.product_id) continue;
      delta.set(it.product_id, (delta.get(it.product_id) ?? 0) - it.quantity);
    }
    for (const it of items) {
      if (!it.product_id) continue;
      delta.set(it.product_id, (delta.get(it.product_id) ?? 0) + it.quantity);
    }
  }

  for (const [productId, qty] of delta.entries()) {
    if (qty === 0) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inv } = await (supabase as any)
      .from("inventory")
      .select("id, quantity")
      .eq("product_id", productId)
      .single();
    if (inv) {
      const newQty = Math.max(0, Number(inv.quantity) + qty);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("inventory")
        .update({ quantity: newQty, updated_at: new Date().toISOString() })
        .eq("id", inv.id);
    }
  }
}

async function syncCompanyStats(companyId: string | null) {
  if (!companyId) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("purchases")
    .select("grand_total, paid_amount, due_amount, invoice_date")
    .eq("company_id", companyId)
    .neq("status", "cancelled");

  const rows = (data ?? []) as {
    grand_total: number; paid_amount: number; due_amount: number; invoice_date: string;
  }[];

  let totalPurchase = 0, totalPaid = 0, outstandingDue = 0, lastDate = "";
  for (const r of rows) {
    totalPurchase   += r.grand_total;
    totalPaid       += r.paid_amount;
    outstandingDue  += r.due_amount;
    if (r.invoice_date > lastDate) lastDate = r.invoice_date;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("companies")
    .update({
      total_purchase:     totalPurchase,
      total_paid:         totalPaid,
      outstanding_due:    outstandingDue,
      last_purchase_date: lastDate || null,
    })
    .eq("id", companyId);
}

export function useCreatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ purchase, items }: SavePurchasePayload) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: p, error: pErr } = await (supabase as any)
        .from("purchases").insert(purchase).select().single();
      if (pErr) throw pErr;

      if (items.length) {
        const rows = items.map((it) => ({ ...it, purchase_id: p.id }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: iErr } = await (supabase as any).from("purchase_items").insert(rows);
        if (iErr) throw iErr;
      }

      await syncStock(items);
      await syncCompanyStats(purchase.company_id);
      return p as Purchase;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Purchase saved successfully");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to save purchase"),
  });
}

// ── Update ────────────────────────────────────────────────────

export function useUpdatePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, purchase, items, oldItems,
    }: SavePurchasePayload & { id: string; oldItems: PurchaseItem[] }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: pErr } = await (supabase as any)
        .from("purchases").update(purchase).eq("id", id);
      if (pErr) throw pErr;

      // Replace items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("purchase_items").delete().eq("purchase_id", id);
      if (items.length) {
        const rows = items.map((it) => ({ ...it, purchase_id: id }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: iErr } = await (supabase as any).from("purchase_items").insert(rows);
        if (iErr) throw iErr;
      }

      await syncStock(items, oldItems);
      await syncCompanyStats(purchase.company_id);
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Purchase updated successfully");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to update purchase"),
  });
}

// ── Purchase Payments ─────────────────────────────────────────

export interface PurchasePayment {
  id:             string;
  purchase_id:    string;
  company_id:     string | null;
  payment_date:   string;
  payment_method: PaymentMethod;
  amount:         number;
  reference:      string | null;
  notes:          string | null;
  created_at:     string;
}

export function usePurchasePayments(purchaseId: string) {
  return useQuery({
    queryKey: [QK, "payments", purchaseId],
    enabled: !!purchaseId,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("purchase_payments")
        .select("*")
        .eq("purchase_id", purchaseId)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PurchasePayment[];
    },
  });
}

export function useSupplierPaymentStats() {
  return useQuery({
    queryKey: [QK, "payment-stats"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("purchase_payments")
        .select("amount, payment_date");
      const rows = (data ?? []) as { amount: number; payment_date: string }[];
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split("T")[0];
      let paymentsThisMonth = 0;
      for (const r of rows) {
        if (r.payment_date >= monthStart) paymentsThisMonth += r.amount;
      }
      return { paymentsThisMonth };
    },
  });
}

export function useRecentSupplierPayments(limit = 5) {
  return useQuery({
    queryKey: [QK, "recent-payments", limit],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("purchase_payments")
        .select("*, purchase:purchases(invoice_number), company:companies(name)")
        .order("payment_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as (PurchasePayment & {
        purchase?: { invoice_number: string } | null;
        company?:  { name: string } | null;
      })[];
    },
  });
}

async function syncPurchaseAfterPayment(purchaseId: string, companyId: string | null) {
  // Sum all payments for this purchase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pmts } = await (supabase as any)
    .from("purchase_payments")
    .select("amount")
    .eq("purchase_id", purchaseId);

  const totalPaid = ((pmts ?? []) as { amount: number }[])
    .reduce((s, p) => s + p.amount, 0);

  // Fetch the purchase grand total
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pur } = await (supabase as any)
    .from("purchases")
    .select("grand_total")
    .eq("id", purchaseId)
    .single();

  const grandTotal = (pur as { grand_total: number } | null)?.grand_total ?? 0;
  const dueAmount  = Math.max(0, grandTotal - totalPaid);
  const status: PurchaseStatus =
    totalPaid <= 0 ? "due" : dueAmount <= 0 ? "paid" : "partial";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("purchases")
    .update({ paid_amount: totalPaid, due_amount: dueAmount, status })
    .eq("id", purchaseId);

  // Sync company last_payment_date + outstanding
  if (companyId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allPmts } = await (supabase as any)
      .from("purchase_payments")
      .select("amount, payment_date")
      .eq("company_id", companyId);

    let totalPaidForCompany = 0;
    let lastDate = "";
    for (const p of (allPmts ?? []) as { amount: number; payment_date: string }[]) {
      totalPaidForCompany += p.amount;
      if (p.payment_date > lastDate) lastDate = p.payment_date;
    }

    // Recompute outstanding from all purchases
    await syncCompanyStats(companyId);

    // Update last_payment_date
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("companies")
      .update({ last_payment_date: lastDate || null })
      .eq("id", companyId);
  }
}

export function useAddPurchasePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      purchase_id:    string;
      company_id:     string | null;
      payment_date:   string;
      payment_method: PaymentMethod;
      amount:         number;
      reference:      string | null;
      notes:          string | null;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("purchase_payments")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      await syncPurchaseAfterPayment(payload.purchase_id, payload.company_id);
      return data as PurchasePayment;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [QK] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: [QK, "payments", variables.purchase_id] });
      qc.invalidateQueries({ queryKey: [QK, "payment-stats"] });
      qc.invalidateQueries({ queryKey: [QK, "recent-payments"] });
      toast.success("Payment recorded successfully");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to record payment"),
  });
}

export function useDeletePurchasePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, purchaseId, companyId,
    }: { id: string; purchaseId: string; companyId: string | null }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("purchase_payments")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await syncPurchaseAfterPayment(purchaseId, companyId);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [QK] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: [QK, "payments", variables.purchaseId] });
      qc.invalidateQueries({ queryKey: [QK, "payment-stats"] });
      qc.invalidateQueries({ queryKey: [QK, "recent-payments"] });
      toast.success("Payment deleted");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete payment"),
  });
}

// ── Delete ────────────────────────────────────────────────────

export function useDeletePurchase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, companyId, items }: { id: string; companyId: string | null; items: PurchaseItem[] }) => {
      await syncStock([], items, true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("purchases").delete().eq("id", id);
      if (error) throw error;
      await syncCompanyStats(companyId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Purchase deleted");
    },
    onError: (err: Error) => toast.error(err.message ?? "Failed to delete purchase"),
  });
}
