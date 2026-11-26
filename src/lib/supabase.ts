import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Aceita o nome antigo (anon key) ou o novo (publishable key) que o Supabase mostra no botão "Connect".
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

/** Sem as chaves do Supabase, o painel roda em "modo demonstração" (dados só neste aparelho). */
export const modoDemo = !url || !key;

let cliente: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (modoDemo) throw new Error("Supabase não configurado");
  if (!cliente) cliente = createBrowserClient(url!, key!);
  return cliente;
}
