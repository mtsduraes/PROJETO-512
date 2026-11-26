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
}

export type NovoLancamento = Omit<Lancamento, "id">;

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
