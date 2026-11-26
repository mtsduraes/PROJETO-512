/**
 * Camada de dados: o resto do painel só conversa com estas funções.
 * - Com Supabase configurado, os dados ficam no banco online (compartilhado pela equipe).
 * - Sem configuração, roda em modo demonstração e guarda tudo no navegador.
 */
import { modoDemo, supabase } from "./supabase";
import { limitesDoMes, mesAtual, somarMes } from "./format";
import type { Categoria, Lancamento, NovoLancamento, ResumoMes, ResumoSaldo, Tipo } from "./types";

// ---------------------------------------------------------------------
// Modo demonstração (localStorage)
// ---------------------------------------------------------------------
const CHAVE = "painel-caixa-demo-v1";

interface BancoDemo {
  categorias: Categoria[];
  lancamentos: Lancamento[];
}

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const CATEGORIAS_INICIAIS: [string, Tipo][] = [
  ["Eventos", "entrada"],
  ["Buffet", "entrada"],
  ["Encomendas", "entrada"],
  ["Outras entradas", "entrada"],
  ["Ingredientes", "saida"],
  ["Bebidas", "saida"],
  ["Equipe", "saida"],
  ["Aluguel de material", "saida"],
  ["Transporte", "saida"],
  ["Contas fixas", "saida"],
  ["Outras saídas", "saida"],
];

function exemplos(cats: Categoria[]): Lancamento[] {
  const id = (nome: string) => cats.find((c) => c.nome === nome)!.id;
  const m0 = mesAtual();
  const lista: Lancamento[] = [];
  const add = (mes: string, dia: number, tipo: Tipo, valor: number, descricao: string, cat: string, status: "pago" | "pendente" = "pago") =>
    lista.push({
      id: uid(),
      tipo,
      valor,
      data: `${mes}-${String(dia).padStart(2, "0")}`,
      descricao,
      categoria_id: id(cat),
      forma_pagamento: tipo === "entrada" ? "pix" : "dinheiro",
      status,
    });
  add(somarMes(m0, -5), 1, "entrada", 5000, "Saldo inicial", "Outras entradas");
  for (let i = 5; i >= 0; i--) {
    const mes = somarMes(m0, -i);
    add(mes, 5, "entrada", 4200 + i * 350, "Casamento (sinal + final)", "Eventos");
    add(mes, 12, "entrada", 1800 + (i % 3) * 400, "Buffet aniversário", "Buffet");
    add(mes, 18, "entrada", 650, "Encomenda de salgados", "Encomendas");
    add(mes, 3, "saida", 1900 + (i % 2) * 500, "Compra no atacadão", "Ingredientes");
    add(mes, 10, "saida", 600, "Refrigerantes e sucos", "Bebidas");
    add(mes, 15, "saida", 1500, "Garçons e ajudantes", "Equipe");
    add(mes, 20, "saida", 480, "Luz, água e gás", "Contas fixas");
    add(mes, 22, "saida", 250, "Frete das mesas", "Transporte");
  }
  add(m0, 28, "entrada", 3500, "Formatura (a receber)", "Eventos", "pendente");
  add(m0, 27, "saida", 900, "Aluguel de louças", "Aluguel de material", "pendente");
  return lista;
}

function lerDemo(): BancoDemo {
  const bruto = typeof window !== "undefined" ? localStorage.getItem(CHAVE) : null;
  if (bruto) return JSON.parse(bruto);
  const categorias = CATEGORIAS_INICIAIS.map(([nome, tipo]) => ({ id: uid(), nome, tipo, ativa: true }));
  const banco = { categorias, lancamentos: exemplos(categorias) };
  salvarDemo(banco);
  return banco;
}

function salvarDemo(b: BancoDemo) {
  localStorage.setItem(CHAVE, JSON.stringify(b));
}

export function apagarDadosDemo() {
  localStorage.removeItem(CHAVE);
}

// ---------------------------------------------------------------------
// Funções usadas pelas telas
// ---------------------------------------------------------------------
function falhou(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

const ordenarCats = (a: Categoria, b: Categoria) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome, "pt-BR");

