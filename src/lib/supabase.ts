import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Sem as chaves do Supabase, o painel roda em "modo demonstração" (dados só neste aparelho). */
export const modoDemo = !url || !key;

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (modoDemo) throw new Error("Supabase não configurado");
  if (!cliente) cliente = createBrowserClient(url!, key!);
  return cliente;
}
