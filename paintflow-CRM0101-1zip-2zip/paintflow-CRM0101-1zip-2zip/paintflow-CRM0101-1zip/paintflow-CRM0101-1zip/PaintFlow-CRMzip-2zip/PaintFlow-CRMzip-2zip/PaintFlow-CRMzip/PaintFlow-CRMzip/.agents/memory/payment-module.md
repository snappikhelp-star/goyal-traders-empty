---
name: Payment module design
description: record_payment() RPC design, usePayments.ts hook exports, key validation rules, and cache invalidation strategy
---

## record_payment() RPC (migration 009)
- Takes: `p_bill_id`, `p_amount`, `p_method` (cash/upi/bank_transfer/cheque/card/other), `p_date`, `p_reference`, `p_notes`
- Validates: auth, amount > 0, valid method enum, bill exists, not cancelled, not already paid, amount ≤ remaining
- Atomically: inserts `payments` row → updates `bills.paid_amount + status` → decrements `customers.pending_balance` → writes audit log
- Returns JSONB with: success, payment_id, bill_id, customer_id, bill_number, amount, paid_amount, remaining, new_status
- `bills.status` auto-derived: paid | partially_paid | unpaid

**Why**: Never allow direct client-side UPDATEs to bills/customers from payment recording — race conditions and partial failures.

## usePayments.ts hooks
- `useRecordPayment` — mutation, invalidates: bill, bill-payments, bills, payments, customer, customer-stats, customer-payments, customer-bills, customers, payment-stats, outstanding-bills, dashboard
- `usePaymentStats` — dashboard stats: totalOutstanding (sum customer.pending_balance), collectedToday (payments today), overdueBills count, overdueAmount
- `useAllPayments(page, method, dateFrom, dateTo)` — paginated
- `useOutstandingBills(page, search)` — bills IN (unpaid, partially_paid, overdue, sent), ordered by due_date
- `useDailyCollection(date)` — payments for a date
- `useMonthlyCollection(year)` — monthly aggregation Jan–Dec

## Dashboard payment stat cards
Three new cards below the core 4: Total Outstanding, Collected Today, Overdue Bills

## BillView Record Payment
- Button only shown when `remainingBalance > 0 && !['paid','cancelled'].includes(status)`
- RecordPaymentDialog inline component in BillView.tsx (not a separate file)
- Defaults amount to full remaining, method to 'cash', date to today

## CustomerStats fix
`useCustomerStats` now uses `total - paid_amount` per bill (not full bill total) for pendingAmount. Excludes cancelled bills from all stats.
