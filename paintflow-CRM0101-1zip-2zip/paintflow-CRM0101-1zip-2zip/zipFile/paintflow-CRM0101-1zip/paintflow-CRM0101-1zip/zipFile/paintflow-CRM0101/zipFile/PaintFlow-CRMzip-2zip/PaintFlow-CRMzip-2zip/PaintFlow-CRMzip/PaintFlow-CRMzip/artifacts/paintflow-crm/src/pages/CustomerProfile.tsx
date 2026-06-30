import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Phone, MapPin, Mail, Building2, Cake, Heart,
  Edit, Trash2, MessageCircle, Printer, TrendingUp, Clock,
  ShoppingBag, AlertCircle, Plus, X, Palette, Home, Wallet,
  StickyNote, Image, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Header from "@/components/layout/Header";
import {
  useCustomer,
  useCustomerStats,
  useCustomerBills,
  useCustomerNotes,
  useCreateNote,
  useDeleteNote,
  useCustomerPhotos,
  useAddPhoto,
  useDeletePhoto,
  useCustomerPayments,
  useCustomerPaintShades,
  useHouseMappings,
  useDeleteCustomer,
} from "@/hooks/useCustomers";
import type { Bill, CustomerNote, CustomerPhoto, Payment, CustomerPaintShade, HouseMapping } from "@/types";

