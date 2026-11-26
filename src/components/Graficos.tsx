"use client";

import { useState } from "react";
import { dinheiro, mesCurto, mesLongo } from "@/lib/format";
import type { ResumoMes } from "@/lib/types";

/** Barras agrupadas: entradas x saídas dos últimos meses (só valores já pagos/recebidos). */
export function GraficoMensal({ dados }: { dados: ResumoMes[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const [verTabela, setVerTabela] = useState(false);
  const maximo = Math.max(1, ...dados.flatMap((d) => [d.entradas, d.saidas]));
  const ALTURA = 180;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-4 text-sm text-tinta-suave" aria-hidden>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-entrada" /> Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-saida" /> Saídas
          </span>
        </div>
        <button onClick={() => setVerTabela((v) => !v)} className="text-sm text-tinta-suave underline underline-offset-2">
          {verTabela ? "Ver gráfico" : "Ver tabela"}
        </button>
      </div>

      {verTabela ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-tinta-suave/80">
              <th className="py-1 font-medium">Mês</th>
              <th className="py-1 text-right font-medium">Entradas</th>
              <th className="py-1 text-right font-medium">Saídas</th>
              <th className="py-1 text-right font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {dados.map((d) => (
              <tr key={d.mes} className="border-t border-linha/60">
                <td className="py-1.5">{mesCurto(d.mes)}</td>
                <td className="py-1.5 text-right tabular-nums">{dinheiro(d.entradas)}</td>
                <td className="py-1.5 text-right tabular-nums">{dinheiro(d.saidas)}</td>
                <td className="py-1.5 text-right font-medium tabular-nums">{dinheiro(d.entradas - d.saidas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative">
          <div
            className="relative grid items-end gap-2 border-b border-linha"
            style={{ height: ALTURA, gridTemplateColumns: `repeat(${dados.length}, minmax(0, 1fr))` }}
            role="img"
            aria-label="Gráfico de entradas e saídas por mês. Use 'Ver tabela' para os números."
          >
            {/* linhas de grade discretas */}
            {[0.25, 0.5, 0.75].map((f) => (
              <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-linha/60" style={{ bottom: f * ALTURA }} />
            ))}
            {dados.map((d, i) => (
              <div
                key={d.mes}
                className={`relative z-10 flex h-full items-end justify-center gap-[2px] rounded-t-md ${ativo === i ? "bg-porcelana" : ""}`}
                onMouseEnter={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
                onClick={() => setAtivo(ativo === i ? null : i)}
              >
                <div className="w-full max-w-6 rounded-t bg-entrada" style={{ height: (d.entradas / maximo) * ALTURA }} />
                <div className="w-full max-w-6 rounded-t bg-saida" style={{ height: (d.saidas / maximo) * ALTURA }} />
              </div>
            ))}
          </div>
          <div className="mt-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${dados.length}, minmax(0, 1fr))` }}>
            {dados.map((d) => (
              <span key={d.mes} className="text-center text-xs text-tinta-suave/80">
                {mesCurto(d.mes)}
              </span>
            ))}
          </div>
          {ativo !== null && (
            <div
              className="pointer-events-none absolute top-0 z-20 w-48 -translate-x-1/2 rounded-lg border border-linha bg-superficie p-3 text-sm shadow-lg"
              style={{ left: `clamp(6rem, ${((ativo + 0.5) / dados.length) * 100}%, calc(100% - 6rem))` }}
            >
              <div className="mb-1 font-medium">{mesLongo(dados[ativo].mes)}</div>
              <div className="flex justify-between gap-2">
                <span className="flex items-center gap-1.5 text-tinta-suave">
                  <span className="size-2.5 rounded-sm bg-entrada" /> Entradas
                </span>
                <span className="tabular-nums">{dinheiro(dados[ativo].entradas)}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="flex items-center gap-1.5 text-tinta-suave">
                  <span className="size-2.5 rounded-sm bg-saida" /> Saídas
                </span>
                <span className="tabular-nums">{dinheiro(dados[ativo].saidas)}</span>
              </div>
              <div className="mt-1 flex justify-between gap-2 border-t border-linha/60 pt-1 font-medium">
                <span>Resultado</span>
                <span className="tabular-nums">{dinheiro(dados[ativo].entradas - dados[ativo].saidas)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Barras horizontais de uma série: quanto cada categoria somou no mês. */
export function BarrasCategoria({ itens, cor }: { itens: { nome: string; total: number }[]; cor: "entrada" | "saida" }) {
  const total = itens.reduce((s, i) => s + i.total, 0);
  const maximo = Math.max(1, ...itens.map((i) => i.total));
  if (itens.length === 0) return <p className="text-sm text-tinta-suave/80">Nada lançado neste mês.</p>;
  return (
    <ul className="space-y-2.5">
      {itens.map((i) => (
        <li key={i.nome} title={`${i.nome}: ${dinheiro(i.total)} (${Math.round((i.total / total) * 100)}%)`}>
          <div className="mb-1 flex justify-between gap-2 text-sm">
            <span className="text-tinta">{i.nome}</span>
            <span className="tabular-nums text-tinta-suave">
              {dinheiro(i.total)} <span className="ml-1 text-tinta-suave/60">{Math.round((i.total / total) * 100)}%</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-porcelana">
            <div className={`h-2 rounded-full ${cor === "entrada" ? "bg-entrada" : "bg-saida"}`} style={{ width: `${(i.total / maximo) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
