"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useDados } from "@/components/useDados";
import { DetalheItem } from "@/components/estoque/DetalheItem";
import { FormItem } from "@/components/estoque/FormItem";
import { ListaCompras } from "@/components/estoque/ListaCompras";
import { listarItens } from "@/lib/dados";
import { dinheiro, quantidade } from "@/lib/format";
import { estadoDo, precisaComprar, rotuloUnidade, textoValidade, validadePerto } from "@/lib/estoque";
import { GRUPOS_ESTOQUE, type ItemEstoque, type TipoMovimento } from "@/lib/types";

export default function Estoque() {
  const itens = useDados(listarItens, []);
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState<string>("");
  const [soAlerta, setSoAlerta] = useState(false);
  const [detalhe, setDetalhe] = useState<{ id: string; acao: TipoMovimento | null } | null>(null);
  const [form, setForm] = useState<{ aberto: boolean; item: ItemEstoque | null }>({ aberto: false, item: null });
  const [lista, setLista] = useState(false);

  const todos = useMemo(() => itens.dados ?? [], [itens.dados]);
  const ativos = todos.filter((i) => i.ativo);
  const comprar = ativos.filter(precisaComprar);
  const vencendo = ativos.filter((i) => validadePerto(i));
  const valorParado = ativos.reduce((s, i) => s + Math.max(0, i.quantidade) * i.custo_medio, 0);
  const locais = [...new Set(todos.map((i) => i.local).filter(Boolean))];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return todos.filter(
      (i) =>
        i.ativo &&
        (!grupo || i.grupo === grupo) &&
        (!termo || i.nome.toLowerCase().includes(termo) || i.local.toLowerCase().includes(termo)) &&
        (!soAlerta || precisaComprar(i) || validadePerto(i)),
    );
  }, [todos, busca, grupo, soAlerta]);

  const itemAberto = detalhe ? todos.find((i) => i.id === detalhe.id) : null;

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Estoque</h1>
          <p className="text-sm text-tinta-suave">Toque num item para registrar entrada, saída ou contagem.</p>
        </div>
        <button
          onClick={() => setForm({ aberto: true, item: null })}
          className="hidden items-center gap-2 rounded-full bg-jade px-5 py-2.5 font-semibold text-white hover:brightness-110 md:flex"
        >
          <span className="text-lg leading-none">+</span> Novo item
        </button>
      </div>

      {/* Resumo */}
      <section className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <button onClick={() => setLista(true)} className="min-w-0 rounded-xl border border-linha bg-superficie p-2.5 text-left hover:border-ambar sm:p-4">
          <p className="text-xs text-tinta-suave sm:text-sm">Para comprar</p>
          <p className={`font-display mt-0.5 text-xl font-semibold tabular-nums sm:text-2xl ${comprar.length ? "text-ambar-texto" : ""}`}>{comprar.length}</p>
          <p className="text-xs text-tinta-suave/80 underline underline-offset-2">ver lista</p>
        </button>
        <button onClick={() => setSoAlerta(true)} className="min-w-0 rounded-xl border border-linha bg-superficie p-2.5 text-left hover:border-ambar sm:p-4">
          <p className="text-xs text-tinta-suave sm:text-sm">Validade perto</p>
          <p className={`font-display mt-0.5 text-xl font-semibold tabular-nums sm:text-2xl ${vencendo.length ? "text-ambar-texto" : ""}`}>{vencendo.length}</p>
          <p className="text-xs text-tinta-suave/80">próximos 7 dias</p>
        </button>
        <div className="min-w-0 rounded-xl border border-linha bg-superficie p-2.5 sm:p-4">
          <p className="text-xs text-tinta-suave sm:text-sm">Valor guardado</p>
          <p className="font-display mt-0.5 text-[0.95rem] leading-tight font-semibold tabular-nums min-[400px]:text-lg sm:text-2xl">{dinheiro(valorParado)}</p>
          <p className="text-xs text-tinta-suave/80">{ativos.length} itens</p>
        </div>
      </section>

      {/* Filtros */}
      <div className="mb-3 space-y-2">
        <input
          className="w-full rounded-lg border border-linha bg-superficie px-3 py-2.5"
          placeholder="Buscar item ou lugar…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-sm">
          <Chip ativo={!grupo && !soAlerta} onClick={() => { setGrupo(""); setSoAlerta(false); }}>
            Todos
          </Chip>
          <Chip ativo={soAlerta} onClick={() => setSoAlerta(!soAlerta)}>
            Precisa de atenção
          </Chip>
          {GRUPOS_ESTOQUE.map((g) => (
            <Chip key={g} ativo={grupo === g} onClick={() => setGrupo(grupo === g ? "" : g)}>
              {g}
            </Chip>
          ))}
        </div>
      </div>

      {itens.erro && (
        <p className="mb-3 rounded-lg bg-erro-claro p-3 text-sm text-erro">
          Erro ao carregar: {itens.erro}
          {/estoque/.test(itens.erro) && " (o banco ainda não tem a parte de estoque: rode o arquivo 03-estoque.sql no Supabase)"}
        </p>
      )}

      {itens.dados === null ? (
        <p className="text-sm text-tinta-suave/80">Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linha bg-superficie p-6 text-center text-sm text-tinta-suave">
          {todos.length === 0 ? "Nenhum item cadastrado ainda. Comece pelo botão Novo item." : "Nenhum item encontrado com esse filtro."}
        </div>
      ) : (
        <ul className="divide-y divide-linha/60 overflow-hidden rounded-xl border border-linha bg-superficie">
          {filtrados.map((i) => (
            <LinhaItem key={i.id} i={i} onAbrir={(acao) => setDetalhe({ id: i.id, acao })} />
          ))}
        </ul>
      )}

      <button
        onClick={() => setForm({ aberto: true, item: null })}
        className="fixed right-4 bottom-[5.5rem] z-30 flex items-center gap-2 rounded-full bg-jade px-5 py-3.5 font-semibold text-white shadow-[0_6px_20px_-6px_rgba(19,102,80,.6)] hover:brightness-110 md:hidden"
      >
        <span className="text-xl leading-none">+</span> Novo item
      </button>

      {itemAberto && (
        <DetalheItem
          key={itemAberto.id}
          item={itemAberto}
          inicial={detalhe?.acao}
          onFechar={() => setDetalhe(null)}
          onMudou={() => itens.recarregar()}
          onEditar={() => {
            setDetalhe(null);
            setForm({ aberto: true, item: itemAberto });
          }}
        />
      )}
      {form.aberto && (
        <FormItem
          inicial={form.item}
          locais={locais}
          onFechar={() => setForm({ aberto: false, item: null })}
          onSalvo={(id) => {
            const novo = !form.item;
            setForm({ aberto: false, item: null });
            itens.recarregar();
            if (novo) setDetalhe({ id, acao: "entrada" });
          }}
        />
      )}
      {lista && <ListaCompras itens={comprar} onFechar={() => setLista(false)} />}
    </AppShell>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={ativo}
      className={`shrink-0 rounded-full border px-3 py-1.5 ${ativo ? "border-tinta bg-tinta text-porcelana" : "border-linha bg-superficie text-tinta-suave"}`}
    >
      {children}
    </button>
  );
}

