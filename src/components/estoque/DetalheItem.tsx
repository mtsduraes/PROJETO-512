"use client";

import { useState } from "react";
import { useDados } from "@/components/useDados";
import { excluirMovimento, listarMovimentos, proximosEventos, registrarMovimento } from "@/lib/dados";
import { dataBR, dinheiro, hojeISO, lerValor, quantidade } from "@/lib/format";
import { estadoDo, qtdComUnidade, rotuloUnidade, textoValidade, validadePerto } from "@/lib/estoque";
import type { ItemEstoque, MovimentoEstoque, TipoMovimento } from "@/lib/types";
import { Folha } from "./Folha";

interface Props {
  item: ItemEstoque;
  inicial?: TipoMovimento | null;
  onFechar: () => void;
  onMudou: () => void;
  onEditar: () => void;
}

const ACOES: { tipo: TipoMovimento; rotulo: string; dica: string }[] = [
  { tipo: "entrada", rotulo: "+ Entrada", dica: "Comprou ou recebeu" },
  { tipo: "saida", rotulo: "− Saída", dica: "Usou ou saiu" },
  { tipo: "ajuste", rotulo: "Contagem", dica: "Contou e corrige" },
];

export function DetalheItem({ item, inicial, onFechar, onMudou, onEditar }: Props) {
  const [acao, setAcao] = useState<TipoMovimento | null>(inicial ?? null);
  const historico = useDados(() => listarMovimentos(item.id), [item.id, item.quantidade]);
  const estado = estadoDo(item);
  const un = rotuloUnidade(item.unidade);

  async function desfazer(m: MovimentoEstoque) {
    const extra = m.lancamento_id ? " A compra lançada no caixa também será apagada." : "";
    if (!window.confirm(`Desfazer esta movimentação?${extra}`)) return;
    await excluirMovimento(m);
    onMudou();
  }

  return (
    <Folha titulo={item.nome} onFechar={onFechar} larga>
      <div className="flex items-end justify-between gap-3 rounded-xl bg-porcelana p-4">
        <div>
          <p className="text-sm text-tinta-suave">Tem agora</p>
          <p className={`font-display text-3xl font-semibold tabular-nums ${estado === "ok" ? "" : estado === "baixo" ? "text-ambar-texto" : "text-erro"}`}>
            {quantidade(item.quantidade)} <span className="text-lg">{un}</span>
          </p>
          <p className="mt-1 text-xs text-tinta-suave">
            Mínimo {quantidade(item.minimo)} {un}
            {item.local && <> · {item.local}</>}
          </p>
        </div>
        <div className="text-right text-xs text-tinta-suave">
          {item.custo_medio > 0 && (
            <>
              <p>Preço médio {dinheiro(item.custo_medio)}/{un}</p>
              <p className="font-medium text-tinta">Vale {dinheiro(Math.max(0, item.quantidade) * item.custo_medio)}</p>
            </>
          )}
          {item.validade && <p className={validadePerto(item) ? "font-medium text-ambar-texto" : ""}>Validade {dataBR(item.validade)} ({textoValidade(item)})</p>}
          <button onClick={onEditar} className="mt-1 underline underline-offset-2">
            Editar item
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2" role="tablist">
        {ACOES.map((a) => (
          <button
            key={a.tipo}
            role="tab"
            aria-selected={acao === a.tipo}
            onClick={() => setAcao(acao === a.tipo ? null : a.tipo)}
            className={`rounded-xl border px-2 py-2.5 text-center ${
              acao === a.tipo ? "border-tinta bg-tinta text-porcelana" : "border-linha hover:bg-porcelana"
            }`}
          >
            <span className="block font-semibold">{a.rotulo}</span>
            <span className={`block text-[11px] ${acao === a.tipo ? "opacity-80" : "text-tinta-suave"}`}>{a.dica}</span>
          </button>
        ))}
      </div>

      {acao && (
        <FormMovimento
          key={acao}
          item={item}
          tipo={acao}
          onSalvo={() => {
            setAcao(null);
            onMudou();
          }}
        />
      )}

      <h3 className="mt-6 mb-2 text-sm font-semibold text-tinta-suave">Histórico</h3>
      {historico.dados === null ? (
        <p className="text-sm text-tinta-suave/80">Carregando…</p>
      ) : historico.dados.length === 0 ? (
        <p className="text-sm text-tinta-suave/80">Nenhuma movimentação ainda. Comece com uma entrada da quantidade que vocês têm hoje.</p>
      ) : (
        <ul className="divide-y divide-linha/60 rounded-xl border border-linha">
          {historico.dados.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  m.tipo === "entrada" ? "bg-jade-claro text-jade-texto" : m.tipo === "saida" ? "bg-ambar-claro text-ambar-texto" : "bg-porcelana text-tinta-suave"
                }`}
                aria-hidden
              >
                {m.tipo === "entrada" ? "+" : m.tipo === "saida" ? "−" : "="}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {m.tipo === "entrada" ? "Entrada" : m.tipo === "saida" ? "Saída" : "Contagem"}: {m.tipo === "ajuste" ? "ficou " : ""}
                  {qtdComUnidade(m.quantidade, item.unidade)}
                </span>
                <span className="block truncate text-xs text-tinta-suave">
                  {dataBR(m.data)}
                  {m.motivo && <> · {m.motivo}</>}
                  {m.custo_unitario !== null && m.tipo === "entrada" && <> · {dinheiro(m.quantidade * m.custo_unitario)}</>}
                  {m.lancamento_id && <> · lançado no caixa</>}
                </span>
              </span>
              <button onClick={() => desfazer(m)} className="shrink-0 text-xs text-tinta-suave underline underline-offset-2">
                Desfazer
              </button>
            </li>
          ))}
        </ul>
      )}
    </Folha>
  );
}

function FormMovimento({ item, tipo, onSalvo }: { item: ItemEstoque; tipo: TipoMovimento; onSalvo: () => void }) {
  const [qtd, setQtd] = useState("");
  const [total, setTotal] = useState("");
  const [lancar, setLancar] = useState(true);
  const [validade, setValidade] = useState("");
  const [motivo, setMotivo] = useState("");
  const [data, setData] = useState(hojeISO());
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [eventoId, setEventoId] = useState("");
  const eventos = useDados(() => (tipo === "saida" ? proximosEventos(30).catch(() => []) : Promise.resolve([])), [tipo]);
  const un = rotuloUnidade(item.unidade);

  const q = lerValor(qtd);
  const valorTotal = total.trim() ? lerValor(total) : null;
  const sobra = tipo === "saida" && Number.isFinite(q) ? item.quantidade - q : null;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(q) || q < 0 || (tipo !== "ajuste" && q === 0)) return setErro("Digite a quantidade.");
    if (valorTotal !== null && (!Number.isFinite(valorTotal) || valorTotal < 0)) return setErro("O valor pago precisa ser um número.");
    setSalvando(true);
    setErro("");
    try {
      await registrarMovimento({
        item_id: item.id,
        tipo,
        quantidade: Math.round(q * 1000) / 1000,
        custo_unitario: tipo === "entrada" && valorTotal ? Math.round((valorTotal / q) * 10000) / 10000 : null,
        validade: tipo === "entrada" && validade ? validade : null,
        motivo: motivo.trim(),
        data,
        lancar_no_caixa: tipo === "entrada" && !!valorTotal && lancar,
        evento_id: tipo === "saida" && eventoId ? eventoId : null,
      });
      onSalvo();
    } catch (err) {
      setErro("Não deu para salvar: " + (err as Error).message);
      setSalvando(false);
    }
  }

  const campo = "w-full rounded-lg border border-linha bg-superficie px-3 py-2.5 focus:border-jade focus:outline-none";

  return (
    <form onSubmit={enviar} className="mt-3 space-y-3 rounded-xl border border-linha p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-tinta-suave">
            {tipo === "entrada" ? "Quanto entrou" : tipo === "saida" ? "Quanto saiu" : "Quanto tem agora"} ({un})
          </span>
          <input className={`${campo} text-lg font-semibold`} inputMode="decimal" placeholder="0" value={qtd} onChange={(e) => setQtd(e.target.value)} autoFocus required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-tinta-suave">Data</span>
          <input type="date" className={campo} value={data} onChange={(e) => setData(e.target.value)} required />
        </label>
      </div>

      {tipo === "entrada" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm text-tinta-suave">Valor total pago (R$)</span>
              <input className={campo} inputMode="decimal" placeholder="opcional" value={total} onChange={(e) => setTotal(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-tinta-suave">Validade</span>
              <input type="date" className={campo} value={validade} onChange={(e) => setValidade(e.target.value)} />
            </label>
          </div>
          {valorTotal !== null && valorTotal > 0 && Number.isFinite(q) && q > 0 && (
            <p className="text-xs text-tinta-suave">
              Dá {dinheiro(valorTotal / q)} por {un}.
            </p>
          )}
          {valorTotal !== null && valorTotal > 0 && (
            <label className="flex items-start gap-2 rounded-lg bg-jade-claro px-3 py-2 text-sm text-jade-texto">
              <input type="checkbox" checked={lancar} onChange={(e) => setLancar(e.target.checked)} className="mt-0.5 size-4 accent-[var(--jade)]" />
              <span>
                Lançar esta compra no caixa como saída paga de {dinheiro(valorTotal)}
                <span className="block text-xs opacity-80">Desmarque se ela já foi lançada no caixa ou se veio de um boleto.</span>
              </span>
            </label>
          )}
        </>
      )}

      {tipo !== "ajuste" && (
        <label className="block">
          <span className="mb-1 block text-sm text-tinta-suave">{tipo === "entrada" ? "De onde veio" : "Para quê"} (opcional)</span>
          <input
            className={campo}
            placeholder={tipo === "entrada" ? "Ex.: Atacadão" : "Ex.: Casamento da Ana"}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </label>
      )}

      {tipo === "saida" && (eventos.dados ?? []).length > 0 && (
        <label className="block">
          <span className="mb-1 block text-sm text-tinta-suave">Foi para algum evento? (opcional)</span>
          <select className={campo} value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
            <option value="">Não, uso do dia a dia</option>
            {(eventos.dados ?? []).map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.data.slice(8, 10)}/{ev.data.slice(5, 7)} · {ev.titulo} ({ev.cliente})
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-tinta-suave">Assim o evento mostra tudo o que foi usado nele e quanto custou.</span>
        </label>
      )}

      {sobra !== null && sobra < 0 && (
        <p className="rounded-lg bg-ambar-claro px-3 py-2 text-sm text-ambar-texto">
          Isso é mais do que o painel acha que tem ({quantidade(item.quantidade)} {un}). Pode salvar mesmo assim, e depois faça uma contagem para acertar.
        </p>
      )}
      {tipo === "ajuste" && (
        <p className="text-xs text-tinta-suave">O painel acha que tem {quantidade(item.quantidade)} {un}. Digite o que vocês contaram e ele corrige.</p>
      )}

      {erro && <p className="rounded-lg bg-erro-claro px-3 py-2 text-sm text-erro">{erro}</p>}

      <button type="submit" disabled={salvando} className="w-full rounded-lg bg-jade py-3 font-semibold text-white hover:brightness-110 disabled:opacity-60">
        {salvando ? "Salvando…" : tipo === "entrada" ? "Registrar entrada" : tipo === "saida" ? "Registrar saída" : "Salvar contagem"}
      </button>
    </form>
  );
}