export async function listarCategorias(): Promise<Categoria[]> {
  if (modoDemo) return [...lerDemo().categorias].sort(ordenarCats);
  const { data, error } = await supabase().from("categorias").select("id,nome,tipo,ativa").order("tipo").order("nome");
  falhou(error);
  return data as Categoria[];
}

export async function salvarCategoria(c: Omit<Categoria, "id"> & { id?: string }): Promise<void> {
  if (modoDemo) {
    const b = lerDemo();
    if (c.id) b.categorias = b.categorias.map((x) => (x.id === c.id ? { ...x, ...c, id: x.id } : x));
    else b.categorias.push({ ...c, id: uid() });
    salvarDemo(b);
    return;
  }
  const { id, ...campos } = c;
  const { error } = id
    ? await supabase().from("categorias").update(campos).eq("id", id)
    : await supabase().from("categorias").insert(campos);
  falhou(error);
}

export async function listarLancamentos(mes: string): Promise<Lancamento[]> {
  const { de, ate } = limitesDoMes(mes);
  if (modoDemo) {
    return lerDemo()
      .lancamentos.filter((l) => l.data >= de && l.data <= ate)
      .sort((a, b) => b.data.localeCompare(a.data));
  }
  const { data, error } = await supabase()
    .from("lancamentos")
    .select("id,tipo,valor,data,descricao,categoria_id,forma_pagamento,status")
    .gte("data", de)
    .lte("data", ate)
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false });
  falhou(error);
  return (data ?? []).map((l) => ({ ...l, valor: Number(l.valor) })) as Lancamento[];
}

export async function salvarLancamento(l: NovoLancamento & { id?: string }): Promise<void> {
  if (modoDemo) {
    const b = lerDemo();
    if (l.id) b.lancamentos = b.lancamentos.map((x) => (x.id === l.id ? { ...l, id: x.id } : x));
    else b.lancamentos.push({ ...l, id: uid() });
    salvarDemo(b);
    return;
  }
  const { id, ...campos } = l;
  const { error } = id
    ? await supabase().from("lancamentos").update(campos).eq("id", id)
    : await supabase().from("lancamentos").insert(campos);
  falhou(error);
}

export async function excluirLancamento(id: string): Promise<void> {
  if (modoDemo) {
    const b = lerDemo();
    b.lancamentos = b.lancamentos.filter((x) => x.id !== id);
    salvarDemo(b);
    return;
  }
  const { error } = await supabase().from("lancamentos").delete().eq("id", id);
  falhou(error);
}

export async function resumoSaldo(): Promise<ResumoSaldo> {
  if (modoDemo) {
    const r = { saldo: 0, a_receber: 0, a_pagar: 0 };
    for (const l of lerDemo().lancamentos) {
      if (l.status === "pago") r.saldo += l.tipo === "entrada" ? l.valor : -l.valor;
      else if (l.tipo === "entrada") r.a_receber += l.valor;
      else r.a_pagar += l.valor;
    }
    return r;
  }
  const { data, error } = await supabase().rpc("resumo_saldo").single();
  falhou(error);
  const r = data as Record<string, number | string>;
  return { saldo: Number(r.saldo), a_receber: Number(r.a_receber), a_pagar: Number(r.a_pagar) };
}

export async function resumoMensal(meses = 6): Promise<ResumoMes[]> {
  if (modoDemo) {
    const m0 = mesAtual();
    const lista = Array.from({ length: meses }, (_, i) => ({ mes: somarMes(m0, i - meses + 1), entradas: 0, saidas: 0 }));
    for (const l of lerDemo().lancamentos) {
      if (l.status !== "pago") continue;
      const item = lista.find((x) => x.mes === l.data.slice(0, 7));
      if (!item) continue;
      if (l.tipo === "entrada") item.entradas += l.valor;
      else item.saidas += l.valor;
    }
    return lista;
  }
  const { data, error } = await supabase().rpc("resumo_mensal", { meses });
  falhou(error);
  return (data as ResumoMes[]).map((r) => ({ mes: r.mes, entradas: Number(r.entradas), saidas: Number(r.saidas) }));
}
