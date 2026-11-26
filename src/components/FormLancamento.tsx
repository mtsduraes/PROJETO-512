"use client";

import Link from "next/link";
import { useState } from "react";
import { hojeISO, lerValor } from "@/lib/format";
import { salvarLancamento, excluirLancamento } from "@/lib/dados";
import { FORMAS_PAGAMENTO, type Categoria, type FormaPagamento, type Lancamento, type Status, type Tipo } from "@/lib/types";

interface Props {
  categorias: Categoria[];
  inicial?: Lancamento | null;
  onFechar: () => void;
  onSalvo: () => void;
}

export function FormLancamento({ categorias, inicial, onFechar, onSalvo }: Props) {
  const [tipo, setTipo] = useState<Tipo>(inicial?.tipo ?? "entrada");
  const [valor, setValor] = useState(inicial ? String(inicial.valor).replace(".", ",") : "");
  const [data, setData] = useState(inicial?.data ?? hojeISO());
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [categoriaId, setCategoriaId] = useState(inicial?.categoria_id ?? "");
  const [forma, setForma] = useState<FormaPagamento>(inicial?.forma_pagamento ?? "pix");
  const [status, setStatus] = useState<Status>(inicial?.status ?? "pago");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const opcoes = categorias.filter((c) => c.tipo === tipo && (c.ativa || c.id === categoriaId));

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const v = lerValor(valor);
    if (!Number.isFinite(v) || v <= 0) return setErro("Digite um valor maior que zero.");
    if (!categoriaId) return setErro("Escolha uma categoria.");
    setSalvando(true);
    setErro("");
    try {
      await salvarLancamento({
        id: inicial?.id,
        tipo,
        valor: Math.round(v * 100) / 100,
        data,
        descricao: descricao.trim(),
        categoria_id: categoriaId,
        forma_pagamento: forma,
        status,
      });
      onSalvo();
    } catch (err) {
      setErro("Não deu para salvar: " + (err as Error).message);
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!inicial || !window.confirm("Excluir este lançamento? Não dá para desfazer.")) return;
    setSalvando(true);
    try {
      await excluirLancamento(inicial.id);
      onSalvo();
    } catch (err) {
      setErro("Não deu para excluir: " + (err as Error).message);
      setSalvando(false);
    }
  }

  if (inicial?.boleto_id) {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center" onClick={onFechar}>
        <div onClick={(e) => e.stopPropagation()} className="folha w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl">
          <h2 className="text-lg font-semibold">Este lançamento vem de um boleto</h2>
          <p className="mt-2 text-sm text-tinta-suave">
            {inicial.descricao}. Ele é atualizado sozinho a partir do boleto. Para editar, marcar como pago ou excluir, use a aba Boletos.
          </p>
          <div className="mt-5 flex gap-2">
            <button onClick={onFechar} className="flex-1 rounded-lg border border-linha py-3 font-medium">
              Fechar
            </button>
            <Link href="/boletos" className="flex-1 rounded-lg bg-tinta py-3 text-center font-semibold text-white">
              Abrir Boletos
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const campo = "w-full rounded-lg border border-linha bg-white px-3 py-2.5 focus:border-tinta focus:outline-none";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center" onClick={onFechar}>
      <form
        onSubmit={enviar}
        onClick={(e) => e.stopPropagation()}
        className="folha max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl md:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{inicial ? "Editar lançamento" : "Novo lançamento"}</h2>
          <button type="button" onClick={onFechar} className="text-2xl leading-none text-tinta-suave/80" aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-porcelana p-1">
          {(["entrada", "saida"] as Tipo[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTipo(t);
                setCategoriaId("");
              }}
              className={`rounded-lg py-2 font-medium ${
                tipo === t ? (t === "entrada" ? "bg-jade text-white" : "bg-ambar-texto text-white") : "text-tinta-suave"
              }`}
            >
              {t === "entrada" ? "↑ Entrada" : "↓ Saída"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Valor (R$)</span>
            <input
              className={`${campo} text-xl font-semibold`}
              inputMode="decimal"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              autoFocus
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Descrição</span>
            <input
              className={campo}
              placeholder={tipo === "entrada" ? "Ex.: Casamento da Ana (sinal)" : "Ex.: Compra no atacadão"}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm text-tinta-suave">Data</span>
              <input type="date" className={campo} value={data} onChange={(e) => setData(e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-tinta-suave">Categoria</span>
              <select className={campo} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
                <option value="">Escolha…</option>
                {opcoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Forma de pagamento</span>
            <select className={campo} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.valor} value={f.valor}>
                  {f.rotulo}
                </option>
              ))}
            </select>
          </label>

          {opcoes.length === 0 && (
            <p className="rounded-lg bg-ambar-claro px-3 py-2 text-sm text-ambar-texto">
              Ainda não há categorias de {tipo === "entrada" ? "entrada" : "saída"}. Crie uma na aba{" "}
              <Link href="/categorias" className="font-medium underline">
                Categorias
              </Link>{" "}
              e volte aqui.
            </p>
          )}

          <fieldset>
            <legend className="mb-1 text-sm text-tinta-suave">Situação</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["pago", "pendente"] as Status[]).map((s) => (
                <label
                  key={s}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm ${
                    status === s ? "border-tinta bg-tinta text-white" : "border-linha"
                  }`}
                >
                  <input type="radio" name="status" className="sr-only" checked={status === s} onChange={() => setStatus(s)} />
                  {s === "pago" ? (tipo === "entrada" ? "Já recebido" : "Já pago") : tipo === "entrada" ? "A receber" : "A pagar"}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        {erro && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{erro}</p>}

        <div className="mt-5 flex gap-2">
          {inicial && (
            <button type="button" onClick={excluir} disabled={salvando} className="rounded-lg border border-rose-300 px-4 py-3 text-rose-700">
              Excluir
            </button>
          )}
          <button
            type="submit"
            disabled={salvando}
            className="flex-1 rounded-lg bg-tinta py-3 font-semibold text-white disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
