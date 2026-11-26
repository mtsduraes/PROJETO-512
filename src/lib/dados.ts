/**
 * Camada de dados: o resto do painel só conversa com estas funções.
 * - Com Supabase configurado, os dados ficam no banco online (compartilhado pela equipe).
 * - Sem configuração, roda em modo demonstração e guarda tudo no navegador.
 */
import { modoDemo, supabase } from "./supabase";
import { hojeISO, limitesDoMes, mesAtual, somarMes } from "./format";
import type {
  Boleto,
  Categoria,
  CompromissoGoogle,
  Evento,
  ItemEstoque,
  Lancamento,
  MovimentoEstoque,
  NovoBoleto,
  NovoEvento,
  NovoItemEstoque,
  NovoLancamento,
  NovoMovimento,
  ResumoMes,
  ResumoSaldo,
  Tipo,
} from "./types";

// ---------------------------------------------------------------------
// Modo demonstração (localStorage)
// ---------------------------------------------------------------------
const CHAVE = "painel-caixa-demo-v1";

interface BancoDemo {
  categorias: Categoria[];
  lancamentos: Lancamento[];
  boletos?: Boleto[];
  itens?: ItemEstoque[];
  movimentos?: MovimentoEstoque[];
  eventos?: Evento[];
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

function boletosExemplo(b: BancoDemo) {
  const cat = (nome: string) => b.categorias.find((c) => c.nome === nome)?.id ?? null;
  const dia = (delta: number) => {
    const d = new Date();
    d.setDate(d.getDate() + delta);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const base = { linha_digitavel: "", anexo_path: null, observacao: "", pago_em: null, status: "a_pagar" as const };
  b.boletos = [];
  const lista: NovoBoleto[] = [
    { ...base, fornecedor: "Distribuidora de bebidas", descricao: "Pedido do casamento", valor: 1280, vencimento: dia(-2), categoria_id: cat("Bebidas") },
    { ...base, fornecedor: "Enel", descricao: "Conta de luz", valor: 486.9, vencimento: dia(0), categoria_id: cat("Contas fixas") },
    { ...base, fornecedor: "Atacadão", descricao: "Compra quinzenal", valor: 2150.35, vencimento: dia(4), categoria_id: cat("Ingredientes") },
    { ...base, fornecedor: "Locadora de louças", descricao: "Formatura", valor: 900, vencimento: dia(15), categoria_id: cat("Aluguel de material") },
    { ...base, fornecedor: "Sabesp", descricao: "Água", valor: 212.4, vencimento: dia(-6), categoria_id: cat("Contas fixas"), status: "pago", pago_em: dia(-7) },
  ];
  for (const n of lista) {
    const boleto = { ...n, id: uid() };
    b.boletos.push(boleto);
    espelharBoleto(b, boleto);
  }
}

/** No modo demonstração, imita o que o banco faz: cada boleto tem um lançamento espelho no caixa. */
function espelharBoleto(b: BancoDemo, bol: Boleto) {
  const dados: Lancamento = {
    id: b.lancamentos.find((l) => l.boleto_id === bol.id)?.id ?? uid(),
    tipo: "saida",
    valor: bol.valor,
    data: bol.status === "pago" ? (bol.pago_em ?? hojeISO()) : bol.vencimento,
    descricao: `Boleto: ${bol.fornecedor}${bol.descricao ? " - " + bol.descricao : ""}`,
    categoria_id: bol.categoria_id,
    forma_pagamento: "boleto",
    status: bol.status === "pago" ? "pago" : "pendente",
    boleto_id: bol.id,
  };
  const i = b.lancamentos.findIndex((l) => l.boleto_id === bol.id);
  if (i >= 0) b.lancamentos[i] = dados;
  else b.lancamentos.push(dados);
}

function lerDemo(): BancoDemo {
  const bruto = typeof window !== "undefined" ? localStorage.getItem(CHAVE) : null;
  if (bruto) {
    const b: BancoDemo = JSON.parse(bruto);
    let mudou = false;
    if (!b.boletos) {
      boletosExemplo(b);
      mudou = true;
    }
    if (!b.itens) {
      estoqueExemplo(b);
      mudou = true;
    }
    if (!b.eventos) {
      eventosExemplo(b);
      mudou = true;
    }
    if (mudou) salvarDemo(b);
    return b;
  }
  const categorias = CATEGORIAS_INICIAIS.map(([nome, tipo]) => ({ id: uid(), nome, tipo, ativa: true }));
  const banco: BancoDemo = { categorias, lancamentos: exemplos(categorias) };
  boletosExemplo(banco);
  estoqueExemplo(banco);
  eventosExemplo(banco);
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
    .select("id,tipo,valor,data,descricao,categoria_id,forma_pagamento,status,boleto_id,evento_id,evento_restante")
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
    const antes = l.id ? b.lancamentos.find((x) => x.id === l.id) : undefined;
    if (l.id) b.lancamentos = b.lancamentos.map((x) => (x.id === l.id ? { ...x, ...l, id: x.id } : x));
    else b.lancamentos.push({ ...l, id: uid() });
    for (const ev of new Set([antes?.evento_id, l.evento_id])) if (ev) restanteDemo(b, ev);
    salvarDemo(b);
    return;
  }
  const { id, ...campos } = l;
  if (!campos.evento_id) delete campos.evento_id; // funciona mesmo antes de criar a agenda no banco
  const { error } = id
    ? await supabase().from("lancamentos").update(campos).eq("id", id)
    : await supabase().from("lancamentos").insert(campos);
  falhou(error);
}

export async function excluirLancamento(id: string): Promise<void> {
  if (modoDemo) {
    const b = lerDemo();
    const ev = b.lancamentos.find((x) => x.id === id)?.evento_id;
    b.lancamentos = b.lancamentos.filter((x) => x.id !== id);
    if (ev) restanteDemo(b, ev);
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

// ---------------------------------------------------------------------
// Boletos
// ---------------------------------------------------------------------
const CAMPOS_BOLETO = "id,fornecedor,descricao,valor,vencimento,linha_digitavel,categoria_id,status,pago_em,anexo_path,observacao";

export async function listarBoletos(): Promise<Boleto[]> {
  if (modoDemo) return [...(lerDemo().boletos ?? [])].sort((a, b) => a.vencimento.localeCompare(b.vencimento));
  const { data, error } = await supabase().from("boletos").select(CAMPOS_BOLETO).order("vencimento");
  falhou(error);
  return (data ?? []).map((b) => ({ ...b, valor: Number(b.valor) })) as Boleto[];
}

/** Envia a foto/PDF do boleto para a pasta privada e devolve o caminho guardado. */
async function enviarAnexo(arquivo: File): Promise<string> {
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() || "pdf";
  const caminho = `${new Date().getFullYear()}/${uid()}.${extensao}`;
  const { error } = await supabase().storage.from("boletos").upload(caminho, arquivo, { contentType: arquivo.type });
  falhou(error);
  return caminho;
}

export async function salvarBoleto(bol: NovoBoleto & { id?: string }, arquivo?: File | null): Promise<void> {
  if (modoDemo) {
    const b = lerDemo();
    const atual = bol.id ? b.boletos!.find((x) => x.id === bol.id) : undefined;
    const final: Boleto = { ...bol, id: atual?.id ?? uid(), anexo_path: arquivo ? `demo/${arquivo.name}` : bol.anexo_path };
    b.boletos = atual ? b.boletos!.map((x) => (x.id === final.id ? final : x)) : [...b.boletos!, final];
    espelharBoleto(b, final);
    salvarDemo(b);
    return;
  }
  const { id, ...campos } = bol;
  if (arquivo) {
    const antigo = campos.anexo_path;
    campos.anexo_path = await enviarAnexo(arquivo);
    if (antigo) await supabase().storage.from("boletos").remove([antigo]);
  }
  const { error } = id
    ? await supabase().from("boletos").update(campos).eq("id", id)
    : await supabase().from("boletos").insert(campos);
  falhou(error);
}

export async function marcarBoletoPago(bol: Boleto, pagoEm: string | null): Promise<void> {
  await salvarBoleto({ ...bol, status: pagoEm ? "pago" : "a_pagar", pago_em: pagoEm });
}

export async function excluirBoleto(bol: Boleto): Promise<void> {
  if (modoDemo) {
    const b = lerDemo();
    b.boletos = b.boletos!.filter((x) => x.id !== bol.id);
    b.lancamentos = b.lancamentos.filter((l) => l.boleto_id !== bol.id);
    salvarDemo(b);
    return;
  }
  // O lançamento espelho no caixa é apagado junto, pelo próprio banco.
  const { error } = await supabase().from("boletos").delete().eq("id", bol.id);
  falhou(error);
  if (bol.anexo_path) await supabase().storage.from("boletos").remove([bol.anexo_path]);
}

/** Link temporário (10 minutos) para abrir o anexo. */
export async function linkDoAnexo(caminho: string): Promise<string | null> {
  if (modoDemo) return null;
  const { data, error } = await supabase().storage.from("boletos").createSignedUrl(caminho, 600);
  falhou(error);
  return data?.signedUrl ?? null;
}

// ---------------------------------------------------------------------
// Estoque
// ---------------------------------------------------------------------
const CAMPOS_ITEM = "id,nome,grupo,unidade,local,minimo,quantidade,custo_medio,validade,ativo";
const CAMPOS_MOV = "id,item_id,tipo,quantidade,custo_unitario,validade,motivo,data,lancar_no_caixa,lancamento_id,criado_em";

const numItem = (i: ItemEstoque): ItemEstoque => ({ ...i, minimo: Number(i.minimo), quantidade: Number(i.quantidade), custo_medio: Number(i.custo_medio) });
const numMov = (m: MovimentoEstoque): MovimentoEstoque => ({
  ...m,
  quantidade: Number(m.quantidade),
  custo_unitario: m.custo_unitario === null ? null : Number(m.custo_unitario),
});

function estoqueExemplo(b: BancoDemo) {
  b.itens = [];
  b.movimentos = [];
  const dia = (delta: number) => {
    const d = new Date();
    d.setDate(d.getDate() + delta);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const itens: [string, ItemEstoque["grupo"], string, string, number, number, number, number?][] = [
    // nome, grupo, unidade, local, mínimo, compra, preço, uso
    ["Farinha de trigo", "Ingredientes", "kg", "Despensa", 10, 25, 4.9, 18],
    ["Óleo de soja", "Ingredientes", "L", "Despensa", 6, 12, 7.5, 4],
    ["Frango (peito)", "Ingredientes", "kg", "Freezer", 8, 15, 18.9, 12],
    ["Creme de leite", "Ingredientes", "un", "Despensa", 12, 24, 3.2, 6],
    ["Refrigerante 2L", "Bebidas", "un", "Depósito", 24, 48, 7.8, 20],
    ["Água mineral 500ml", "Bebidas", "fardo", "Depósito", 4, 6, 14.9, 5],
    ["Guardanapo", "Descartáveis", "pct", "Depósito", 10, 30, 6.5, 8],
    ["Copo descartável 200ml", "Descartáveis", "cx", "Depósito", 2, 3, 42, 3],
    ["Detergente", "Limpeza", "un", "Área de serviço", 4, 10, 2.9, 3],
    ["Toalha de mesa branca", "Material de evento", "un", "Depósito", 20, 30, 0, 0],
  ];
  for (const [nome, grupo, unidade, local, minimo, compra, preco, uso] of itens) {
    const item: ItemEstoque = { id: uid(), nome, grupo, unidade, local, minimo, quantidade: 0, custo_medio: 0, validade: null, ativo: true };
    b.itens.push(item);
    const validade = grupo === "Ingredientes" ? dia(nome.startsWith("Creme") ? 5 : 90) : null;
    b.movimentos.push({ id: uid(), item_id: item.id, tipo: "entrada", quantidade: compra, custo_unitario: preco || null, validade, motivo: "Compra", data: dia(-10), lancar_no_caixa: false, lancamento_id: null, criado_em: new Date().toISOString() });
    if (uso) b.movimentos.push({ id: uid(), item_id: item.id, tipo: "saida", quantidade: uso, custo_unitario: null, validade: null, motivo: "Eventos da semana", data: dia(-3), lancar_no_caixa: false, lancamento_id: null, criado_em: new Date().toISOString() });
    recalcularDemo(b, item.id);
  }
}

/** Mesma conta que o banco faz: refaz o histórico em ordem. */
function recalcularDemo(b: BancoDemo, itemId: string) {
  let qtd = 0;
  let custo = 0;
  let val: string | null = null;
  const movs = b.movimentos!.filter((m) => m.item_id === itemId).sort((x, y) => x.data.localeCompare(y.data) || x.criado_em.localeCompare(y.criado_em));
  for (const m of movs) {
    if (m.tipo === "entrada") {
      if (m.custo_unitario !== null && qtd + m.quantidade > 0) custo = (Math.max(qtd, 0) * custo + m.quantidade * m.custo_unitario) / (Math.max(qtd, 0) + m.quantidade);
      qtd += m.quantidade;
      if (m.validade) val = m.validade;
    } else if (m.tipo === "saida") qtd -= m.quantidade;
    else qtd = m.quantidade;
  }
  b.itens = b.itens!.map((i) => (i.id === itemId ? { ...i, quantidade: Math.round(qtd * 1000) / 1000, custo_medio: custo, validade: qtd > 0 ? val : null } : i));
}

export async function listarItens(): Promise<ItemEstoque[]> {
  if (modoDemo) return [...lerDemo().itens!].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const { data, error } = await supabase().from("estoque_itens").select(CAMPOS_ITEM).order("nome");
  falhou(error);
  return (data as ItemEstoque[]).map(numItem);
}

export async function salvarItem(item: NovoItemEstoque & { id?: string }): Promise<string> {
  if (modoDemo) {
    const b = lerDemo();
    let id = item.id;
    if (id) b.itens = b.itens!.map((x) => (x.id === id ? { ...x, ...item, id: x.id } : x));
    else {
      id = uid();
      b.itens!.push({ ...item, id, quantidade: 0, custo_medio: 0, validade: null });
    }
    salvarDemo(b);
    return id;
  }
  const { id, ...campos } = item;
  if (id) {
    const { error } = await supabase().from("estoque_itens").update(campos).eq("id", id);
    falhou(error);
    return id;
  }
  const { data, error } = await supabase().from("estoque_itens").insert(campos).select("id").single();
  if (error?.code === "23505") throw new Error("Já existe um item com esse nome.");
  falhou(error);
  return data!.id as string;
}

export async function listarMovimentos(itemId: string): Promise<MovimentoEstoque[]> {
  if (modoDemo) {
    return lerDemo()
      .movimentos!.filter((m) => m.item_id === itemId)
      .sort((x, y) => y.data.localeCompare(x.data) || y.criado_em.localeCompare(x.criado_em));
  }
  const { data, error } = await supabase()
    .from("estoque_movimentos")
    .select(CAMPOS_MOV)
    .eq("item_id", itemId)
    .order("data", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(100);
  falhou(error);
  return (data as MovimentoEstoque[]).map(numMov);
}

export async function registrarMovimento(m: NovoMovimento): Promise<void> {
  if (modoDemo) {
    const b = lerDemo();
    let lancamento_id: string | null = null;
    const item = b.itens!.find((i) => i.id === m.item_id)!;
    if (m.tipo === "entrada" && m.lancar_no_caixa && m.custo_unitario) {
      const nomeCat = item.grupo === "Ingredientes" || item.grupo === "Bebidas" ? item.grupo : item.grupo === "Material de evento" ? "Aluguel de material" : "Outras saídas";
      lancamento_id = uid();
      b.lancamentos.push({
        id: lancamento_id,
        tipo: "saida",
        valor: Math.round(m.quantidade * m.custo_unitario * 100) / 100,
        data: m.data,
        descricao: `Compra estoque: ${item.nome}${m.motivo ? " - " + m.motivo : ""}`,
        categoria_id: b.categorias.find((c) => c.tipo === "saida" && c.nome === nomeCat)?.id ?? null,
        forma_pagamento: "pix",
        status: "pago",
      });
    }
    b.movimentos!.push({ ...m, id: uid(), lancamento_id, criado_em: new Date().toISOString() });
    recalcularDemo(b, m.item_id);
    salvarDemo(b);
    return;
  }
  const campos = { ...m };
  if (!campos.evento_id) delete campos.evento_id; // funciona mesmo antes de criar a agenda no banco
  const { error } = await supabase().from("estoque_movimentos").insert(campos);
  falhou(error);
}

/** Desfaz uma movimentação. Se ela tinha lançado a compra no caixa, o lançamento também sai. */
export async function excluirMovimento(m: MovimentoEstoque): Promise<void> {
  if (modoDemo) {
    const b = lerDemo();
    b.movimentos = b.movimentos!.filter((x) => x.id !== m.id);
    if (m.lancamento_id) b.lancamentos = b.lancamentos.filter((l) => l.id !== m.lancamento_id);
    recalcularDemo(b, m.item_id);
    salvarDemo(b);
    return;
  }
  const { error } = await supabase().from("estoque_movimentos").delete().eq("id", m.id);
  falhou(error);
  if (m.lancamento_id) {
    const r = await supabase().from("lancamentos").delete().eq("id", m.lancamento_id);
    falhou(r.error);
  }
}

// ---------------------------------------------------------------------
// Agenda (eventos)
// ---------------------------------------------------------------------
const CAMPOS_EVENTO = "id,cliente,titulo,tipo,data,hora_inicio,hora_fim,local,convidados,telefone,status,valor_total,observacao";

const hora = (h: string | null) => (h ? h.slice(0, 5) : null);
const numEvento = (e: Evento): Evento => ({ ...e, valor_total: Number(e.valor_total), hora_inicio: hora(e.hora_inicio), hora_fim: hora(e.hora_fim) });

function nomeRestante(ev: Evento) {
  return `Falta receber: ${ev.cliente}${ev.titulo ? " - " + ev.titulo : ""}`;
}

/** Mesmo cálculo do banco: mantém o lançamento "falta receber" do evento. */
function restanteDemo(b: BancoDemo, eventoId: string) {
  const ev = b.eventos?.find((e) => e.id === eventoId);
  if (!ev) return;
  const recebido = b.lancamentos.filter((l) => l.evento_id === eventoId && l.tipo === "entrada" && !l.evento_restante).reduce((s, l) => s + l.valor, 0);
  const falta = Math.round((ev.valor_total - recebido) * 100) / 100;
  b.lancamentos = b.lancamentos.filter((l) => !(l.evento_id === eventoId && l.evento_restante));
  if (ev.status === "orcamento" || ev.status === "cancelado" || falta <= 0) return;
  const nomeCat = ev.tipo === "Buffet" ? "Buffet" : ev.tipo === "Encomenda" ? "Encomendas" : "Eventos";
  b.lancamentos.push({
    id: uid(),
    tipo: "entrada",
    valor: falta,
    data: ev.data,
    descricao: nomeRestante(ev),
    categoria_id: b.categorias.find((c) => c.tipo === "entrada" && c.nome === nomeCat)?.id ?? null,
    forma_pagamento: "pix",
    status: "pendente",
    evento_id: eventoId,
    evento_restante: true,
  });
}

function eventosExemplo(b: BancoDemo) {
  b.eventos = [];
  // tira o "a receber" solto dos exemplos antigos, agora ele vem dos eventos
  b.lancamentos = b.lancamentos.filter((l) => l.descricao !== "Formatura (a receber)");
  const dia = (delta: number) => {
    const d = new Date();
    d.setDate(d.getDate() + delta);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const base = { titulo: "", hora_fim: null, convidados: null, telefone: "", observacao: "", local: "" };
  const lista: (NovoEvento & { sinal?: number })[] = [
    { ...base, cliente: "Ana e Pedro", titulo: "Casamento", tipo: "Casamento", data: dia(3), hora_inicio: "19:00", hora_fim: "02:00", local: "Espaço 512", convidados: 150, telefone: "15999990000", status: "confirmado", valor_total: 18500, sinal: 9000, observacao: "Cardápio italiano. 3 convidados veganos." },
    { ...base, cliente: "Construtora Lima", titulo: "Confraternização de fim de ano", tipo: "Corporativo", data: dia(9), hora_inicio: "12:00", hora_fim: "16:00", local: "Sede da empresa", convidados: 80, status: "confirmado", valor_total: 7200, sinal: 2000 },
    { ...base, cliente: "Júlia Martins", titulo: "Aniversário de 15 anos", tipo: "Aniversário", data: dia(16), hora_inicio: "20:00", local: "Clube Itapeva", convidados: 120, status: "orcamento", valor_total: 12000 },
    { ...base, cliente: "Dona Cida", titulo: "100 salgados + bolo", tipo: "Encomenda", data: dia(1), hora_inicio: "10:00", status: "confirmado", valor_total: 380, sinal: 0 },
    { ...base, cliente: "Marcos Ribeiro", titulo: "Buffet de aniversário", tipo: "Buffet", data: dia(-6), hora_inicio: "18:00", convidados: 40, status: "realizado", valor_total: 3200, sinal: 3200 },
  ];
  for (const { sinal, ...n } of lista) {
    const ev = { ...n, id: uid() };
    b.eventos.push(ev);
    if (sinal) {
      b.lancamentos.push({
        id: uid(), tipo: "entrada", valor: sinal, data: dia(-12), descricao: `Sinal: ${ev.cliente}`, forma_pagamento: "pix", status: "pago",
        categoria_id: b.categorias.find((c) => c.tipo === "entrada" && c.nome === (ev.tipo === "Buffet" ? "Buffet" : ev.tipo === "Encomenda" ? "Encomendas" : "Eventos"))?.id ?? null,
        evento_id: ev.id,
      });
    }
    restanteDemo(b, ev.id);
  }
}

export async function listarEventos(de: string, ate: string): Promise<Evento[]> {
  if (modoDemo) return lerDemo().eventos!.filter((e) => e.data >= de && e.data <= ate).sort((a, b) => (a.data + (a.hora_inicio ?? "")).localeCompare(b.data + (b.hora_inicio ?? "")));
  const { data, error } = await supabase().from("eventos").select(CAMPOS_EVENTO).gte("data", de).lte("data", ate).order("data").order("hora_inicio", { nullsFirst: true });
  falhou(error);
  return (data as Evento[]).map(numEvento);
}

/** Salva o evento. Se vier um sinal, ele entra no caixa como pagamento recebido. */
export async function salvarEvento(ev: NovoEvento & { id?: string }, sinal?: { valor: number; data: string; forma: Lancamento["forma_pagamento"] }): Promise<string> {
  const descSinal = (e: NovoEvento) => `Sinal: ${e.cliente}${e.titulo ? " - " + e.titulo : ""}`;
  if (modoDemo) {
    const b = lerDemo();
    const id = ev.id ?? uid();
    if (ev.id) b.eventos = b.eventos!.map((x) => (x.id === id ? { ...ev, id } : x));
    else b.eventos!.push({ ...ev, id });
    if (sinal && sinal.valor > 0) {
      const nomeCat = ev.tipo === "Buffet" ? "Buffet" : ev.tipo === "Encomenda" ? "Encomendas" : "Eventos";
      b.lancamentos.push({
        id: uid(), tipo: "entrada", valor: sinal.valor, data: sinal.data, descricao: descSinal(ev), forma_pagamento: sinal.forma, status: "pago",
        categoria_id: b.categorias.find((c) => c.tipo === "entrada" && c.nome === nomeCat)?.id ?? null, evento_id: id,
      });
    }
    restanteDemo(b, id);
    salvarDemo(b);
    return id;
  }
  const { id, ...campos } = ev;
  let eventoId = id;
  if (id) {
    const { error } = await supabase().from("eventos").update(campos).eq("id", id);
    falhou(error);
  } else {
    const { data, error } = await supabase().from("eventos").insert(campos).select("id").single();
    falhou(error);
    eventoId = data!.id as string;
  }
  if (sinal && sinal.valor > 0) {
    const cats = await listarCategorias();
    const nomeCat = ev.tipo === "Buffet" ? "Buffet" : ev.tipo === "Encomenda" ? "Encomendas" : "Eventos";
    await salvarLancamento({
      tipo: "entrada", valor: sinal.valor, data: sinal.data, descricao: descSinal(ev), forma_pagamento: sinal.forma, status: "pago",
      categoria_id: cats.find((c) => c.tipo === "entrada" && c.nome === nomeCat)?.id ?? null, evento_id: eventoId,
    });
  }
  return eventoId!;
}

/** Apaga o evento. Os pagamentos e o "falta receber" dele saem do caixa juntos. */
export async function excluirEvento(id: string): Promise<void> {
  if (modoDemo) {
    const b = lerDemo();
    b.eventos = b.eventos!.filter((e) => e.id !== id);
    b.lancamentos = b.lancamentos.filter((l) => l.evento_id !== id);
    b.movimentos = b.movimentos!.map((m) => (m.evento_id === id ? { ...m, evento_id: null } : m));
    salvarDemo(b);
    return;
  }
  const { error } = await supabase().from("eventos").delete().eq("id", id);
  falhou(error);
}

/** Pagamentos já recebidos (ou agendados) e o "falta receber" do evento. */
export async function lancamentosDoEvento(id: string): Promise<Lancamento[]> {
  if (modoDemo) return lerDemo().lancamentos.filter((l) => l.evento_id === id).sort((a, b) => a.data.localeCompare(b.data));
  const { data, error } = await supabase()
    .from("lancamentos")
    .select("id,tipo,valor,data,descricao,categoria_id,forma_pagamento,status,boleto_id,evento_id,evento_restante")
    .eq("evento_id", id)
    .order("data");
  falhou(error);
  return (data ?? []).map((l) => ({ ...l, valor: Number(l.valor) })) as Lancamento[];
}

/** Saídas do estoque feitas para o evento. */
export async function estoqueDoEvento(id: string): Promise<{ nome: string; quantidade: number; unidade: string; custo: number }[]> {
  if (modoDemo) {
    const b = lerDemo();
    return b.movimentos!
      .filter((m) => m.evento_id === id && m.tipo === "saida")
      .map((m) => {
        const it = b.itens!.find((i) => i.id === m.item_id);
        return { nome: it?.nome ?? "?", quantidade: m.quantidade, unidade: it?.unidade ?? "", custo: m.quantidade * (it?.custo_medio ?? 0) };
      });
  }
  const { data, error } = await supabase()
    .from("estoque_movimentos")
    .select("quantidade, estoque_itens(nome, unidade, custo_medio)")
    .eq("evento_id", id)
    .eq("tipo", "saida");
  falhou(error);
  return (data ?? []).map((m) => {
    const it = (Array.isArray(m.estoque_itens) ? m.estoque_itens[0] : m.estoque_itens) as { nome: string; unidade: string; custo_medio: number } | null;
    return { nome: it?.nome ?? "?", quantidade: Number(m.quantidade), unidade: it?.unidade ?? "", custo: Number(m.quantidade) * Number(it?.custo_medio ?? 0) };
  });
}

/** Compromissos do Google Agenda no período (só aparecem se o link secreto estiver configurado). */
export async function compromissosGoogle(de: string, ate: string): Promise<{ configurado: boolean; itens: CompromissoGoogle[] }> {
  if (modoDemo) {
    const d = (delta: number) => {
      const x = new Date();
      x.setDate(x.getDate() + delta);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    };
    const itens: CompromissoGoogle[] = [
      { id: "g1", titulo: "Degustação com noivos (Ana e Pedro)", inicio: `${d(0)}T15:00:00-03:00`, fim: null, diaInteiro: false, data: d(0), local: "" },
      { id: "g2", titulo: "Dentista", inicio: `${d(2)}T09:30:00-03:00`, fim: null, diaInteiro: false, data: d(2), local: "" },
      { id: "g3", titulo: "Visita técnica Clube Itapeva", inicio: `${d(5)}T10:00:00-03:00`, fim: null, diaInteiro: false, data: d(5), local: "Clube Itapeva" },
    ];
    return { configurado: true, itens: itens.filter((i) => i.data >= de && i.data <= ate) };
  }
  const { data } = await supabase().auth.getSession();
  const token = data.session?.access_token;
  const r = await fetch(`/api/google-agenda?de=${de}&ate=${ate}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.erro ?? "Não deu para ler o Google Agenda.");
  return r.json();
}

/** Eventos dos próximos dias, para listas de escolha (estoque) e para o Início. */
export async function proximosEventos(dias = 30): Promise<Evento[]> {
  const hoje = hojeISO();
  const fim = new Date();
  fim.setDate(fim.getDate() + dias);
  const ate = `${fim.getFullYear()}-${String(fim.getMonth() + 1).padStart(2, "0")}-${String(fim.getDate()).padStart(2, "0")}`;
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 7);
  const de = `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, "0")}-${String(inicio.getDate()).padStart(2, "0")}`;
  const lista = await listarEventos(dias > 0 ? de : hoje, ate);
  return lista.filter((e) => e.status !== "cancelado");
}
