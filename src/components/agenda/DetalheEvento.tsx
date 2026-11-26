"use client";

import { useState } from "react";
import { Folha } from "@/components/estoque/Folha";
import { useDados } from "@/components/useDados";
import { COR_STATUS, horario, linkGoogleAgenda, linkWhatsApp, rotuloStatus } from "@/lib/agenda";
import { estoqueDoEvento, excluirLancamento, lancamentosDoEvento, listarCategorias, salvarEvento, salvarLancamento } from "@/lib/dados";
import { qtdComUnidade } from "@/lib/estoque";
import { dataBR, dinheiro, hojeISO, lerValor } from "@/lib/format";
import { FORMAS_PAGAMENTO, rotuloForma, type Evento, type FormaPagamento, type StatusEvento } from "@/lib/types";

interface Props {
  evento: Evento;
  onFechar: () => void;
  onEditar: () => void;
  onMudou: () => void;
}

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function DetalheEvento({ evento: ev, onFechar, onEditar, onMudou }: Props) {
  const [versao, setVersao] = useState(0);
  const pagamentos = useDados(() => lancamentosDoEvento(ev.id), [ev.id, versao]);
  const usado = useDados(() => estoqueDoEvento(ev.id).catch(() => []), [ev.id]);
  const [pagando, setPagando] = useState(false);

  const recebidos = (pagamentos.dados ?? []).filter((l) => !l.evento_restante);
  const recebido = recebidos.filter((l) => l.status === "pago").reduce((s, l) => s + l.valor, 0);
  const agendado = recebidos.filter((l) => l.status === "pendente").reduce((s, l) => s + l.valor, 0);
  const falta = Math.max(0, ev.valor_total - recebido - agendado);
  const custoEstoque = (usado.dados ?? []).reduce((s, u) => s + u.custo, 0);
  const whats = linkWhatsApp(ev.telefone);
  const [a, m, d] = ev.data.split("-").map(Number);
  const diaSemana = DIAS[new Date(a, m - 1, d).getDay()];

  async function mudarStatus(status: StatusEvento) {
    await salvarEvento({ ...ev, status });
    onMudou();
  }

  async function apagarPagamento(id: string) {
    if (!window.confirm("Apagar este pagamento? Ele sai do caixa e o valor volta para o \"falta receber\".")) return;
    await excluirLancamento(id);
    setVersao((v) => v + 1);
    onMudou();
  }

  const botao = "flex items-center justify-center gap-1.5 rounded-lg border border-linha px-3 py-2.5 text-sm font-medium hover:bg-porcelana";

  return (
    <Folha titulo={ev.cliente} onFechar={onFechar} larga>
      <div className="-mt-2 mb-4">
        {ev.titulo && <p className="text-tinta-suave">{ev.titulo}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-full px-2.5 py-0.5 font-medium ${COR_STATUS[ev.status].selo}`}>{rotuloStatus(ev.status)}</span>
          <span className="rounded-full bg-porcelana px-2.5 py-0.5 text-tinta-suave">{ev.tipo}</span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-porcelana p-4 text-sm">
        <div>
          <dt className="text-tinta-suave">Quando</dt>
          <dd className="font-medium">
            {dataBR(ev.data)}, {diaSemana}
            <span className="block font-normal text-tinta-suave">{horario(ev)}</span>
          </dd>
        </div>
        <div>
          <dt className="text-tinta-suave">Onde</dt>
          <dd className="font-medium">{ev.local || "—"}</dd>
        </div>
        <div>
          <dt className="text-tinta-suave">Convidados</dt>
          <dd className="font-medium">{ev.convidados ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-tinta-suave">Contato</dt>
          <dd className="font-medium">{ev.telefone || "—"}</dd>
        </div>
        {ev.observacao && (
          <div className="col-span-2">
            <dt className="text-tinta-suave">Observações</dt>
            <dd className="whitespace-pre-line">{ev.observacao}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {whats ? (
          <a href={whats} target="_blank" rel="noopener noreferrer" className={botao}>
            WhatsApp
          </a>
        ) : (
          <span className={`${botao} opacity-40`}>WhatsApp</span>
        )}
        <a href={linkGoogleAgenda(ev)} target="_blank" rel="noopener noreferrer" className={botao} title="Abre o Google Agenda com o evento preenchido">
          + Google Agenda
        </a>
        <button onClick={onEditar} className={botao}>
          Editar
        </button>
      </div>

      {ev.status === "orcamento" && (
        <button onClick={() => mudarStatus("confirmado")} className="mt-2 w-full rounded-lg bg-jade py-2.5 text-sm font-semibold text-white hover:brightness-110">
          Cliente fechou: marcar como confirmado
        </button>
      )}
      {ev.status === "confirmado" && ev.data <= hojeISO() && (
        <button onClick={() => mudarStatus("realizado")} className="mt-2 w-full rounded-lg border border-linha py-2.5 text-sm font-medium hover:bg-porcelana">
          Marcar como realizado
        </button>
      )}

      {/* Valores */}
      <h3 className="mt-6 mb-2 text-sm font-semibold text-tinta-suave">Valores</h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="min-w-0 rounded-xl border border-linha px-1.5 py-3 sm:px-3">
          <p className="text-xs text-tinta-suave">Fechado</p>
          <p className="font-display text-[0.95rem] font-semibold tracking-tight whitespace-nowrap sm:text-lg tabular-nums">{dinheiro(ev.valor_total)}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-linha px-1.5 py-3 sm:px-3">
          <p className="text-xs text-tinta-suave">Recebido</p>
          <p className="font-display text-[0.95rem] font-semibold tracking-tight whitespace-nowrap sm:text-lg text-jade-texto tabular-nums">{dinheiro(recebido)}</p>
        </div>
        <div className="min-w-0 rounded-xl border border-linha px-1.5 py-3 sm:px-3">
          <p className="text-xs text-tinta-suave">Falta</p>
          <p className={`font-display text-[0.95rem] font-semibold tracking-tight whitespace-nowrap sm:text-lg tabular-nums ${falta + agendado > 0 ? "text-ambar-texto" : ""}`}>{dinheiro(falta + agendado)}</p>
        </div>
      </div>
      {ev.valor_total > 0 && (
        <div className="mt-2 h-2 rounded-full bg-porcelana" aria-hidden>
          <div className="h-2 rounded-full bg-jade" style={{ width: `${Math.min(100, (recebido / ev.valor_total) * 100)}%` }} />
        </div>
      )}

      {recebidos.length > 0 && (
        <ul className="mt-3 divide-y divide-linha/60 rounded-xl border border-linha text-sm">
          {recebidos.map((l) => (
            <li key={l.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{l.descricao}</span>
                <span className="block text-xs text-tinta-suave">
                  {dataBR(l.data)}, {rotuloForma(l.forma_pagamento)}
                  {l.status === "pendente" && " (agendado)"}
                </span>
              </span>
              <span className="font-semibold text-jade-texto tabular-nums">{dinheiro(l.valor)}</span>
              <button onClick={() => apagarPagamento(l.id)} className="text-xs text-tinta-suave underline underline-offset-2">
                Apagar
              </button>
            </li>
          ))}
        </ul>
      )}

      {ev.status !== "cancelado" && ev.valor_total > 0 && falta > 0 && !pagando && (
        <button onClick={() => setPagando(true)} className="mt-3 w-full rounded-lg bg-jade py-3 font-semibold text-white hover:brightness-110">
          Registrar pagamento recebido
        </button>
      )}
      {pagando && (
        <FormPagamento
          evento={ev}
          falta={falta}
          onCancelar={() => setPagando(false)}
          onSalvo={() => {
            setPagando(false);
            setVersao((v) => v + 1);
            onMudou();
          }}
        />
      )}

      {/* Estoque */}
      <h3 className="mt-6 mb-2 text-sm font-semibold text-tinta-suave">Usado do estoque</h3>
      {(usado.dados ?? []).length === 0 ? (
        <p className="text-sm text-tinta-suave/80">Nada ainda. Ao dar saída de um item no Estoque, escolha este evento em &ldquo;Para qual evento&rdquo;.</p>
      ) : (
        <>
          <ul className="divide-y divide-linha/60 rounded-xl border border-linha text-sm">
            {usado.dados!.map((u, i) => (
              <li key={i} className="flex justify-between gap-3 px-3 py-2">
                <span>{u.nome}</span>
                <span className="tabular-nums text-tinta-suave">{qtdComUnidade(u.quantidade, u.unidade)}</span>
              </li>
            ))}
          </ul>
          {custoEstoque > 0 && <p className="mt-2 text-xs text-tinta-suave">Custo aproximado do que saiu do estoque: {dinheiro(custoEstoque)}</p>}
        </>
      )}
    </Folha>
  );
}

function FormPagamento({ evento, falta, onCancelar, onSalvo }: { evento: Evento; falta: number; onCancelar: () => void; onSalvo: () => void }) {
  const [valor, setValor] = useState(falta.toFixed(2).replace(".", ","));
  const [data, setData] = useState(hojeISO());
  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    const v = lerValor(valor);
    if (!Number.isFinite(v) || v <= 0) return setErro("Digite um valor maior que zero.");
    setSalvando(true);
    try {
      const cats = await listarCategorias();
      const nomeCat = evento.tipo === "Buffet" ? "Buffet" : evento.tipo === "Encomenda" ? "Encomendas" : "Eventos";
      await salvarLancamento({
        tipo: "entrada",
        valor: Math.round(v * 100) / 100,
        data,
        descricao: `${Math.abs(v - falta) < 0.005 ? "Pagamento final" : "Pagamento"}: ${evento.cliente}${evento.titulo ? " - " + evento.titulo : ""}`,
        categoria_id: cats.find((c) => c.tipo === "entrada" && c.nome === nomeCat)?.id ?? null,
        forma_pagamento: forma,
        status: "pago",
        evento_id: evento.id,
      });
      onSalvo();
    } catch (err) {
      setErro((err as Error).message);
      setSalvando(false);
    }
  }

  const campo = "w-full rounded-lg border border-linha bg-superficie px-3 py-2.5";
  return (
    <form onSubmit={salvar} className="mt-3 space-y-3 rounded-xl border border-linha p-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm text-tinta-suave">Valor recebido (R$)</span>
          <input className={`${campo} font-semibold`} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-tinta-suave">Data</span>
          <input type="date" className={campo} value={data} onChange={(e) => setData(e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm text-tinta-suave">Recebido por</span>
        <select className={campo} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
          {FORMAS_PAGAMENTO.map((f) => (
            <option key={f.valor} value={f.valor}>
              {f.rotulo}
            </option>
          ))}
        </select>
      </label>
      {erro && <p className="rounded-lg bg-erro-claro px-3 py-2 text-sm text-erro">{erro}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancelar} className="flex-1 rounded-lg border border-linha py-3 font-medium">
          Cancelar
        </button>
        <button disabled={salvando} className="flex-1 rounded-lg bg-jade py-3 font-semibold text-white disabled:opacity-60">
          {salvando ? "Salvando…" : "Salvar pagamento"}
        </button>
      </div>
    </form>
  );
}
