import { hojeISO } from "./format";
import type { Boleto } from "./types";

export type Grupo = "vencido" | "hoje" | "semana" | "depois" | "pago";

export const GRUPOS: { chave: Grupo; titulo: string }[] = [
  { chave: "vencido", titulo: "Vencidos" },
  { chave: "hoje", titulo: "Vencem hoje" },
  { chave: "semana", titulo: "Próximos 7 dias" },
  { chave: "depois", titulo: "Mais para frente" },
  { chave: "pago", titulo: "Pagos" },
];

/** Diferença em dias entre duas datas "AAAA-MM-DD" (b - a). */
export function diasEntre(a: string, b: string) {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86_400_000);
}

export function grupoDo(b: Boleto, hoje = hojeISO()): Grupo {
  if (b.status === "pago") return "pago";
  const dias = diasEntre(hoje, b.vencimento);
  if (dias < 0) return "vencido";
  if (dias === 0) return "hoje";
  if (dias <= 7) return "semana";
  return "depois";
}

/** Texto amigável do prazo: "venceu há 2 dias", "vence amanhã"... */
export function textoPrazo(b: Boleto, hoje = hojeISO()) {
  if (b.status === "pago") return "pago";
  const dias = diasEntre(hoje, b.vencimento);
  if (dias < -1) return `venceu há ${-dias} dias`;
  if (dias === -1) return "venceu ontem";
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `vence em ${dias} dias`;
}
