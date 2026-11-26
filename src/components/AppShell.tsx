"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { modoDemo } from "@/lib/supabase";
import { BotaoTema } from "./BotaoTema";

function Icone({ nome }: { nome: "inicio" | "lancamentos" | "agenda" | "boletos" | "estoque" | "categorias" }) {
  const comum = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden {...comum}>
      {nome === "inicio" && (
        <>
          <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" />
        </>
      )}
      {nome === "lancamentos" && (
        <>
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <path d="M9 8.5h6M9 12h6M9 15.5h3.5" />
        </>
      )}
      {nome === "agenda" && (
        <>
          <rect x="4" y="5" width="16" height="15.5" rx="2" />
          <path d="M4 10h16M8.5 3v4M15.5 3v4" />
          <circle cx="12" cy="15" r="1.3" />
        </>
      )}
      {nome === "boletos" && (
        <>
          <path d="M5 3.5h14v17l-2.3-1.5-2.4 1.5-2.3-1.5-2.3 1.5-2.4-1.5L5 20.5z" />
          <path d="M8.5 8v5M10.5 8v5M13 8v5M15.5 8v5M8.5 16h7" />
        </>
      )}
      {nome === "estoque" && (
        <>
          <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z" />
          <path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" />
        </>
      )}
      {nome === "categorias" && (
        <>
          <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.3 7.3a1 1 0 0 1-1.4 0z" />
          <circle cx="8" cy="8" r="1.4" />
        </>
      )}
    </svg>
  );
}

const ABAS = [
  { href: "/", rotulo: "Início", icone: "inicio" },
  { href: "/lancamentos", rotulo: "Lançamentos", icone: "lancamentos" },
  { href: "/agenda", rotulo: "Agenda", icone: "agenda" },
  { href: "/boletos", rotulo: "Boletos", icone: "boletos" },
  { href: "/estoque", rotulo: "Estoque", icone: "estoque" },
  { href: "/categorias", rotulo: "Categorias", icone: "categorias" },
] as const;

// No celular cabem 5 abas: Categorias fica no topo da tela de Lançamentos.
const ABAS_CELULAR = ABAS.filter((a) => a.href !== "/categorias");

export function Marca() {
  return (
    <span className="flex items-center gap-3">
      <span
        className="font-display grid size-10 place-items-center rounded-full bg-floresta text-[0.95rem] font-bold tracking-tight text-papel"
        style={{ fontVariationSettings: '"SOFT" 0, "opsz" 72' }}
        aria-hidden
      >
        512
      </span>
      <span className="leading-tight">
        <span className="font-display block text-lg font-semibold tracking-tight">Caderno de Caixa</span>
        <span className="block text-xs text-tinta-suave">512 Gastronomia e Eventos</span>
      </span>
    </span>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { usuario, sair } = useAuth();

  return (
    <div className="min-h-dvh">
      {modoDemo && (
        <div className="bg-ambar-claro px-4 py-2 text-center text-sm text-ambar-texto">
          Modo demonstração: os números são de exemplo e ficam guardados só neste aparelho.
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-linha bg-porcelana/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" aria-label="Caderno de Caixa, início">
            <Marca />
          </Link>
          <nav className="ml-auto hidden gap-1 md:flex" aria-label="Principal">
            {ABAS.map((a) => (
              <Link
                key={a.href}
                href={a.href}
                aria-current={pathname === a.href ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  pathname === a.href ? "bg-tinta text-porcelana" : "text-tinta-suave hover:bg-superficie"
                }`}
              >
                {a.rotulo}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <BotaoTema />
            {!modoDemo && usuario && (
              <button onClick={sair} className="text-sm text-tinta-suave underline-offset-2 hover:underline">
                Sair
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-5 pb-36 md:pb-28">{children}</main>

      {/* Barra de abas no celular */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-linha bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {ABAS_CELULAR.map((a) => {
          const ativa = pathname === a.href;
          return (
            <Link
              key={a.href}
              href={a.href}
              aria-current={ativa ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 pt-2 pb-2.5 text-[11px] ${ativa ? "font-semibold text-jade-texto" : "text-tinta-suave/80"}`}
            >
              <Icone nome={a.icone} />
              {a.rotulo}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
