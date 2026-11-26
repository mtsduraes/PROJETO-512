import { hojeISO, quantidade } from "./format";
import { diasEntre } from "./prazos";
import { UNIDADES, type ItemEstoque } from "./types";

export type Estado = "zerado" | "baixo" | "ok";

export function estadoDo(i: ItemEstoque): Estado {
  if (i.quantidade <= 0) return "zerado";
  if (i.quantidade < i.minimo) return "baixo";
  return "ok";
}

/** Precisa comprar? (zerado ou abaixo do mínimo, só itens ativos) */
export function precisaComprar(i: ItemEstoque) {
  return i.ativo && estadoDo(i) !== "ok" && (i.minimo > 0 || i.quantidade < 0);
}

/** Quanto falta para chegar no mínimo. */
export function falta(i: ItemEstoque) {
  return Math.max(0, Math.round((i.minimo - i.quantidade) * 1000) / 1000);
}

/** Validade nos próximos 7 dias (ou já vencida), só se ainda tem o item. */
export function validadePerto(i: ItemEstoque, hoje = hojeISO()) {
  return !!i.validade && i.quantidade > 0 && diasEntre(hoje, i.validade) <= 7;
}

export function textoValidade(i: ItemEstoque, hoje = hojeISO()) {
  if (!i.validade) return "";
  const d = diasEntre(hoje, i.validade);
  if (d < 0) return "validade vencida";
  if (d === 0) return "vence hoje";
  if (d === 1) return "vence amanhã";
  return `vence em ${d} dias`;
}

export function rotuloUnidade(u: string) {
  return UNIDADES.find((x) => x.valor === u)?.rotulo ?? u;
}

/** "2,5 kg" / "3 caixa(s)" de forma natural */
export function qtdComUnidade(v: number, u: string) {
  const r = rotuloUnidade(u);
  const plural = Math.abs(v) !== 1 && !["kg", "g", "ml"].includes(r) ? (r.endsWith("a") || r.endsWith("e") || r.endsWith("o") ? r + "s" : r) : r;
  return `${quantidade(v)} ${plural}`;
}

/** Texto pronto para mandar no WhatsApp. */
export function textoListaCompras(itens: ItemEstoque[]) {
  const porGrupo = new Map<string, ItemEstoque[]>();
  for (const i of itens) porGrupo.set(i.grupo, [...(porGrupo.get(i.grupo) ?? []), i]);
  const linhas = ["*Lista de compras - 512 Gastronomia*", ""];
  for (const [grupo, lista] of porGrupo) {
    linhas.push(`*${grupo}*`);
    for (const i of lista) linhas.push(`- ${i.nome}: ${qtdComUnidade(falta(i), i.unidade)}`);
    linhas.push("");
  }
  return linhas.join("\n").trim();
}
