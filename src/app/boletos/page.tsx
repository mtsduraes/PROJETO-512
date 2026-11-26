"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FormBoleto } from "@/components/FormBoleto";
import { useDados } from "@/components/useDados";
import { formatarLinha } from "@/lib/boleto";
import { linkDoAnexo, listarBoletos, listarCategorias, marcarBoletoPago } from "@/lib/dados";
import { dataBR, dinheiro, hojeISO } from "@/lib/format";
import { GRUPOS, grupoDo, textoPrazo, type Grupo } from "@/lib/prazos";
import type { Boleto, Categoria } from "@/lib/types";

const ESTILO_GRUPO: Record<Grupo, { faixa: string; selo: string; icone: string }> = {
  vencido: { faixa: "bg-erro", selo: "bg-erro-claro text-erro", icone: "!" },
  hoje: { faixa: "bg-ambar", selo: "bg-ambar-claro text-ambar-texto", icone: "●" },
  semana: { faixa: "bg-ambar/50", selo: "bg-porcelana text-tinta-suave", icone: "○" },
  depois: { faixa: "bg-linha", selo: "bg-porcelana text-tinta-suave", icone: "○" },
  pago: { faixa: "bg-jade", selo: "bg-jade-claro text-jade-texto", icone: "✓" },
};

