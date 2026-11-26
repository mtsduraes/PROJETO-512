export type Tipo = "entrada" | "saida";
export type Status = "pago" | "pendente";
export type FormaPagamento =
  | "pix"
  | "dinheiro"
  | "cartao_credito"
  | "cartao_debito"
  | "boleto"
  | "transferencia"
  | "outro";

export interface Categoria {
  id: string;
  nome: string;
  tipo: Tipo;
  ativa: boolean;
}

export interface Lancamento {
  id: string;
  tipo: Tipo;
  valor: number;
  data: string; // AAAA-MM-DD
  descricao: string;
  categoria_id: string | null;
  forma_pagamento: FormaPagamento;
  status: Status;
  boleto_id?: string | null;
}

export type NovoLancamento = Omit<Lancamento, "id" | "boleto_id">;

export interface ResumoSaldo {
  saldo: number;
  a_receber: number;
  a_pagar: number;
}

export interface ResumoMes {
  mes: string; // AAAA-MM
  entradas: number;
  saidas: number;
}

export const FORMAS_PAGAMENTO: { valor: FormaPagamento; rotulo: string }[] = [
  { valor: "pix", rotulo: "Pix" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "cartao_credito", rotulo: "Cartão de crédito" },
  { valor: "cartao_debito", rotulo: "Cartão de débito" },
  { valor: "boleto", rotulo: "Boleto" },
  { valor: "transferencia", rotulo: "Transferência" },
  { valor: "outro", rotulo: "Outro" },
];

export function rotuloForma(f: FormaPagamento) {
  return FORMAS_PAGAMENTO.find((x) => x.valor === f)?.rotulo ?? f;
}

export type StatusBoleto = "a_pagar" | "pago";

export interface Boleto {
  id: string;
  fornecedor: string;
  descricao: string;
  valor: number;
  vencimento: string; // AAAA-MM-DD
  linha_digitavel: string;
  categoria_id: string | null;
  status: StatusBoleto;
  pago_em: string | null;
  anexo_path: string | null;
  observacao: string;
}

export type NovoBoleto = Omit<Boleto, "id">;

export const GRUPOS_ESTOQUE = ["Ingredientes", "Bebidas", "Descartáveis", "Limpeza", "Material de evento", "Outros"] as const;
export type GrupoEstoque = (typeof GRUPOS_ESTOQUE)[number];

export const UNIDADES: { valor: string; rotulo: string }[] = [
  { valor: "un", rotulo: "unidade" },
  { valor: "kg", rotulo: "kg" },
  { valor: "g", rotulo: "g" },
  { valor: "L", rotulo: "litro" },
  { valor: "ml", rotulo: "ml" },
  { valor: "cx", rotulo: "caixa" },
  { valor: "pct", rotulo: "pacote" },
  { valor: "dz", rotulo: "dúzia" },
  { valor: "fardo", rotulo: "fardo" },
];

export interface ItemEstoque {
  id: string;
  nome: string;
  grupo: GrupoEstoque;
  unidade: string;
  local: string;
  minimo: number;
  quantidade: number;
  custo_medio: number;
  validade: string | null;
  ativo: boolean;
}

export type NovoItemEstoque = Pick<ItemEstoque, "nome" | "grupo" | "unidade" | "local" | "minimo" | "ativo">;

export type TipoMovimento = "entrada" | "saida" | "ajuste";

export interface MovimentoEstoque {
  id: string;
  item_id: string;
  tipo: TipoMovimento;
  quantidade: number;
  custo_unitario: number | null;
  validade: string | null;
  motivo: string;
  data: string;
  lancar_no_caixa: boolean;
  lancamento_id: string | null;
  criado_em: string;
}

export type NovoMovimento = Omit<MovimentoEstoque, "id" | "lancamento_id" | "criado_em">;
