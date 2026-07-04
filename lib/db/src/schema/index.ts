import {
  pgTable,
  text,
  uuid,
  integer,
  numeric,
  boolean,
  date,
  timestamp,
  index,
  uniqueIndex,
  varchar,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Auth (Replit Auth) ───────────────────────────────────────────────────

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default("staff"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;

// ─── Shop settings ────────────────────────────────────────────────────────

export const shopSettings = pgTable("shop_settings", {
  id: integer("id").primaryKey().default(1),
  shopName: text("shop_name").notNull().default(""),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  taxNumber: text("tax_number"),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Customers ────────────────────────────────────────────────────────────

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    notes: text("notes"),
    alternateMobile: text("alternate_mobile"),
    state: text("state"),
    pincode: text("pincode"),
    gstNumber: text("gst_number"),
    birthday: date("birthday"),
    anniversary: date("anniversary"),
    lastPurchaseDate: date("last_purchase_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customers_city_idx").on(table.city),
    index("customers_state_idx").on(table.state),
  ],
);

export const customerNotes = pgTable(
  "customer_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("customer_notes_customer_idx").on(table.customerId)],
);

export const houseMappings = pgTable(
  "house_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    propertyName: text("property_name").notNull(),
    address: text("address"),
    propertyType: text("property_type").default("residential"),
    areaSqft: numeric("area_sqft", { precision: 10, scale: 2 }),
    rooms: integer("rooms"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("house_mappings_customer_idx").on(table.customerId)],
);

export const customerPhotos = pgTable(
  "customer_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    caption: text("caption"),
    houseMappingId: uuid("house_mapping_id").references(() => houseMappings.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("customer_photos_customer_idx").on(table.customerId)],
);

export const customerPaintShades = pgTable(
  "customer_paint_shades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    houseMappingId: uuid("house_mapping_id").references(() => houseMappings.id, {
      onDelete: "set null",
    }),
    brand: text("brand"),
    shadeName: text("shade_name").notNull(),
    shadeCode: text("shade_code"),
    roomArea: text("room_area"),
    appliedDate: date("applied_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("customer_paint_shades_customer_idx").on(table.customerId)],
);

// ─── Products & Inventory ─────────────────────────────────────────────────

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    sku: text("sku").notNull().unique(),
    brand: text("brand"),
    color: text("color"),
    category: text("category").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    unit: text("unit").notNull().default("liter"),
    description: text("description"),
    barcode: text("barcode"),
    shadeNumber: text("shade_number"),
    packSize: text("pack_size"),
    hsnCode: text("hsn_code"),
    shadeName: text("shade_name"),
    finish: text("finish"),
    purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).notNull().default("0"),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("products_sku_idx").on(table.sku),
    index("products_category_idx").on(table.category),
    uniqueIndex("products_barcode_idx").on(table.barcode),
  ],
);

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .unique()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("0"),
    minQuantity: numeric("min_quantity", { precision: 12, scale: 3 }).notNull().default("0"),
    reservedQuantity: numeric("reserved_quantity", { precision: 12, scale: 3 })
      .notNull()
      .default("0"),
    reorderLevel: numeric("reorder_level", { precision: 12, scale: 3 }).notNull().default("0"),
    location: text("location"),
    lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const inventoryTransactions = pgTable(
  "inventory_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    transactionType: text("transaction_type").notNull(),
    quantityChange: numeric("quantity_change", { precision: 12, scale: 3 }).notNull(),
    quantityBefore: numeric("quantity_before", { precision: 12, scale: 3 }).notNull(),
    quantityAfter: numeric("quantity_after", { precision: 12, scale: 3 }).notNull(),
    referenceType: text("reference_type"),
    referenceId: uuid("reference_id"),
    notes: text("notes"),
    performedBy: varchar("performed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("inv_tx_product_created_idx").on(table.productId, table.createdAt)],
);

// ─── Bills / Billing ──────────────────────────────────────────────────────

export const bills = pgTable(
  "bills",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    billNumber: text("bill_number").notNull().unique(),
    date: date("date").notNull().defaultNow(),
    dueDate: date("due_date"),
    status: text("status").notNull().default("draft"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    tax: numeric("tax", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    paymentMethod: text("payment_method").notNull().default("cash"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("bills_customer_id_idx").on(table.customerId),
    index("bills_status_idx").on(table.status),
    index("bills_date_idx").on(table.date),
  ],
);

export const billItems = pgTable(
  "bill_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    billId: uuid("bill_id")
      .notNull()
      .references(() => bills.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    productName: text("product_name"),
    brand: text("brand"),
    shadeNumber: text("shade_number"),
    packSize: text("pack_size"),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("0"),
    gstAmount: numeric("gst_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
  },
  (table) => [index("bill_items_bill_id_idx").on(table.billId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    billId: uuid("bill_id").references(() => bills.id, { onDelete: "set null" }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: text("payment_method").notNull().default("cash"),
    paymentDate: date("payment_date").notNull().defaultNow(),
    reference: text("reference"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payments_customer_idx").on(table.customerId),
    index("payments_bill_idx").on(table.billId),
    index("payments_date_idx").on(table.paymentDate),
  ],
);

// ─── Companies (suppliers) & Purchases ────────────────────────────────────

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    brand: text("brand"),
    contactPerson: text("contact_person"),
    mobile: text("mobile"),
    email: text("email"),
    gstin: text("gstin"),
    address: text("address"),
    creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }).notNull().default("0"),
    paymentTermsDays: integer("payment_terms_days").notNull().default(30),
    openingDue: numeric("opening_due", { precision: 14, scale: 2 }).notNull().default("0"),
    totalPurchase: numeric("total_purchase", { precision: 14, scale: 2 }).notNull().default("0"),
    totalPaid: numeric("total_paid", { precision: 14, scale: 2 }).notNull().default("0"),
    outstandingDue: numeric("outstanding_due", { precision: 14, scale: 2 }).notNull().default("0"),
    lastPurchaseDate: date("last_purchase_date"),
    lastPaymentDate: date("last_payment_date"),
    notes: text("notes"),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("companies_name_idx").on(table.name),
    index("companies_brand_idx").on(table.brand),
    index("companies_status_idx").on(table.status),
  ],
);

export const purchases = pgTable(
  "purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    invoiceNumber: text("invoice_number").notNull(),
    invoiceDate: date("invoice_date").notNull().defaultNow(),
    dueDate: date("due_date"),
    paymentMethod: text("payment_method").notNull().default("cash"),
    status: text("status").notNull().default("due"),
    subtotal: numeric("subtotal", { precision: 14, scale: 2 }).notNull().default("0"),
    gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    grandTotal: numeric("grand_total", { precision: 14, scale: 2 }).notNull().default("0"),
    paidAmount: numeric("paid_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    dueAmount: numeric("due_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("purchases_company_id_idx").on(table.companyId),
    index("purchases_invoice_date_idx").on(table.invoiceDate),
    index("purchases_status_idx").on(table.status),
  ],
);

export const purchaseItems = pgTable(
  "purchase_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull().default("1"),
    purchasePrice: numeric("purchase_price", { precision: 14, scale: 2 }).notNull().default("0"),
    gstPercent: numeric("gst_percent", { precision: 5, scale: 2 }).notNull().default("0"),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
    lineTotal: numeric("line_total", { precision: 14, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("purchase_items_purchase_id_idx").on(table.purchaseId),
    index("purchase_items_product_id_idx").on(table.productId),
  ],
);

export const purchasePayments = pgTable(
  "purchase_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseId: uuid("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    paymentDate: date("payment_date").notNull().defaultNow(),
    paymentMethod: text("payment_method").notNull().default("cash"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    reference: text("reference"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("purchase_payments_purchase_id_idx").on(table.purchaseId),
    index("purchase_payments_company_id_idx").on(table.companyId),
    index("purchase_payments_date_idx").on(table.paymentDate),
  ],
);

// ─── Audit logs ───────────────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Insert schemas ───────────────────────────────────────────────────────

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  billNumber: true,
  createdAt: true,
  updatedAt: true,
});
export const insertBillItemSchema = createInsertSchema(billItems).omit({
  id: true,
  billId: true,
  gstAmount: true,
  total: true,
});
export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});
export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPurchaseItemSchema = createInsertSchema(purchaseItems).omit({
  id: true,
  purchaseId: true,
  createdAt: true,
});
export const insertPurchasePaymentSchema = createInsertSchema(purchasePayments).omit({
  id: true,
  createdAt: true,
});
export const insertCustomerNoteSchema = createInsertSchema(customerNotes).omit({
  id: true,
  createdAt: true,
});
export const insertHouseMappingSchema = createInsertSchema(houseMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCustomerPhotoSchema = createInsertSchema(customerPhotos).omit({
  id: true,
  createdAt: true,
});
export const insertCustomerPaintShadeSchema = createInsertSchema(customerPaintShades).omit({
  id: true,
  createdAt: true,
});
export const insertShopSettingsSchema = createInsertSchema(shopSettings).omit({
  id: true,
  updatedAt: true,
});

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Inventory = typeof inventory.$inferSelect;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
export type BillItem = typeof billItems.$inferSelect;
export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Purchase = typeof purchases.$inferSelect;
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type PurchaseItem = typeof purchaseItems.$inferSelect;
export type InsertPurchaseItem = z.infer<typeof insertPurchaseItemSchema>;
export type PurchasePayment = typeof purchasePayments.$inferSelect;
export type InsertPurchasePayment = z.infer<typeof insertPurchasePaymentSchema>;
export type CustomerNote = typeof customerNotes.$inferSelect;
export type HouseMapping = typeof houseMappings.$inferSelect;
export type CustomerPhoto = typeof customerPhotos.$inferSelect;
export type CustomerPaintShade = typeof customerPaintShades.$inferSelect;
export type ShopSettings = typeof shopSettings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
