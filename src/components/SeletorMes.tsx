"use client";

import { mesLongo, somarMes } from "@/lib/format";

export function SeletorMes({ mes, onChange }: { mes: string; onChange: (m: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(somarMes(mes, -1))}
        className="grid size-10 place-items-center rounded-full border border-linha bg-white text-lg hover:bg-porcelana"
        aria-label="Mês anterior"
      >
        ‹
      </button>
      <span className="min-w-40 text-center font-medium">{mesLongo(mes)}</span>
      <button
        onClick={() => onChange(somarMes(mes, 1))}
        className="grid size-10 place-items-center rounded-full border border-linha bg-white text-lg hover:bg-porcelana"
        aria-label="Próximo mês"
      >
        ›
      </button>
    </div>
  );
}
