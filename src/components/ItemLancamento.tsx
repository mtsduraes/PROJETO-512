import { dataBR, dinheiro } from "@/lib/format";
import { rotuloForma, type Categoria, type Lancamento } from "@/lib/types";

export function ItemLancamento({ l, categorias, onClick }: { l: Lancamento; categorias: Categoria[]; onClick: () => void }) {
  const cat = categorias.find((c) => c.id === l.categoria_id);
  const entrada = l.tipo === "entrada";
  return (
    <li>
      <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-porcelana">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
            entrada ? "bg-jade-claro text-jade-texto" : "bg-ambar-claro text-ambar-texto"
          }`}
          aria-label={entrada ? "Entrada" : "Saída"}
        >
          {entrada ? "↑" : "↓"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-tinta">{l.descricao || cat?.nome || "Sem descrição"}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tinta-suave/80">
            <span className="tabular-nums">{dataBR(l.data).slice(0, 5)}</span>
            <span className="rounded bg-porcelana px-1.5 py-0.5 text-tinta-suave">{cat?.nome ?? "Sem categoria"}</span>
            <span>{rotuloForma(l.forma_pagamento)}</span>
          </span>
        </span>
        <span className="text-right">
          <span className={`block font-semibold tabular-nums ${entrada ? "text-jade-texto" : "text-ambar-texto"}`}>
            {entrada ? "+" : "−"} {dinheiro(l.valor)}
          </span>
          {l.status === "pendente" && (
            <span className="mt-0.5 inline-block rounded-full bg-ambar-claro px-2 py-0.5 text-[11px] font-medium text-ambar-texto">
              {entrada ? "a receber" : "a pagar"}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
