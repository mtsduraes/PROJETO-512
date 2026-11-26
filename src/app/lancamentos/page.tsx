"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SeletorMes } from "@/components/SeletorMes";
import { FormLancamento } from "@/components/FormLancamento";
import { BotaoNovo } from "@/components/BotaoNovo";
import { ItemLancamento } from "@/components/ItemLancamento";
import { useDados } from "@/components/useDados";
import { listarCategorias, listarLancamentos } from "@/lib/dados";
import { dataBR, dinheiro, mesAtual } from "@/lib/format";
import { rotuloForma, type Categoria, type Lancamento } from "@/lib/types";

export default function Lancamentos() {
  const [mes, setMes] = useState(mesAtual());
  const [tipo, setTipo] = useState("");
  const [status, setStatus] = useState("");
  const [categoria, setCategoria] = useState("");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<{ aberto: boolean; item: Lancamento | null }>({ aberto: false, item: null });

  const categorias = useDados(listarCategorias, []);
  const lancs = useDados(() => listarLancamentos(mes), [mes]);
  const cats = categorias.dados ?? [];

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (lancs.dados ?? []).filter(
      (l) =>
        (!tipo || l.tipo === tipo) &&
        (!status || l.status === status) &&
        (!categoria || l.categoria_id === categoria) &&
        (!termo || l.descricao.toLowerCase().includes(termo)),
    );
  }, [lancs.dados, tipo, status, categoria, busca]);

  const totais = useMemo(() => {
    let entradas = 0, saidas = 0;
    for (const l of filtrados) {
      if (l.tipo === "entrada") entradas += l.valor;
      else saidas += l.valor;
    }
    return { entradas, saidas };
  }, [filtrados]);

  const filtro = "rounded-lg border border-linha bg-white px-3 py-2 text-sm";

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Lançamentos</h1>
        <SeletorMes mes={mes} onChange={setMes} />
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <input className={`${filtro} col-span-2 md:col-span-2`} placeholder="Buscar pela descrição…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select className={filtro} value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          <option value="">Entradas e saídas</option>
          <option value="entrada">Só entradas</option>
          <option value="saida">Só saídas</option>
        </select>
        <select className={filtro} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Situação">
          <option value="">Qualquer situação</option>
          <option value="pago">Pagos / recebidos</option>
          <option value="pendente">A pagar / a receber</option>
        </select>
        <select className={`${filtro} col-span-2 md:col-span-1`} value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} ({c.tipo === "entrada" ? "entrada" : "saída"})
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-tinta-suave">
          {filtrados.length} lançamento(s) ·{" "}
          <span className="text-jade-texto">entradas {dinheiro(totais.entradas)}</span> ·{" "}
          <span className="text-ambar-texto">saídas {dinheiro(totais.saidas)}</span>
        </p>
        <button
          onClick={() => exportarCSV(filtrados, cats, mes)}
          disabled={filtrados.length === 0}
          className="rounded-lg border border-linha bg-white px-3 py-2 font-medium hover:bg-porcelana disabled:opacity-50"
        >
          ⬇ Baixar planilha
        </button>
      </div>

      {(lancs.erro || categorias.erro) && (
        <p className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">Erro ao carregar: {lancs.erro || categorias.erro}</p>
      )}

      <div className="rounded-xl border border-linha bg-white">
        {lancs.dados === null ? (
          <p className="p-4 text-sm text-tinta-suave/80">Carregando…</p>
        ) : filtrados.length === 0 ? (
          <p className="p-4 text-sm text-tinta-suave/80">Nenhum lançamento encontrado.</p>
        ) : (
          <ul className="divide-y divide-linha/60">
            {filtrados.map((l) => (
              <ItemLancamento key={l.id} l={l} categorias={cats} onClick={() => setForm({ aberto: true, item: l })} />
            ))}
          </ul>
        )}
      </div>

      <BotaoNovo onClick={() => setForm({ aberto: true, item: null })} />
      {form.aberto && (
        <FormLancamento
          categorias={cats}
          inicial={form.item}
          onFechar={() => setForm({ aberto: false, item: null })}
          onSalvo={() => {
            setForm({ aberto: false, item: null });
            lancs.recarregar();
          }}
        />
      )}
    </AppShell>
  );
}

/** Gera um arquivo .csv que abre direto no Excel/Google Planilhas (formato brasileiro). */
function exportarCSV(lista: Lancamento[], cats: Categoria[], mes: string) {
  const celula = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const linhas = [
    ["Data", "Tipo", "Descrição", "Categoria", "Forma de pagamento", "Situação", "Valor (R$)"],
    ...lista.map((l) => [
      dataBR(l.data),
      l.tipo === "entrada" ? "Entrada" : "Saída",
      l.descricao,
      cats.find((c) => c.id === l.categoria_id)?.nome ?? "",
      rotuloForma(l.forma_pagamento),
      l.status === "pago" ? (l.tipo === "entrada" ? "Recebido" : "Pago") : l.tipo === "entrada" ? "A receber" : "A pagar",
      (l.tipo === "entrada" ? l.valor : -l.valor).toFixed(2).replace(".", ","),
    ]),
  ];
  const csv = "﻿" + linhas.map((l) => l.map(celula).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `caixa-${mes}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
