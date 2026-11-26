"use client";

import { useEffect, useState } from "react";

type Tema = "claro" | "escuro";

/** Lê o tema já aplicado pelo script do <head> (evita "piscar" ao abrir). */
function temaAtual(): Tema {
  if (typeof document === "undefined") return "claro";
  return document.documentElement.dataset.tema === "escuro" ? "escuro" : "claro";
}

export function aplicarTema(tema: Tema) {
  document.documentElement.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", tema === "escuro" ? "#111413" : "#eef0ec");
  localStorage.setItem("tema", tema);
}

export function BotaoTema() {
  const [tema, setTema] = useState<Tema>("claro");
  useEffect(() => setTema(temaAtual()), []);

  function alternar() {
    const novo = tema === "escuro" ? "claro" : "escuro";
    aplicarTema(novo);
    setTema(novo);
  }

  const escuro = tema === "escuro";
  return (
    <button
      onClick={alternar}
      aria-label={escuro ? "Mudar para o tema claro" : "Mudar para o tema escuro"}
      title={escuro ? "Tema claro" : "Tema escuro"}
      className="flex items-center gap-1.5 rounded-full border border-linha bg-superficie px-3 py-1.5 text-sm font-medium text-tinta-suave hover:text-tinta"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
        {escuro ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
          </>
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        )}
      </svg>
      <span>{escuro ? "Claro" : "Escuro"}</span>
    </button>
  );
}
