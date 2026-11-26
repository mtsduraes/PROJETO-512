"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { SeletorMes } from "@/components/SeletorMes";
import { FormLancamento } from "@/components/FormLancamento";
import { BotaoNovo } from "@/components/BotaoNovo";
import { ItemLancamento } from "@/components/ItemLancamento";
import { GraficoMensal, BarrasCategoria } from "@/components/Graficos";
import { useDados } from "@/components/useDados";
import { listarBoletos, listarCategorias, listarLancamentos, resumoMensal, resumoSaldo } from "@/lib/dados";
import { grupoDo } from "@/lib/prazos";
import { dinheiro, mesAtual } from "@/lib/format";
import type { Lancamento, Tipo } from "@/lib/types";

export default function Inicio() {
  const [mes, setMes] = useState(mesAtual());
  const [form, setForm] = useState<{ aberto: boolean; item: Lancamento | null }>({ aberto: false, item: null });

  const categorias = useDados(listarCategorias, []);
  const saldo = useDados(resumoSaldo, []);
  const historico = useDados(() => resumoMensal(6), []);
  const lancs = useDados(() => listarLancamentos(mes), [mes]);
  // Se a parte de boletos ainda não existir no banco, o Início continua funcionando sem o aviso.
  const boletos = useDados(() => listarBoletos().catch(() => []), []);

  const cats = categorias.dados ?? [];
  const lista = useMemo(() => lancs.dados ?? [], [lancs.dados]);

  const resumo = useMemo(() => {
    const r = { entradas: 0, saidas: 0, aReceber: 0, aPagar: 0 };
    for (const l of lista) {
      const entrada = l.tipo === "entrada";
      if (l.status === "pago") {
        if (entrada) r.entradas += l.valor;
        else r.saidas += l.valor;
      } else if (entrada) r.aReceber += l.valor;
      else r.aPagar += l.valor;
    }
    return r;
  }, [lista]);

  const porCategoria = (tipo: Tipo) => {
    const mapa = new Map<string, number>();
    for (const l of lista) {
      if (l.tipo !== tipo || l.status !== "pago") continue;
      const nome = cats.find((c) => c.id === l.categoria_id)?.nome ?? "Sem categoria";
      mapa.set(nome, (mapa.get(nome) ?? 0) + l.valor);
    }
    return [...mapa].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
  };

  function salvou() {
    setForm({ aberto: false, item: null });
    saldo.recarregar();
    historico.recarregar();
    lancs.recarregar();
    boletos.recarregar();
  }

  const hoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const pendentes = (boletos.dados ?? []).map((b) => ({ b, g: grupoDo(b) }));
  const vencidos = pendentes.filter((x) => x.g === "vencido");
  const semana = pendentes.filter((x) => x.g === "hoje" || x.g === "semana");
  const total = (xs: typeof pendentes) => xs.reduce((s, x) => s + x.b.valor, 0);

  const erro = categorias.erro || saldo.erro || historico.erro || lancs.erro;
  const resultado = resumo.entradas - resumo.saidas;

  return (
    <AppShell>
      {erro && <p className="mb-4 rounded-lg bg-erro-claro p-3 text-sm text-erro">Erro ao carregar: {erro}</p>}

      {/* Saldo atual: a "comanda" */}
      <section className="comanda surgir bg-floresta px-5 pt-5 pb-9 text-papel md:px-7">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-papel/75">Saldo em caixa hoje</p>
          <p className="text-xs text-papel/60 first-letter:uppercase">{hoje}</p>
        </div>
        <p className="font-display mt-2 text-[2.75rem] leading-none font-bold tabular-nums md:text-6xl" style={{ fontVariationSettings: '"SOFT" 0, "opsz" 144' }}>
          {saldo.dados ? dinheiro(saldo.dados.saldo) : "…"}
        </p>
        <div className="mt-5 grid grid-cols-2 border-t border-dashed border-papel/30 pt-4 text-sm">
          <div>
            <p className="text-papel/70">Falta receber</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{saldo.dados ? dinheiro(saldo.dados.a_receber) : "…"}</p>
          </div>
          <div className="border-l border-dashed border-papel/30 pl-4">
            <p className="text-papel/70">Falta pagar</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{saldo.dados ? dinheiro(saldo.dados.a_pagar) : "…"}</p>
          </div>
        </div>
      </section>

      {/* Aviso de boletos */}
      {(vencidos.length > 0 || semana.length > 0) && (
        <Link
          href="/boletos"
          className="mt-4 flex items-center gap-3 rounded-xl border border-ambar/40 bg-ambar-claro px-4 py-3 text-sm text-ambar-texto hover:border-ambar"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-superficie font-bold" aria-hidden>
            !
          </span>
          <span className="flex-1">
            {vencidos.length > 0 && (
              <span className="block font-semibold text-erro">
                {vencidos.length === 1 ? "1 boleto vencido" : `${vencidos.length} boletos vencidos`}: {dinheiro(total(vencidos))}
              </span>
            )}
            {semana.length > 0 && (
              <span className="block">
                {semana.length === 1 ? "1 boleto vence" : `${semana.length} boletos vencem`} nos próximos 7 dias: {dinheiro(total(semana))}
              </span>
            )}
          </span>
          <span className="font-medium underline underline-offset-2">Ver</span>
        </Link>
      )}

      {/* Mês */}
      <div className="mt-6 mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Resumo do mês</h2>
        <SeletorMes mes={mes} onChange={setMes} />
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Cartao titulo="Entradas" valor={resumo.entradas} extra={resumo.aReceber > 0 ? `+ ${dinheiro(resumo.aReceber)} a receber` : ""} cor="text-jade-texto" />
        <Cartao titulo="Saídas" valor={resumo.saidas} extra={resumo.aPagar > 0 ? `+ ${dinheiro(resumo.aPagar)} a pagar` : ""} cor="text-ambar-texto" />
        <Cartao
          titulo="Resultado do mês"
          valor={resultado}
          extra={resultado >= 0 ? "Sobrou dinheiro" : "Gastou mais do que entrou"}
          cor={resultado >= 0 ? "text-jade-texto" : "text-ambar-texto"}
        />
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-linha bg-superficie p-4">
          <h3 className="mb-3 font-semibold">De onde veio o dinheiro</h3>
          <BarrasCategoria itens={porCategoria("entrada")} cor="entrada" />
        </div>
        <div className="rounded-xl border border-linha bg-superficie p-4">
          <h3 className="mb-3 font-semibold">Para onde foi o dinheiro</h3>
          <BarrasCategoria itens={porCategoria("saida")} cor="saida" />
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-linha bg-superficie p-4">
        <h3 className="mb-3 font-semibold">Últimos 6 meses</h3>
        {historico.dados && <GraficoMensal dados={historico.dados} />}
      </section>

      <section className="mt-3 rounded-xl border border-linha bg-superficie">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="font-semibold">Lançamentos recentes do mês</h3>
          <Link href="/lancamentos" className="text-sm text-tinta-suave underline underline-offset-2">
            Ver todos
          </Link>
        </div>
        {lista.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-tinta-suave/80">Nenhum lançamento neste mês ainda.</p>
        ) : (
          <ul className="divide-y divide-linha/60">
            {lista.slice(0, 5).map((l) => (
              <ItemLancamento key={l.id} l={l} categorias={cats} onClick={() => setForm({ aberto: true, item: l })} />
            ))}
          </ul>
        )}
      </section>

      <BotaoNovo onClick={() => setForm({ aberto: true, item: null })} />
      {form.aberto && <FormLancamento categorias={cats} inicial={form.item} onFechar={() => setForm({ aberto: false, item: null })} onSalvo={salvou} />}
    </AppShell>
  );
}

function Cartao({ titulo, valor, extra, cor }: { titulo: string; valor: number; extra: string; cor: string }) {
  return (
    <div className="rounded-xl border border-linha bg-superficie p-4">
      <p className="text-sm text-tinta-suave">{titulo}</p>
      <p className={`font-display mt-1 text-[1.75rem] font-semibold tabular-nums ${cor}`}>{dinheiro(valor)}</p>
      {extra && <p className="mt-1 text-xs text-tinta-suave/80">{extra}</p>}
    </div>
  );
}
