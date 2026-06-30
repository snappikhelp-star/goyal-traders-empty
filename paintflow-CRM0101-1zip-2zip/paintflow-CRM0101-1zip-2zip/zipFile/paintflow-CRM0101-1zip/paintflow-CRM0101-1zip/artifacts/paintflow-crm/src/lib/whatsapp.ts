import type { ShopProfile } from "@/lib/shopProfile";

// ─── Phone normalization ─────────────────────────────────────────────────
// wa.me wants the number in international format WITHOUT the leading "+".
// We strip spaces, dashes, parentheses, the "+" prefix, and any extra
// punctuation. If the input is 10 digits we assume India and prepend "91".

export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const digits = input.replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.length === 10) return "91" + digits;        // bare Indian mobile
  if (digits.length === 11 && digits.startsWith("0"))    // 0XXXXXXXXXX
    return "91" + digits.slice(1);
  return digits;                                         // already country-coded
}

// ─── Currency formatting (matches the rest of the app) ───────────────────

const INR_FMT = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});
function fmtINR(n: number): string {
  return INR_FMT.format(n);
}

// ─── Message templates ───────────────────────────────────────────────────

export interface InvoiceMessageInput {
  shop: Pick<ShopProfile, "shop_name" | "phone" | "gstin">;
  customerName: string;
  billNumber: string;
  amount: number;
  paidAmount?: number;
  dueDate?: string | null;
}

export function buildInvoiceMessage(i: InvoiceMessageInput): string {
  const remaining = Math.max(i.amount - (i.paidAmount ?? 0), 0);
  const lines = [
    `Namaste ${i.customerName},`,
    ``,
    `Thank you for shopping at *${i.shop.shop_name}*.`,
    ``,
    `Invoice No: *${i.billNumber}*`,
    `Total Amount: *${fmtINR(i.amount)}*`,
  ];
  if (i.paidAmount && i.paidAmount > 0) {
    lines.push(`Paid: ${fmtINR(i.paidAmount)}`);
    lines.push(`Balance: *${fmtINR(remaining)}*`);
  }
  if (i.dueDate) {
    lines.push(`Due Date: ${new Date(i.dueDate).toLocaleDateString("en-IN")}`);
  }
  lines.push(
    ``,
    `For any queries, please reply to this message or call ${i.shop.phone}.`,
    ``,
    `Thank you for your business! 🙏`,
    `— ${i.shop.shop_name}`,
  );
  if (i.shop.gstin) lines.push(`GSTIN: ${i.shop.gstin}`);
  return lines.join("\n");
}

export interface ReminderMessageInput {
  shop: Pick<ShopProfile, "shop_name" | "phone">;
  customerName: string;
  billNumber: string;
  remainingAmount: number;
  dueDate?: string | null;
}

export function buildReminderMessage(i: ReminderMessageInput): string {
  const lines = [
    `Dear ${i.customerName},`,
    ``,
    `This is a gentle reminder from *${i.shop.shop_name}* regarding the following pending invoice:`,
    ``,
    `Invoice No: *${i.billNumber}*`,
    `Pending Amount: *${fmtINR(i.remainingAmount)}*`,
  ];
  if (i.dueDate) {
    lines.push(`Due Date: ${new Date(i.dueDate).toLocaleDateString("en-IN")}`);
  }
  lines.push(
    ``,
    `Kindly arrange the payment at your earliest convenience. If you have already paid, please ignore this message.`,
    ``,
    `For any queries, call ${i.shop.phone}.`,
    ``,
    `— ${i.shop.shop_name}`,
  );
  return lines.join("\n");
}

export interface LowStockMessageInput {
  shop: Pick<ShopProfile, "shop_name">;
  items: { name: string; quantity: number; unit?: string }[];
}

export function buildLowStockMessage(i: LowStockMessageInput): string {
  const lines = [
    `*${i.shop.shop_name} — Low Stock Alert*`,
    ``,
    `The following items are running low and need to be restocked:`,
    ``,
  ];
  for (const item of i.items) {
    lines.push(`• ${item.name} — ${item.quantity} ${item.unit ?? ""} left`.trim());
  }
  lines.push(``, `Please reorder at the earliest.`);
  return lines.join("\n");
}

// ─── wa.me link builder ──────────────────────────────────────────────────

/** Build a wa.me link. If `phone` is null/empty the link opens WhatsApp Web
 *  with no recipient — the user picks the contact manually (useful for
 *  customers with no phone on file). */
export function whatsappLink(
  phone: string | null | undefined,
  message: string,
): string {
  const normalized = normalizePhone(phone ?? "");
  const text = encodeURIComponent(message);
  if (normalized) {
    return `https://wa.me/${normalized}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

/** Open WhatsApp in a new tab with the given message. */
export function openWhatsApp(
  phone: string | null | undefined,
  message: string,
): void {
  const url = whatsappLink(phone, message);
  window.open(url, "_blank", "noopener,noreferrer");
}
