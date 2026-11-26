"use client";

import { useState } from "react";
import { falta, qtdComUnidade, textoListaCompras } from "@/lib/estoque";
import { quantidade } from "@/lib/format";
import type { ItemEstoque } from "@/lib/types";
import { Folha } from "./Folha";

export function ListaCompras({ itens, onFechar }: { itens: ItemEstoque[]; onFechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const texto = textoListaCompras(itens);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      window.prompt("Copie a lista abaixo:", texto);
    }
  }

  return (
    <Folha titulo="Lista de compras" onFechar={onFechar}>
      {itens.length === 0 ? (
        <p className="text-sm text-tinta-suave">Nada abaixo do mínimo. O estoque está em dia!</p>
      ) : (
        <>
          <p className="mb-3 text-sm text-tinta-suave">Itens abaixo do mínimo e quanto falta para chegar nele.</p>
          <ul className="divide-y divide-linha/60 rounded-xl border border-linha">
            {itens.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{i.nome}</span>
                  <span className="block text-xs text-tinta-suave">
                    tem {quantidade(Math.max(0, i.quantidade))}, mínimo {quantidade(i.minimo)}
                  </span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{qtdComUnidade(falta(i), i.unidade)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={copiar} className="rounded-lg border border-linha py-3 font-medium hover:bg-porcelana">
              {copiado ? "Copiado ✓" : "Copiar lista"}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-jade py-3 text-center font-semibold text-white hover:brightness-110"
            >
              Mandar no WhatsApp
            </a>
          </div>
        </>
      )}
    </Folha>
  );
}
