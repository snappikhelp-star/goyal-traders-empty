import { supabase } from "./supabase";
import type { Database } from "./database.types";

type DBTables = Database["public"]["Tables"];

/**
 * Typed helper for INSERT + returning the created row.
 *
 * Supabase v2 infers `.insert()` arguments as `never[]` in certain
 * TypeScript configurations. These helpers contain the `as any` bypass
 * in one place so call-site values remain fully type-checked.
 */
export async function dbInsert<T extends keyof DBTables>(
  table: T,
  values: DBTables[T]["Insert"]
): Promise<{ data: DBTables[T]["Row"] | null; error: { message: string } | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (supabase.from(table) as any).insert(values).select().single();
  return result as { data: DBTables[T]["Row"] | null; error: { message: string } | null };
}

/**
 * Typed helper for UPDATE by id + returning the updated row.
 *
 * Same Supabase v2 limitation applies to `.update()` — it infers the
 * argument as `never` when the generic Database type is used.
 */
export async function dbUpdate<T extends keyof DBTables>(
  table: T,
  id: string,
  values: DBTables[T]["Update"]
): Promise<{ data: DBTables[T]["Row"] | null; error: { message: string } | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (supabase.from(table) as any).update(values).eq("id", id).select().single();
  return result as { data: DBTables[T]["Row"] | null; error: { message: string } | null };
}
