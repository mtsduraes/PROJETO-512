"use client";

import { useState } from "react";
import { lerValor } from "@/lib/format";
import { salvarItem } from "@/lib/dados";
import { GRUPOS_ESTOQUE, UNIDADES, type GrupoEstoque, type ItemEstoque } from "@/lib/types";
import { Folha } from "./Folha";

interface Props {
  inicial?: ItemEstoque | null;
  locais: string[];
  onFechar: () => void;
  onSalvo: (id: string) => void;
}

export function FormItem({ inicial, locais, onFechar, onSalvo }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? "");
  const [grupo, setGrupo] = useState<GrupoEstoque>(inicial?.grupo ?? "Ingredientes");
  const [unidade, setUnidade] = useState(inicial?.unidade ?? "un");
  const [local, setLocal] = useState(inicial?.local ?? "");
  const [minimo, setMinimo] = useState(inicial ? String(inicial.minimo).replace(".", ",") : "");
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const min = minimo.trim() ? lerValor(minimo) : 0;
    if (!nome.trim()) return setErro("Dê um nome ao item.");
    if (!Number.isFinite(min) || min < 0) return setErro("O estoque mínimo precisa ser um número (pode ser 0).");
    setSalvando(true);
    setErro("");
    try {
      const id = await salvarItem({ id: inicial?.id, nome: nome.trim(), grupo, unidade, local: local.trim(), minimo: min, ativo });
      onSalvo(id);
    } catch (err) {
      setErro("Não deu para salvar: " + (err as Error).message);
      setSalvando(false);
    }
  }

  const campo = "w-full rounded-lg border border-linha bg-superficie px-3 py-2.5 focus:border-jade focus:outline-none";

  return (
    <Folha titulo={inicial ? "Editar item" : "Novo item"} onFechar={onFechar}>
      <form onSubmit={enviar} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm text-tinta-suave">Nome</span>
          <input className={campo} placeholder="Ex.: Farinha de trigo" value={nome} onChange={(e) => setNome(e.target.value)} autoFocus={!inicial} required />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Grupo</span>
            <select className={campo} value={grupo} onChange={(e) => setGrupo(e.target.value as GrupoEstoque)}>
              {GRUPOS_ESTOQUE.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Unidade</span>
            <select className={campo} value={unidade} onChange={(e) => setUnidade(e.target.value)}>
              {UNIDADES.map((u) => (
                <option key={u.valor} value={u.valor}>
                  {u.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Onde fica</span>
            <input className={campo} list="locais" placeholder="Ex.: Despensa" value={local} onChange={(e) => setLocal(e.target.value)} />
            <datalist id="locais">
              {[...new Set(["Despensa", "Geladeira", "Freezer", "Depósito", ...locais])].map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Estoque mínimo</span>
            <input className={campo} inputMode="decimal" placeholder="0" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
          </label>
        </div>
        <p className="text-xs text-tinta-suave/80">Quando a quantidade ficar abaixo do mínimo, o item entra na lista de compras.</p>

        {inicial && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!ativo} onChange={(e) => setAtivo(!e.target.checked)} className="size-4 accent-[var(--jade)]" />
            Não uso mais este item (esconde da lista)
          </label>
        )}

        {erro && <p className="rounded-lg bg-erro-claro px-3 py-2 text-sm text-erro">{erro}</p>}

        <button type="submit" disabled={salvando} className="w-full rounded-lg bg-tinta py-3 font-semibold text-porcelana disabled:opacity-60">
          {salvando ? "Salvando…" : inicial ? "Salvar item" : "Cadastrar item"}
        </button>
        {!inicial && <p className="text-center text-xs text-tinta-suave/80">Depois de cadastrar, registre a primeira entrada com a quantidade que vocês têm hoje.</p>}
      </form>
    </Folha>
  );
}