function LinhaItem({ i, onAbrir }: { i: ItemEstoque; onAbrir: (acao: TipoMovimento | null) => void }) {
  const estado = estadoDo(i);
  const un = rotuloUnidade(i.unidade);
  const proporcao = i.minimo > 0 ? Math.min(1, Math.max(0, i.quantidade) / (i.minimo * 2)) : 1;
  const cor = estado === "ok" ? "bg-jade" : estado === "baixo" ? "bg-ambar" : "bg-erro";
  return (
    <li className="flex items-center gap-2 pr-2">
      <button onClick={() => onAbrir(null)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-porcelana">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{i.nome}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tinta-suave">
            {i.local && <span>{i.local}</span>}
            {estado !== "ok" && (
              <span className={`rounded-full px-2 py-0.5 font-medium ${estado === "baixo" ? "bg-ambar-claro text-ambar-texto" : "bg-erro-claro text-erro"}`}>
                {estado === "baixo" ? "baixo" : "acabou"}
              </span>
            )}
            {validadePerto(i) && <span className="rounded-full bg-ambar-claro px-2 py-0.5 font-medium text-ambar-texto">{textoValidade(i)}</span>}
          </span>
          {i.minimo > 0 && (
            <span className="mt-1.5 block h-1.5 w-full max-w-48 rounded-full bg-porcelana" aria-hidden>
              <span className={`block h-1.5 rounded-full ${cor}`} style={{ width: `${proporcao * 100}%` }} />
            </span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-lg font-semibold tabular-nums">{quantidade(i.quantidade)}</span>
          <span className="block text-xs text-tinta-suave">
            {un}
            {i.minimo > 0 && <> / mín. {quantidade(i.minimo)}</>}
          </span>
        </span>
      </button>
      <div className="flex shrink-0 flex-col gap-1">
        <button onClick={() => onAbrir("entrada")} aria-label={`Entrada de ${i.nome}`} className="grid size-8 place-items-center rounded-full bg-jade-claro font-bold text-jade-texto">
          +
        </button>
        <button onClick={() => onAbrir("saida")} aria-label={`Saída de ${i.nome}`} className="grid size-8 place-items-center rounded-full bg-ambar-claro font-bold text-ambar-texto">
          −
        </button>
      </div>
    </li>
  );
}