// ─── Formatters ──────────────────────────────────────────────
const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const formatDate = (d: string | null | undefined) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
};

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({
  label, value, sub, icon: Icon, color, loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {loading ? (
              <div className="h-7 w-28 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-xl font-bold truncate">{value}</p>
            )}
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Bill status badge ───────────────────────────────────────
const billStatusStyle: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  sent: "bg-blue-100 text-blue-700",
  draft: "bg-gray-100 text-gray-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-orange-100 text-orange-700",
};

// ─── Skeleton rows ───────────────────────────────────────────
function SkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <TableRow key={i}>
          {[...Array(cols)].map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─── Empty state ─────────────────────────────────────────────
function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground/60" />
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {description && <p className="text-xs text-muted-foreground/70 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Tab: Purchase History ───────────────────────────────────
function PurchaseHistoryTab({ customerId }: { customerId: string }) {
  const { data: bills, isLoading } = useCustomerBills(customerId);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Bill #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows cols={4} />
          ) : !bills || bills.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <EmptyState icon={ShoppingBag} title="No purchases yet" description="Bills created for this customer will appear here" />
              </TableCell>
            </TableRow>
          ) : (
            (bills as Bill[]).map((bill) => (
              <TableRow key={bill.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm font-medium">{bill.bill_number}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(bill.date)}</TableCell>
                <TableCell>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${billStatusStyle[bill.status] ?? "bg-muted text-muted-foreground"}`}>
                    {bill.status}
                  </span>
                </TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(bill.total)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Tab: Paint Shades ───────────────────────────────────────
function PaintShadeTab({ customerId }: { customerId: string }) {
  const { data: shades, isLoading } = useCustomerPaintShades(customerId);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Shade Name</TableHead>
            <TableHead>Shade Code</TableHead>
            <TableHead>Brand</TableHead>
            <TableHead>Area / Room</TableHead>
            <TableHead>Applied Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows cols={5} />
          ) : !shades || shades.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <EmptyState
                  icon={Palette}
                  title="No paint shades recorded"
                  description="Paint shades used for this customer will appear here"
                />
              </TableCell>
            </TableRow>
          ) : (
            (shades as CustomerPaintShade[]).map((shade) => (
              <TableRow key={shade.id} className="hover:bg-muted/30">
                <TableCell className="font-medium">{shade.shade_name}</TableCell>
                <TableCell>
                  {shade.shade_code ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ background: shade.shade_code.startsWith("#") ? shade.shade_code : undefined }}
                      />
                      <span className="font-mono text-xs">{shade.shade_code}</span>
                    </div>
                  ) : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{shade.brand ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{shade.room_area ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(shade.applied_date)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Tab: House Mapping ──────────────────────────────────────
function HouseMappingTab({ customerId }: { customerId: string }) {
  const { data: houses, isLoading } = useHouseMappings(customerId);

  const propertyTypeBadge: Record<string, string> = {
    residential: "bg-blue-100 text-blue-700",
    commercial: "bg-purple-100 text-purple-700",
    office: "bg-amber-100 text-amber-700",
    shop: "bg-green-100 text-green-700",
    other: "bg-gray-100 text-gray-700",
  };

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!houses || houses.length === 0) {
    return (
      <EmptyState
        icon={Home}
        title="No properties mapped"
        description="Customer properties and house details will appear here"
      />
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {(houses as HouseMapping[]).map((house) => (
        <Card key={house.id}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <p className="font-semibold truncate">{house.property_name}</p>
                {house.address && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{house.address}</p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${propertyTypeBadge[house.property_type] ?? "bg-muted text-muted-foreground"}`}>
                {house.property_type}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              {house.area_sqft && <span>{house.area_sqft} sq.ft</span>}
              {house.rooms && <span>{house.rooms} rooms</span>}
            </div>
            {house.notes && (
              <p className="text-xs text-muted-foreground mt-2 border-t border-border pt-2">{house.notes}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Tab: Payments ───────────────────────────────────────────
function PaymentsTab({ customerId }: { customerId: string }) {
  const { data: payments, isLoading } = useCustomerPayments(customerId);

  const methodBadge: Record<string, string> = {
    cash: "bg-green-100 text-green-700",
    upi: "bg-purple-100 text-purple-700",
    bank_transfer: "bg-blue-100 text-blue-700",
    cheque: "bg-amber-100 text-amber-700",
    card: "bg-indigo-100 text-indigo-700",
    other: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Bill Reference</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <SkeletonRows cols={5} />
          ) : !payments || payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <EmptyState
                  icon={Wallet}
                  title="No payments recorded"
                  description="Payments received from this customer will appear here"
                />
              </TableCell>
            </TableRow>
          ) : (
            (payments as Payment[]).map((p) => (
              <TableRow key={p.id} className="hover:bg-muted/30">
                <TableCell className="text-sm">{formatDate(p.payment_date)}</TableCell>
                <TableCell className="font-semibold text-green-700">{formatCurrency(p.amount)}</TableCell>
                <TableCell>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${methodBadge[p.payment_method] ?? "bg-muted text-muted-foreground"}`}>
                    {p.payment_method.replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {p.bill?.bill_number ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                  {p.notes ?? "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Tab: Notes ──────────────────────────────────────────────
function NotesTab({ customerId }: { customerId: string }) {
  const [text, setText] = useState("");
  const { data: notes, isLoading } = useCustomerNotes(customerId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  const handleAdd = () => {
    if (!text.trim()) return;
    createNote.mutate(
      { customer_id: customerId, content: text.trim() },
      { onSuccess: () => setText("") }
    );
  };

  return (
    <div className="space-y-5">
      {/* Add note */}
      <div className="space-y-3">
        <Textarea
          placeholder="Write a note about this customer…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!text.trim() || createNote.isPending}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Note
        </Button>
      </div>

      {/* Notes list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !notes || notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes yet" description="Notes you add will appear here" />
      ) : (
        <div className="space-y-3">
          {(notes as CustomerNote[]).map((note) => (
            <div key={note.id} className="group flex items-start gap-3 rounded-lg border border-border p-4 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {new Date(note.created_at).toLocaleDateString("en-IN", {
                    day: "numeric", month: "short", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => deleteNote.mutate({ id: note.id, customer_id: customerId })}
                className="shrink-0 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tab: Photos ─────────────────────────────────────────────
function PhotosTab({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const { data: photos, isLoading } = useCustomerPhotos(customerId);
  const addPhoto = useAddPhoto();
  const deletePhoto = useDeletePhoto();

  const handleAdd = () => {
    if (!url.trim()) return;
    addPhoto.mutate(
      { customer_id: customerId, url: url.trim(), caption: caption.trim() || undefined },
      { onSuccess: () => { setUrl(""); setCaption(""); setOpen(false); } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Photo
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !photos || photos.length === 0 ? (
        <EmptyState icon={Image} title="No photos yet" description="Add photo URLs to keep a visual record" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(photos as CustomerPhoto[]).map((photo) => (
            <div key={photo.id} className="group relative rounded-lg overflow-hidden border border-border aspect-video bg-muted">
              <img
                src={photo.url}
                alt={photo.caption ?? "Photo"}
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                  <p className="text-xs text-white truncate">{photo.caption}</p>
                </div>
              )}
              <button
                onClick={() => deletePhoto.mutate({ id: photo.id, customer_id: customerId })}
                className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 hover:bg-destructive transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Photo Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Photo URL</Label>
              <Input
                placeholder="https://example.com/photo.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Caption <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                placeholder="e.g. Living room — exterior wall"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!url.trim() || addPhoto.isPending}>
              {addPhoto.isPending ? "Adding…" : "Add Photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main: Customer Profile ───────────────────────────────────
export default function CustomerProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);

  const { data: customer, isLoading } = useCustomer(id ?? "");
  const { data: stats, isLoading: loadingStats } = useCustomerStats(id ?? "");
  const deleteCustomer = useDeleteCustomer();

  const handleWhatsApp = () => {
    if (!customer?.phone) return;
    const ph = customer.phone.replace(/\D/g, "");
    const intl = ph.length === 10 ? `91${ph}` : ph;
    window.open(
      `https://wa.me/${intl}?text=${encodeURIComponent(`Hello ${customer.name}, `)}`,
      "_blank"
    );
  };

  const handleDelete = () => {
    if (!id) return;
    deleteCustomer.mutate(id, {
      onSuccess: () => navigate("/customers"),
    });
  };

  // ── Loading state ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Customer Profile" />
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
            <div className="space-y-2">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col h-full">
        <Header title="Customer Not Found" />
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">This customer does not exist or was deleted.</p>
            <Button asChild variant="outline">
              <Link to="/customers">Back to Customers</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const initials = customer.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col h-full print:block">
      {/* ── Header ─────────────────────────────────────────── */}
      <Header
        title={customer.name}
        subtitle={[customer.city, customer.state].filter(Boolean).join(", ") || "Customer Profile"}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/customers">
                <ArrowLeft className="h-4 w-4 mr-1.5" /> Customers
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50"
              title="WhatsApp"
              onClick={handleWhatsApp}
              disabled={!customer.phone}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              title="Print"
              onClick={() => window.print()}
            >
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={`/customers/${id}/edit`}>
                <Edit className="h-4 w-4 mr-1.5" /> Edit
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:border-destructive"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="h-4 w-4 mr-1.5" /> Delete
            </Button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ── Customer details + Stats ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info Card */}
          <Card className="lg:col-span-1">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-5">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Since {new Date(customer.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {customer.phone && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{customer.phone}</span>
                    {customer.alternate_mobile && (
                      <span className="text-xs text-muted-foreground/60">/ {customer.alternate_mobile}</span>
                    )}
                  </div>
                )}
                {customer.email && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {(customer.address || customer.city) && (
                  <div className="flex items-start gap-2.5 text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      {[customer.address, customer.city, customer.state, customer.pincode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
                {customer.gst_number && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="font-mono text-xs">{customer.gst_number}</span>
                  </div>
                )}
                {customer.birthday && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Cake className="h-4 w-4 shrink-0" />
                    <span>{formatDate(customer.birthday)}</span>
                    <Badge variant="secondary" className="text-xs">Birthday</Badge>
                  </div>
                )}
                {customer.anniversary && (
                  <div className="flex items-center gap-2.5 text-muted-foreground">
                    <Heart className="h-4 w-4 shrink-0" />
                    <span>{formatDate(customer.anniversary)}</span>
                    <Badge variant="secondary" className="text-xs">Anniversary</Badge>
                  </div>
                )}
                {customer.notes && (
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{customer.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
            <StatCard
              label="Total Purchases"
              value={String(stats?.totalBills ?? 0)}
              icon={ShoppingBag}
              color="bg-blue-50 text-blue-600"
              loading={loadingStats}
            />
            <StatCard
              label="Total Amount Spent"
              value={formatCurrency(stats?.totalSpent ?? 0)}
              icon={TrendingUp}
              color="bg-green-50 text-green-600"
              loading={loadingStats}
            />
            <StatCard
              label="Pending Amount"
              value={formatCurrency(stats?.pendingAmount ?? 0)}
              icon={Clock}
              color={
                (stats?.pendingAmount ?? 0) > 0
                  ? "bg-red-50 text-red-600"
                  : "bg-gray-50 text-gray-500"
              }
              loading={loadingStats}
            />
            <StatCard
              label="First Purchase"
              value={formatDate(stats?.firstPurchase)}
              sub={stats?.lastPurchase ? `Last: ${formatDate(stats.lastPurchase)}` : undefined}
              icon={ChevronRight}
              color="bg-purple-50 text-purple-600"
              loading={loadingStats}
            />
          </div>
        </div>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <Tabs defaultValue="purchases" className="print:hidden">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="purchases" className="gap-1.5 text-xs">
              <ShoppingBag className="h-3.5 w-3.5" /> Purchase History
            </TabsTrigger>
            <TabsTrigger value="paint" className="gap-1.5 text-xs">
              <Palette className="h-3.5 w-3.5" /> Paint Shades
            </TabsTrigger>
            <TabsTrigger value="houses" className="gap-1.5 text-xs">
              <Home className="h-3.5 w-3.5" /> House Mapping
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 text-xs">
              <Wallet className="h-3.5 w-3.5" /> Payments
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs">
              <StickyNote className="h-3.5 w-3.5" /> Notes
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-1.5 text-xs">
              <Image className="h-3.5 w-3.5" /> Photos
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="purchases">
              <PurchaseHistoryTab customerId={id!} />
            </TabsContent>
            <TabsContent value="paint">
              <PaintShadeTab customerId={id!} />
            </TabsContent>
            <TabsContent value="houses">
              <HouseMappingTab customerId={id!} />
            </TabsContent>
            <TabsContent value="payments">
              <PaymentsTab customerId={id!} />
            </TabsContent>
            <TabsContent value="notes">
              <NotesTab customerId={id!} />
            </TabsContent>
            <TabsContent value="photos">
              <PhotosTab customerId={id!} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* ── Delete confirmation ──────────────────────────────── */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {customer.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the customer along with all their notes, photos, and
              records. Bills will remain but will lose the customer link. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCustomer.isPending ? "Deleting…" : "Delete Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
