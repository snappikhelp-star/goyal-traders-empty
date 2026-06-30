import { supabase } from "@/lib/supabase";
import { DEFAULT_SHOP_PROFILE } from "@/lib/shopProfile";

// ─── Backup format ───────────────────────────────────────────────────────
// A backup file is a single JSON document. Bumping FORMAT_VERSION will
// invalidate older files; validation rejects unknown versions.

export const BACKUP_FORMAT = "goyal-traders-backup";
export const BACKUP_VERSION = 1;

/** Tables included in a backup, in the order they will be restored.
 *  Order matters: parents (customers, products) before children
 *  (bills, bill_items, payments). */
export const BACKUP_TABLES = [
  "customers",
  "products",
  "suppliers",
  "bills",
  "bill_items",
  "payments",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exported_at: string;
  shop: {
    name: string;
    gstin: string;
  };
  counts: Record<BackupTable, number>;
  data: Record<BackupTable, Row[]>;
}

export interface RestoreReport {
  table: BackupTable;
  inserted: number;
  failed: number;
  error?: string;
}

// ─── Export ──────────────────────────────────────────────────────────────

async function fetchAll(table: BackupTable): Promise<Row[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).from(table).select("*");
  if (error) {
    // Surface "table does not exist" gracefully — return [] so backups still
    // succeed if e.g. `suppliers` hasn't been provisioned yet.
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("does not exist") || msg.includes("not found")) {
      console.warn(`[backup] table "${table}" missing — exporting as empty.`);
      return [];
    }
    throw new Error(`Failed to read ${table}: ${error.message}`);
  }
  return (data ?? []) as Row[];
}

export async function createBackup(): Promise<BackupFile> {
  const data = {} as Record<BackupTable, Row[]>;
  const counts = {} as Record<BackupTable, number>;
  for (const table of BACKUP_TABLES) {
    const rows = await fetchAll(table);
    data[table] = rows;
    counts[table] = rows.length;
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exported_at: new Date().toISOString(),
    shop: {
      name: DEFAULT_SHOP_PROFILE.shop_name,
      gstin: DEFAULT_SHOP_PROFILE.gstin,
    },
    counts,
    data,
  };
}

export function backupToBlob(backup: BackupFile): Blob {
  return new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
}

export function backupFileName(backup: BackupFile): string {
  const ts = backup.exported_at.replace(/[:.]/g, "-").slice(0, 19);
  return `goyal-traders-backup-${ts}.json`;
}

export function downloadBackup(backup: BackupFile): void {
  const blob = backupToBlob(backup);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = backupFileName(backup);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Firefox actually fires the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Validate uploaded file ──────────────────────────────────────────────

export interface ValidationResult {
  ok: boolean;
  backup?: BackupFile;
  error?: string;
}

export async function readAndValidateBackup(
  file: File,
): Promise<ValidationResult> {
  if (!file) return { ok: false, error: "No file selected." };
  if (!file.name.toLowerCase().endsWith(".json")) {
    return { ok: false, error: "File must be a .json backup." };
  }
  // Hard upper bound to prevent accidental huge uploads (50 MB).
  if (file.size > 50 * 1024 * 1024) {
    return { ok: false, error: "Backup file is too large (>50 MB)." };
  }

  let text: string;
  try {
    text = await file.text();
  } catch (e) {
    return {
      ok: false,
      error: `Could not read file: ${(e as Error).message}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, error: "Backup file is empty or malformed." };
  }
  const obj = parsed as Partial<BackupFile>;

  if (obj.format !== BACKUP_FORMAT) {
    return {
      ok: false,
      error: `Unrecognised backup format "${String(obj.format)}". Expected "${BACKUP_FORMAT}".`,
    };
  }
  if (obj.version !== BACKUP_VERSION) {
    return {
      ok: false,
      error: `Unsupported backup version ${String(obj.version)}. This build supports version ${BACKUP_VERSION}.`,
    };
  }
  if (!obj.data || typeof obj.data !== "object") {
    return { ok: false, error: "Backup is missing the `data` section." };
  }
  for (const t of BACKUP_TABLES) {
    if (!Array.isArray(obj.data[t])) {
      return {
        ok: false,
        error: `Backup is missing required table "${t}" or it is not an array.`,
      };
    }
  }

  return { ok: true, backup: obj as BackupFile };
}

// ─── Restore ─────────────────────────────────────────────────────────────
//
// Strategy: delete all rows in each target table in child-first order, then
// insert from the backup in parent-first order. Supabase has no transactional
// REST endpoint, so each table is its own best-effort operation and we
// return a per-table report.

const DELETE_ORDER: BackupTable[] = [
  "payments",
  "bill_items",
  "bills",
  "customers",
  "products",
  "suppliers",
];

async function deleteAll(table: BackupTable): Promise<{ error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from(table)
    .delete()
    .not("id", "is", null);
  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("does not exist") || msg.includes("not found")) {
      return {};
    }
    return { error: error.message };
  }
  return {};
}

async function insertChunked(
  table: BackupTable,
  rows: Row[],
): Promise<RestoreReport> {
  let inserted = 0;
  let failed = 0;
  let firstError: string | undefined;
  const CHUNK = 200;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const slice = rows.slice(i, i + CHUNK);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from(table).insert(slice);
    if (error) {
      failed += slice.length;
      firstError ??= error.message;
    } else {
      inserted += slice.length;
    }
  }
  return { table, inserted, failed, error: firstError };
}

export async function restoreBackup(
  backup: BackupFile,
): Promise<RestoreReport[]> {
  // 1. Delete in child-first order (so foreign keys don't block parents).
  for (const t of DELETE_ORDER) {
    const { error } = await deleteAll(t);
    if (error) {
      console.warn(`[restore] could not clear ${t}:`, error);
    }
  }

  // 2. Insert in parent-first order (BACKUP_TABLES default order).
  const reports: RestoreReport[] = [];
  for (const t of BACKUP_TABLES) {
    const rows = backup.data[t] ?? [];
    if (rows.length === 0) {
      reports.push({ table: t, inserted: 0, failed: 0 });
      continue;
    }
    const report = await insertChunked(t, rows);
    reports.push(report);
  }
  return reports;
}
