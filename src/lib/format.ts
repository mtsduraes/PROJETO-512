const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function dinheiro(v: number) {
  return brl.format(v);
}

/** "2026-11-26" -> "26/11/2026" */
export function dataBR(iso: string) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** "2026-11" -> "nov/26" */
export function mesCurto(mes: string) {
  const [a, m] = mes.split("-");
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
}

/** "2026-11" -> "Novembro de 2026" */
export function mesLongo(mes: string) {
  const [a, m] = mes.split("-");
  return `${MESES_LONGOS[Number(m) - 1]} de ${a}`;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function mesAtual() {
  return hojeISO().slice(0, 7);
}

/** Soma (ou subtrai) meses de "AAAA-MM". */
export function somarMes(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Primeiro e último dia de "AAAA-MM". */
export function limitesDoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(a, m, 0).getDate();
  return { de: `${mes}-01`, ate: `${mes}-${pad(ultimo)}` };
}

/** Converte "1.234,56" ou "1234.56" em número. */
export function lerValor(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, "");
  const normal = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  return Number(normal);
}
