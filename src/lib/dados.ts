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
  ItemEstoque,
  Lancamento,
  MovimentoEstoque,
  NovoBoleto,
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
    if (mudou) salvarDemo(b);
    return b;
  }
  const categorias = CATEGORIAS_INICIAIS.map(([nome, tipo]) => ({ id: uid(), nome, tipo, ativa: true }));
  const banco: BancoDemo = { categorias, lancamentos: exemplos(categorias) };
  boletosExemplo(banco);
  estoqueExemplo(banco);
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
    .select("id,tipo,valor,data,descricao,categoria_id,forma_pagamento,status,boleto_id")
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
    if (l.id) b.lancamentos = b.lancamentos.map((x) => (x.id === l.id ? { ...x, ...l, id: x.id } : x));
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
  const { error } = await supabase().from("estoque_movimentos").insert(m);
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
