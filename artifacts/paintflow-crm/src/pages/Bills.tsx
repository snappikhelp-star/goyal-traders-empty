import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, Search, FileText, MoreHorizontal, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Header from "@/components/layout/Header";
import { supabase } from "@/lib/supabase";
import type { Bill, BillStatus } from "@/types";

const statusOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

const statusStyles: Record<BillStatus, string> = {
  draft:           "bg-gray-100 text-gray-700",
  sent:            "bg-blue-100 text-blue-700",
  paid:            "bg-green-100 text-green-700",
  overdue:         "bg-red-100 text-red-700",
  cancelled:       "bg-orange-100 text-orange-700",
  partially_paid:  "bg-amber-100 text-amber-700",
  unpaid:          "bg-slate-100 text-slate-600",
};

const statusLabels: Record<BillStatus, string> = {
  draft:           "Draft",
  sent:            "Sent",
  paid:            "Paid",
  overdue:         "Overdue",
  cancelled:       "Cancelled",
  partially_paid:  "Partially Paid",
  unpaid:          "Unpaid",
};

export default function Bills() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: bills, isLoading } = useQuery({
    queryKey: ["bills", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("bills")
        .select("*, customer:customers(name)")
        .order("created_at", { ascending: false });

      if (search.trim()) {
        query = query.ilike("bill_number", `%${search}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Bill[];
    },
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Bills"
        subtitle="Create and manage customer invoices"
        actions={
          <Button size="sm" className="gap-2" onClick={() => navigate("/bills/new")}>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search bill number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Bill #</TableHead>
                <TableHead className="font-semibold">Customer</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Due Date</TableHead>
                <TableHead className="font-semibold">Total</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(7)].map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : !bills || bills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {search || statusFilter !== "all"
                          ? "No bills match your filters"
                          : "No bills yet"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                bills.map((bill) => (
                  <TableRow
                    key={bill.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/bills/${bill.id}`)}
                  >
                    <TableCell className="font-medium font-mono text-sm">
                      {bill.bill_number}
                    </TableCell>
                    <TableCell>{bill.customer?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{bill.date}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {bill.due_date ?? "—"}
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(bill.total)}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[bill.status]}`}
                      >
                        {statusLabels[bill.status] ?? bill.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); navigate(`/bills/${bill.id}`); }}
                          >
                            View Bill
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                          <DropdownMenuItem disabled>Mark as Paid</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); navigate(`/bills/${bill.id}`); }}
                          >
                            Download PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled className="text-destructive">
                            Cancel Bill
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
