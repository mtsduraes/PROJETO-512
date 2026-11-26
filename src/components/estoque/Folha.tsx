"use client";

/** Janela que sobe de baixo no celular e fica no centro no notebook. */
export function Folha({ titulo, onFechar, children, larga }: { titulo: string; onFechar: () => void; children: React.ReactNode; larga?: boolean }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center" onClick={onFechar}>
      <div
        role="dialog"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className={`folha max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-superficie p-5 shadow-xl md:rounded-2xl ${larga ? "max-w-lg" : "max-w-md"}`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <button type="button" onClick={onFechar} className="text-2xl leading-none text-tinta-suave/80" aria-label="Fechar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
