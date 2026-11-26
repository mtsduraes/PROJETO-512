"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { SeletorMes } from "@/components/SeletorMes";
import { useDados } from "@/components/useDados";
import { DetalheEvento } from "@/components/agenda/DetalheEvento";
import { FormEvento } from "@/components/agenda/FormEvento";
import { COR_STATUS, gradeDoMes, rotuloStatus } from "@/lib/agenda";
import { compromissosGoogle, listarEventos } from "@/lib/dados";
import { dataBR, dinheiro, hojeISO, mesAtual, mesLongo } from "@/lib/format";
import type { CompromissoGoogle, Evento } from "@/lib/types";

const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const SEMANA_LONGA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const horaGoogle = (c: CompromissoGoogle) =>
  c.diaInteiro ? "dia todo" : new Date(c.inicio).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export default function Agenda() {
  const [mes, setMes] = useState(mesAtual());
  const [visao, setVisao] = useState<"mes" | "lista">("mes");
  const [diaEscolhido, setDiaEscolhido] = useState(hojeISO());
  const [aberto, setAberto] = useState<string | null>(null);
  const [form, setForm] = useState<{ aberto: boolean; item: Evento | null; data?: string }>({ aberto: false, item: null });
  const [mostrarGoogle, setMostrarGoogle] = useState(true);

  // Vindo do Início: /agenda?data=AAAA-MM-DD&evento=ID abre o evento direto.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const data = p.get("data");
    if (data && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      setMes(data.slice(0, 7));
      setDiaEscolhido(data);
    }
    if (p.get("evento")) setAberto(p.get("evento"));
  }, []);

  const grade = useMemo(() => gradeDoMes(mes), [mes]);
  const de = grade[0].iso;
  const ate = grade[grade.length - 1].iso;
  const eventos = useDados(() => listarEventos(de, ate), [de, ate]);
  const google = useDados(() => compromissosGoogle(de, ate).catch((e: Error) => ({ configurado: true, itens: [], erro: e.message })), [de, ate]);

  const lista = useMemo(() => eventos.dados ?? [], [eventos.dados]);
  const doGoogle = useMemo(() => (mostrarGoogle ? (google.dados?.itens ?? []) : []), [google.dados, mostrarGoogle]);
  const hoje = hojeISO();

  const porDia = useMemo(() => {
    const m = new Map<string, { eventos: Evento[]; google: CompromissoGoogle[] }>();
    const pegar = (d: string) => m.get(d) ?? m.set(d, { eventos: [], google: [] }).get(d)!;
    for (const e of lista) pegar(e.data).eventos.push(e);
    for (const g of doGoogle) pegar(g.data).google.push(g);
    return m;
  }, [lista, doGoogle]);

  const doMes = lista.filter((e) => e.data.startsWith(mes) && e.status !== "cancelado");
  const confirmados = doMes.filter((e) => e.status === "confirmado" || e.status === "realizado");
  const faturamento = confirmados.reduce((s, e) => s + e.valor_total, 0);
  const orcamentos = doMes.filter((e) => e.status === "orcamento");

  const eventoAberto = aberto ? lista.find((e) => e.id === aberto) : null;
  const doDia = porDia.get(diaEscolhido);
  const erroGoogle = google.dados && "erro" in google.dados ? (google.dados as { erro: string }).erro : "";

  function mudarMes(m: string) {
    setMes(m);
    setDiaEscolhido(m === mesAtual() ? hoje : `${m}-01`);
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-tinta-suave">Eventos da 512 e compromissos do Google Agenda num lugar só.</p>
        </div>
        <button
          onClick={() => setForm({ aberto: true, item: null, data: diaEscolhido })}
          className="hidden items-center gap-2 rounded-full bg-jade px-5 py-2.5 font-semibold text-white hover:brightness-110 md:flex"
        >
          <span className="text-lg leading-none">+</span> Novo evento
        </button>
      </div>

      <section className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="min-w-0 rounded-xl border border-linha bg-superficie p-2.5 sm:p-4">
          <p className="text-xs text-tinta-suave sm:text-sm">Confirmados</p>
          <p className="font-display mt-0.5 text-xl font-semibold tabular-nums sm:text-2xl">{confirmados.length}</p>
          <p className="text-xs text-tinta-suave/80">neste mês</p>
        </div>
        <div className="min-w-0 rounded-xl border border-linha bg-superficie p-2.5 sm:p-4">
          <p className="text-xs text-tinta-suave sm:text-sm">Orçamentos</p>
          <p className={`font-display mt-0.5 text-xl font-semibold tabular-nums sm:text-2xl ${orcamentos.length ? "text-ambar-texto" : ""}`}>{orcamentos.length}</p>
          <p className="text-xs text-tinta-suave/80">esperando resposta</p>
        </div>
        <div className="min-w-0 rounded-xl border border-linha bg-superficie p-2.5 sm:p-4">
          <p className="text-xs text-tinta-suave sm:text-sm">Fechado no mês</p>
          <p className="font-display mt-0.5 text-[0.95rem] leading-tight font-semibold tabular-nums min-[400px]:text-lg sm:text-2xl">{dinheiro(faturamento)}</p>
          <p className="text-xs text-tinta-suave/80">eventos confirmados</p>
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <SeletorMes mes={mes} onChange={mudarMes} />
        <div className="inline-grid grid-cols-2 gap-1 rounded-full border border-linha bg-superficie p-1 text-sm" role="tablist">
          {(["mes", "lista"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={visao === v}
              onClick={() => setVisao(v)}
              className={`rounded-full px-4 py-1.5 font-medium ${visao === v ? "bg-tinta text-porcelana" : "text-tinta-suave"}`}
            >
              {v === "mes" ? "Calendário" : "Lista"}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tinta-suave">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-jade" /> Confirmado</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-ambar" /> Orçamento</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-tinta-suave" /> Realizado</span>
        {google.dados?.configurado && (
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={mostrarGoogle} onChange={(e) => setMostrarGoogle(e.target.checked)} className="size-3.5 accent-[var(--jade)]" />
            <span className="size-2.5 rounded-sm border-2 border-tinta-suave" /> Google Agenda
          </label>
        )}
      </div>

      {(eventos.erro || erroGoogle) && (
        <p className="mb-3 rounded-lg bg-erro-claro p-3 text-sm text-erro">
          {eventos.erro && (
            <>
              Erro ao carregar: {eventos.erro}
              {/eventos/.test(eventos.erro) && " (o banco ainda não tem a agenda: rode o arquivo 04-agenda.sql no Supabase)"}
            </>
          )}
          {erroGoogle && <span className="block">{erroGoogle}</span>}
        </p>
      )}
      {google.dados && !google.dados.configurado && (
        <p className="mb-3 rounded-lg bg-porcelana p-3 text-sm text-tinta-suave">
          O Google Agenda ainda não está ligado. Quando o link secreto for colocado na Vercel, os compromissos dele aparecem aqui também.
        </p>
      )}

      {visao === "mes" ? (
        <div className="grid gap-4 md:grid-cols-[1fr_20rem]">
          <div className="overflow-hidden rounded-xl border border-linha bg-superficie">
            <div className="grid grid-cols-7 border-b border-linha text-center text-xs text-tinta-suave">
              {SEMANA.map((d, i) => (
                <span key={i} className="py-2" aria-label={SEMANA_LONGA[i]}>
                  <span className="md:hidden">{d}</span>
                  <span className="hidden md:inline">{SEMANA_LONGA[i].slice(0, 3)}</span>
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grade.map((d) => {
                const info = porDia.get(d.iso);
                const evs = (info?.eventos ?? []).filter((e) => e.status !== "cancelado");
                const gs = info?.google ?? [];
                const escolhido = d.iso === diaEscolhido;
                return (
                  <button
                    key={d.iso}
                    onClick={() => setDiaEscolhido(d.iso)}
                    aria-label={`${dataBR(d.iso)}: ${evs.length} eventos, ${gs.length} compromissos`}
                    aria-pressed={escolhido}
                    className={`flex min-h-16 flex-col items-stretch gap-1 border-r border-b border-linha/60 p-1 text-left md:min-h-24 md:p-1.5 ${
                      d.doMes ? "" : "bg-porcelana/60 text-tinta-suave/60"
                    } ${escolhido ? "ring-2 ring-jade ring-inset" : "hover:bg-porcelana"}`}
                  >
                    <span
                      className={`grid size-6 place-items-center self-start rounded-full text-xs tabular-nums ${
                        d.iso === hoje ? "bg-tinta font-semibold text-porcelana" : ""
                      }`}
                    >
                      {d.dia}
                    </span>
                    {/* celular: pontinhos; notebook: nomes */}
                    <span className="flex flex-wrap gap-0.5 md:hidden">
                      {evs.slice(0, 4).map((e) => (
                        <span key={e.id} className={`size-2 rounded-full ${COR_STATUS[e.status].ponto}`} />
                      ))}
                      {gs.slice(0, 3).map((g) => (
                        <span key={g.id} className="size-2 rounded-sm border-[1.5px] border-tinta-suave" />
                      ))}
                    </span>
                    <span className="hidden flex-col gap-0.5 md:flex">
                      {evs.slice(0, 3).map((e) => (
                        <span key={e.id} className={`truncate rounded px-1 text-[11px] font-medium ${COR_STATUS[e.status].selo}`}>
                          {e.cliente}
                        </span>
                      ))}
                      {gs.slice(0, 2).map((g) => (
                        <span key={g.id} className="truncate rounded border border-linha px-1 text-[11px] text-tinta-suave">
                          {g.titulo}
                        </span>
                      ))}
                      {evs.length + gs.length > 5 && <span className="text-[10px] text-tinta-suave">+{evs.length + gs.length - 5}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <section aria-live="polite">
            <h2 className="mb-2 text-sm font-semibold text-tinta-suave first-letter:uppercase">
              {new Date(diaEscolhido + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
            {!doDia || (doDia.eventos.length === 0 && doDia.google.length === 0) ? (
              <div className="rounded-xl border border-dashed border-linha bg-superficie p-4 text-sm text-tinta-suave">
                Nada marcado.{" "}
                <button onClick={() => setForm({ aberto: true, item: null, data: diaEscolhido })} className="font-medium text-jade-texto underline underline-offset-2">
                  Cadastrar evento neste dia
                </button>
              </div>
            ) : (
              <ul className="space-y-2">
                {doDia.eventos.map((e) => (
                  <CartaoEvento key={e.id} e={e} onAbrir={() => setAberto(e.id)} />
                ))}
                {doDia.google.map((g) => (
                  <CartaoGoogle key={g.id} g={g} />
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <ListaDoMes mes={mes} eventos={lista} google={doGoogle} onAbrir={setAberto} />
      )}

      <button
        onClick={() => setForm({ aberto: true, item: null, data: diaEscolhido })}
        className="fixed right-4 bottom-[5.5rem] z-30 flex items-center gap-2 rounded-full bg-jade px-5 py-3.5 font-semibold text-white shadow-[0_6px_20px_-6px_rgba(19,102,80,.6)] hover:brightness-110 md:hidden"
      >
        <span className="text-xl leading-none">+</span> Novo evento
      </button>

      {eventoAberto && (
        <DetalheEvento
          key={eventoAberto.id + eventoAberto.status + eventoAberto.valor_total}
          evento={eventoAberto}
          onFechar={() => setAberto(null)}
          onEditar={() => {
            setAberto(null);
            setForm({ aberto: true, item: eventoAberto });
          }}
          onMudou={() => eventos.recarregar()}
        />
      )}
      {form.aberto && (
        <FormEvento
          inicial={form.item}
          dataSugerida={form.data}
          onFechar={() => setForm({ aberto: false, item: null })}
          onSalvo={(id) => {
            setForm({ aberto: false, item: null });
            eventos.recarregar();
            setAberto(id);
          }}
          onExcluido={() => {
            setForm({ aberto: false, item: null });
            eventos.recarregar();
          }}
        />
      )}
    </AppShell>
  );
}

function CartaoEvento({ e, onAbrir }: { e: Evento; onAbrir: () => void }) {
  return (
    <li>
      <button onClick={onAbrir} className="relative flex w-full gap-3 overflow-hidden rounded-xl border border-linha bg-superficie p-3 pl-4 text-left hover:bg-porcelana">
        <span className={`absolute inset-y-0 left-0 w-1.5 ${COR_STATUS[e.status].ponto}`} aria-hidden />
        <span className="w-12 shrink-0 text-sm font-semibold tabular-nums">{e.hora_inicio ?? <span className="text-xs leading-tight font-medium text-tinta-suave">dia todo</span>}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{e.cliente}</span>
          <span className="block truncate text-sm text-tinta-suave">
            {e.titulo || e.tipo}
            {e.local && `, ${e.local}`}
          </span>
          <span className="mt-1 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ${COR_STATUS[e.status].selo}`}>{rotuloStatus(e.status)}</span>
            {e.convidados ? <span className="text-tinta-suave">{e.convidados} convidados</span> : null}
          </span>
        </span>
        {e.valor_total > 0 && <span className="shrink-0 text-sm font-semibold tabular-nums">{dinheiro(e.valor_total)}</span>}
      </button>
    </li>
  );
}

function CartaoGoogle({ g }: { g: CompromissoGoogle }) {
  return (
    <li className="flex gap-3 rounded-xl border border-dashed border-linha bg-superficie p-3 pl-4 text-sm">
      <span className="w-12 shrink-0 font-semibold tabular-nums">{horaGoogle(g)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{g.titulo}</span>
        <span className="block truncate text-xs text-tinta-suave">
          Google Agenda{g.local && `, ${g.local}`}
        </span>
      </span>
    </li>
  );
}

function ListaDoMes({ mes, eventos, google, onAbrir }: { mes: string; eventos: Evento[]; google: CompromissoGoogle[]; onAbrir: (id: string) => void }) {
  const dias = [...new Set([...eventos.map((e) => e.data), ...google.map((g) => g.data)])].filter((d) => d.startsWith(mes)).sort();
  if (dias.length === 0) {
    return <div className="rounded-xl border border-dashed border-linha bg-superficie p-6 text-center text-sm text-tinta-suave">Nada marcado em {mesLongo(mes).toLowerCase()}.</div>;
  }
  return (
    <div className="space-y-5">
      {dias.map((d) => (
        <section key={d}>
          <h2 className="mb-2 text-sm font-semibold text-tinta-suave first-letter:uppercase">
            {new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </h2>
          <ul className="space-y-2">
            {eventos.filter((e) => e.data === d).map((e) => (
              <CartaoEvento key={e.id} e={e} onAbrir={() => onAbrir(e.id)} />
            ))}
            {google.filter((g) => g.data === d).map((g) => (
              <CartaoGoogle key={g.id} g={g} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
