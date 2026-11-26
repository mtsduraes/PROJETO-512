"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDados } from "@/components/useDados";
import { listarCategorias, salvarCategoria } from "@/lib/dados";
import type { Categoria, Tipo } from "@/lib/types";

export default function Categorias() {
  const { dados, erro, recarregar } = useDados(listarCategorias, []);
  const [falha, setFalha] = useState("");

  async function executar(acao: () => Promise<void>) {
    setFalha("");
    try {
      await acao();
      recarregar();
    } catch (e) {
      setFalha((e as Error).message);
    }
  }

  return (
    <AppShell>
      <h1 className="mb-1 text-xl font-semibold">Categorias</h1>
      <p className="mb-4 text-sm text-tinta-suave">
        Organize de onde vem e para onde vai o dinheiro. Categorias desativadas somem do formulário, mas os lançamentos antigos continuam com elas.
      </p>
      {(erro || falha) && <p className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{erro || falha}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {(["entrada", "saida"] as Tipo[]).map((tipo) => (
          <Lista key={tipo} tipo={tipo} itens={(dados ?? []).filter((c) => c.tipo === tipo)} executar={executar} />
        ))}
      </div>
    </AppShell>
  );
}

function Lista({ tipo, itens, executar }: { tipo: Tipo; itens: Categoria[]; executar: (a: () => Promise<void>) => void }) {
  const [nova, setNova] = useState("");

  function adicionar(e: React.FormEvent) {
    e.preventDefault();
    const nome = nova.trim();
    if (!nome) return;
    setNova("");
    executar(() => salvarCategoria({ nome, tipo, ativa: true }));
  }

  function renomear(c: Categoria) {
    const nome = window.prompt("Novo nome da categoria:", c.nome)?.trim();
    if (nome && nome !== c.nome) executar(() => salvarCategoria({ ...c, nome }));
  }

  return (
    <section className="rounded-xl border border-linha bg-white p-4">
      <h2 className={`mb-3 font-semibold ${tipo === "entrada" ? "text-jade-texto" : "text-ambar-texto"}`}>
        {tipo === "entrada" ? "↑ Entradas" : "↓ Saídas"}
      </h2>
      <ul className="divide-y divide-linha/60">
        {itens.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 py-2">
            <span className={c.ativa ? "" : "text-tinta-suave/60 line-through"}>{c.nome}</span>
            <span className="flex gap-3 text-sm">
              <button onClick={() => renomear(c)} className="text-tinta-suave underline underline-offset-2">
                Renomear
              </button>
              <button onClick={() => executar(() => salvarCategoria({ ...c, ativa: !c.ativa }))} className="text-tinta-suave underline underline-offset-2">
                {c.ativa ? "Desativar" : "Reativar"}
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={adicionar} className="mt-3 flex gap-2">
        <input
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder="Nova categoria"
          className="min-w-0 flex-1 rounded-lg border border-linha px-3 py-2"
        />
        <button className="rounded-lg bg-tinta px-4 py-2 font-medium text-white">Adicionar</button>
      </form>
    </section>
  );
}