export default function Boletos() {
  const boletos = useDados(listarBoletos, []);
  const categorias = useDados(listarCategorias, []);
  const [aba, setAba] = useState<"a_pagar" | "pago">("a_pagar");
  const [form, setForm] = useState<{ aberto: boolean; item: Boleto | null }>({ aberto: false, item: null });
  const [pagando, setPagando] = useState<Boleto | null>(null);
  const [aviso, setAviso] = useState("");

  const lista = useMemo(() => boletos.dados ?? [], [boletos.dados]);
  const cats = categorias.dados ?? [];
  const hoje = hojeISO();

  const porGrupo = useMemo(() => {
    const m = new Map<Grupo, Boleto[]>();
    for (const b of lista) {
      const g = grupoDo(b, hoje);
      m.set(g, [...(m.get(g) ?? []), b]);
    }
    m.set("pago", (m.get("pago") ?? []).sort((a, b) => (b.pago_em ?? "").localeCompare(a.pago_em ?? "")));
    return m;
  }, [lista, hoje]);

  const soma = (gs: Grupo[]) => gs.flatMap((g) => porGrupo.get(g) ?? []).reduce((s, b) => s + b.valor, 0);
  const conta = (gs: Grupo[]) => gs.reduce((n, g) => n + (porGrupo.get(g)?.length ?? 0), 0);
  const fornecedores = useMemo(() => [...new Set(lista.map((b) => b.fornecedor))].sort((a, b) => a.localeCompare(b, "pt-BR")), [lista]);

  function mostrarAviso(texto: string) {
    setAviso(texto);
    setTimeout(() => setAviso(""), 2500);
  }

  async function copiar(b: Boleto) {
    try {
      await navigator.clipboard.writeText(b.linha_digitavel);
      mostrarAviso("Código copiado. Agora é só colar no app do banco.");
    } catch {
      window.prompt("Copie o código abaixo:", b.linha_digitavel);
    }
  }

  async function abrirAnexo(b: Boleto) {
    if (!b.anexo_path) return;
    try {
      const url = await linkDoAnexo(b.anexo_path);
      if (url) window.open(url, "_blank", "noopener");
      else mostrarAviso("No modo demonstração os arquivos não ficam guardados.");
    } catch (e) {
      mostrarAviso("Não deu para abrir o arquivo: " + (e as Error).message);
    }
  }

  async function desfazer(b: Boleto) {
    if (!window.confirm("Voltar este boleto para 'a pagar'? A saída some do caixa e ele volta para o 'Falta pagar'.")) return;
    await marcarBoletoPago(b, null);
    boletos.recarregar();
  }

  const gruposVisiveis = GRUPOS.filter((g) => (aba === "pago" ? g.chave === "pago" : g.chave !== "pago"));
  const vazio = gruposVisiveis.every((g) => !(porGrupo.get(g.chave)?.length));

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Boletos</h1>
          <p className="text-sm text-tinta-suave">Contas da empresa para pagar. Cada boleto já entra no &ldquo;Falta pagar&rdquo; do caixa.</p>
        </div>
        <button
          onClick={() => setForm({ aberto: true, item: null })}
          className="hidden items-center gap-2 rounded-full bg-jade px-5 py-2.5 font-semibold text-white hover:brightness-110 md:flex"
        >
          <span className="text-lg leading-none">+</span> Novo boleto
        </button>
      </div>

      {/* Resumo */}
      <section className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <Resumo titulo="Vencidos" valor={soma(["vencido"])} qtd={conta(["vencido"])} destaque={conta(["vencido"]) > 0 ? "text-erro" : ""} />
        <Resumo titulo="Até 7 dias" valor={soma(["hoje", "semana"])} qtd={conta(["hoje", "semana"])} destaque={conta(["hoje"]) > 0 ? "text-ambar-texto" : ""} />
        <Resumo titulo="Total a pagar" valor={soma(["vencido", "hoje", "semana", "depois"])} qtd={conta(["vencido", "hoje", "semana", "depois"])} destaque="" />
      </section>

      <div className="mb-4 inline-grid grid-cols-2 gap-1 rounded-full border border-linha bg-superficie p-1 text-sm" role="tablist">
        {(["a_pagar", "pago"] as const).map((a) => (
          <button
            key={a}
            role="tab"
            aria-selected={aba === a}
            onClick={() => setAba(a)}
            className={`rounded-full px-4 py-1.5 font-medium ${aba === a ? "bg-tinta text-porcelana" : "text-tinta-suave"}`}
          >
            {a === "a_pagar" ? `A pagar (${conta(["vencido", "hoje", "semana", "depois"])})` : `Pagos (${conta(["pago"])})`}
          </button>
        ))}
      </div>

      {(boletos.erro || categorias.erro) && (
        <p className="mb-3 rounded-lg bg-erro-claro p-3 text-sm text-erro">
          Erro ao carregar: {boletos.erro || categorias.erro}
          {/boletos/.test(boletos.erro) && " (o banco ainda não tem a parte de boletos: rode o arquivo 02-boletos.sql no Supabase)"}
        </p>
      )}

      {boletos.dados === null ? (
        <p className="text-sm text-tinta-suave/80">Carregando…</p>
      ) : vazio ? (
        <div className="rounded-xl border border-dashed border-linha bg-superficie p-6 text-center text-sm text-tinta-suave">
          {aba === "pago" ? "Nenhum boleto pago ainda." : "Nenhum boleto para pagar. Cadastre o primeiro no botão abaixo."}
        </div>
      ) : (
        <div className="space-y-6">
          {gruposVisiveis.map(({ chave, titulo }) => {
            const itens = porGrupo.get(chave) ?? [];
            if (!itens.length) return null;
            return (
              <section key={chave}>
                <h2 className="mb-2 flex items-baseline justify-between text-sm font-semibold text-tinta-suave">
                  <span>{titulo}</span>
                  <span className="tabular-nums">{dinheiro(itens.reduce((s, b) => s + b.valor, 0))}</span>
                </h2>
                <ul className="space-y-2">
                  {itens.map((b) => (
                    <ItemBoleto
                      key={b.id}
                      b={b}
                      grupo={chave}
                      categorias={cats}
                      hoje={hoje}
                      onEditar={() => setForm({ aberto: true, item: b })}
                      onCopiar={() => copiar(b)}
                      onAnexo={() => abrirAnexo(b)}
                      onPagar={() => setPagando(b)}
                      onDesfazer={() => desfazer(b)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <button
        onClick={() => setForm({ aberto: true, item: null })}
        className="fixed right-4 bottom-[5.5rem] z-30 flex items-center md:hidden gap-2 rounded-full bg-jade px-5 py-3.5 font-semibold text-white shadow-[0_6px_20px_-6px_rgba(19,102,80,.6)] hover:brightness-110 md:bottom-8"
      >
        <span className="text-xl leading-none">+</span> Novo boleto
      </button>

      {aviso && (
        <div role="status" className="fixed inset-x-0 bottom-40 z-50 mx-auto w-fit max-w-[90vw] rounded-full bg-tinta px-4 py-2 text-sm text-porcelana shadow-lg md:bottom-24">
          {aviso}
        </div>
      )}

      {form.aberto && (
        <FormBoleto
          categorias={cats}
          fornecedores={fornecedores}
          inicial={form.item}
          onFechar={() => setForm({ aberto: false, item: null })}
          onSalvo={() => {
            setForm({ aberto: false, item: null });
            boletos.recarregar();
          }}
        />
      )}

      {pagando && (
        <DialogoPagar
          boleto={pagando}
          onFechar={() => setPagando(null)}
          onPago={() => {
            setPagando(null);
            boletos.recarregar();
            mostrarAviso("Boleto pago e lançado como saída no caixa.");
          }}
        />
      )}
    </AppShell>
  );
}

function Resumo({ titulo, valor, qtd, destaque }: { titulo: string; valor: number; qtd: number; destaque: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-linha bg-superficie p-2.5 sm:p-4">
      <p className="text-xs text-tinta-suave sm:text-sm">{titulo}</p>
      <p className={`font-display mt-0.5 text-[0.95rem] leading-tight font-semibold tabular-nums min-[400px]:text-lg sm:text-2xl ${destaque}`}>{dinheiro(valor)}</p>
      <p className="text-xs text-tinta-suave/80">{qtd === 1 ? "1 boleto" : `${qtd} boletos`}</p>
    </div>
  );
}

interface ItemProps {
  b: Boleto;
  grupo: Grupo;
  categorias: Categoria[];
  hoje: string;
  onEditar: () => void;
  onCopiar: () => void;
  onAnexo: () => void;
  onPagar: () => void;
  onDesfazer: () => void;
}

function ItemBoleto({ b, grupo, categorias, hoje, onEditar, onCopiar, onAnexo, onPagar, onDesfazer }: ItemProps) {
  const estilo = ESTILO_GRUPO[grupo];
  const cat = categorias.find((c) => c.id === b.categoria_id);
  const botao = "rounded-lg border border-linha px-3 py-2 text-sm font-medium hover:bg-porcelana";
  return (
    <li className="relative overflow-hidden rounded-xl border border-linha bg-superficie">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${estilo.faixa}`} aria-hidden />
      <div className="p-4 pl-5">
        <button onClick={onEditar} className="flex w-full items-start justify-between gap-3 text-left">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{b.fornecedor}</span>
            {b.descricao && <span className="block truncate text-sm text-tinta-suave">{b.descricao}</span>}
            <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-medium ${estilo.selo}`}>
                <span aria-hidden>{estilo.icone} </span>
                {b.status === "pago" ? `pago em ${dataBR(b.pago_em ?? b.vencimento).slice(0, 5)}` : textoPrazo(b, hoje)}
              </span>
              <span className="text-tinta-suave/80">venc. {dataBR(b.vencimento)}</span>
              {cat && <span className="rounded bg-porcelana px-1.5 py-0.5 text-tinta-suave">{cat.nome}</span>}
            </span>
          </span>
          <span className="font-display shrink-0 text-xl font-semibold tabular-nums">{dinheiro(b.valor)}</span>
        </button>

        <div className="mt-3 flex flex-wrap gap-2">
          {b.status === "a_pagar" ? (
            <>
              {b.linha_digitavel && (
                <button onClick={onCopiar} className={botao} title={formatarLinha(b.linha_digitavel)}>
                  Copiar código
                </button>
              )}
              {b.anexo_path && (
                <button onClick={onAnexo} className={botao}>
                  Ver boleto
                </button>
              )}
              <button onClick={onPagar} className="ml-auto rounded-lg bg-jade px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
                Marcar como pago
              </button>
            </>
          ) : (
            <>
              {b.anexo_path && (
                <button onClick={onAnexo} className={botao}>
                  Ver boleto
                </button>
              )}
              <button onClick={onDesfazer} className={`${botao} ml-auto`}>
                Desfazer pagamento
              </button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function DialogoPagar({ boleto, onFechar, onPago }: { boleto: Boleto; onFechar: () => void; onPago: () => void }) {
  const [data, setData] = useState(hojeISO());
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function confirmar() {
    setSalvando(true);
    try {
      await marcarBoletoPago(boleto, data);
      onPago();
    } catch (e) {
      setErro((e as Error).message);
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center" onClick={onFechar}>
      <div onClick={(e) => e.stopPropagation()} className="folha w-full max-w-sm rounded-t-2xl bg-superficie p-5 shadow-xl md:rounded-2xl">
        <h2 className="text-lg font-semibold">Marcar como pago</h2>
        <p className="mt-1 text-sm text-tinta-suave">
          {boleto.fornecedor}: <strong className="text-tinta">{dinheiro(boleto.valor)}</strong>. Ele vai entrar como saída paga no caixa nesta data.
        </p>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm text-tinta-suave">Data do pagamento</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="w-full rounded-lg border border-linha px-3 py-2.5" />
        </label>
        {erro && <p className="mt-3 rounded-lg bg-erro-claro px-3 py-2 text-sm text-erro">{erro}</p>}
        <div className="mt-5 flex gap-2">
          <button onClick={onFechar} className="flex-1 rounded-lg border border-linha py-3 font-medium">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={salvando || !data} className="flex-1 rounded-lg bg-jade py-3 font-semibold text-white disabled:opacity-60">
            {salvando ? "Salvando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
