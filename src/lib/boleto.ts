/**
 * Leitura da linha digitável de boletos brasileiros.
 * - Boleto bancário: 47 dígitos (valor e vencimento ficam no último bloco).
 * - Contas de consumo/tributos (concessionárias): 48 dígitos, começam com 8 (valor quase sempre presente, vencimento não).
 */

export interface LeituraBoleto {
  tipo: "bancario" | "concessionaria";
  valido: boolean;
  erro?: string;
  valor: number | null;
  vencimento: string | null; // AAAA-MM-DD
  digitos: string;
}

export function soDigitos(texto: string) {
  return texto.replace(/\D/g, "");
}

function mod10(numero: string) {
  let soma = 0;
  let peso = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    let p = Number(numero[i]) * peso;
    if (p > 9) p = Math.floor(p / 10) + (p % 10);
    soma += p;
    peso = peso === 2 ? 1 : 2;
  }
  const resto = soma % 10;
  return resto === 0 ? 0 : 10 - resto;
}

/** Módulo 11 do boleto bancário (pesos 2 a 9). */
function mod11Bancario(numero: string) {
  let soma = 0;
  let peso = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    soma += Number(numero[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const dv = 11 - (soma % 11);
  return dv === 0 || dv === 10 || dv === 11 ? 1 : dv;
}

/** Módulo 11 das concessionárias (pesos 2 a 9; resto 0 ou 1 => 0, 10 => 1 em alguns casos). */
function mod11Concessionaria(numero: string) {
  let soma = 0;
  let peso = 2;
  for (let i = numero.length - 1; i >= 0; i--) {
    soma += Number(numero[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  if (resto === 0 || resto === 1) return 0;
  if (resto === 10) return 1;
  return 11 - resto;
}

function iso(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Converte o "fator de vencimento" em data.
 * O fator conta dias a partir de 07/10/1997 e chegou a 9999 em 21/02/2025;
 * desde 22/02/2025 ele recomeça em 1000. Escolhemos a data mais próxima de hoje.
 */
export function dataDoFator(fator: number, hoje = new Date()): string | null {
  if (!fator) return null;
  const dia = 86_400_000;
  const antiga = new Date(Date.UTC(1997, 9, 7) + fator * dia);
  const nova = new Date(Date.UTC(2025, 1, 22) + (fator - 1000) * dia);
  const agora = hoje.getTime();
  const escolhida = Math.abs(nova.getTime() - agora) < Math.abs(antiga.getTime() - agora) ? nova : antiga;
  return iso(escolhida);
}

export function lerLinhaDigitavel(texto: string, hoje = new Date()): LeituraBoleto {
  const d = soDigitos(texto);

  if (d.length === 47) {
    const campos = [
      [d.slice(0, 9), d[9]],
      [d.slice(10, 20), d[20]],
      [d.slice(21, 31), d[31]],
    ];
    const camposOk = campos.every(([num, dv]) => mod10(num) === Number(dv));
    // Monta o código de barras (44 dígitos) para conferir o dígito geral.
    const barras = d.slice(0, 4) + d[32] + d.slice(33, 47) + d.slice(4, 9) + d.slice(10, 20) + d.slice(21, 31);
    const geralOk = mod11Bancario(barras.slice(0, 4) + barras.slice(5)) === Number(barras[4]);
    const fator = Number(d.slice(33, 37));
    const valor = Number(d.slice(37, 47)) / 100;
    const valido = camposOk && geralOk;
    return {
      tipo: "bancario",
      valido,
      erro: valido ? undefined : "Algum número parece estar errado. Confira a linha digitável.",
      valor: valor > 0 ? valor : null,
      vencimento: dataDoFator(fator, hoje),
      digitos: d,
    };
  }

  if (d.length === 48 && d[0] === "8") {
    const blocos = [0, 1, 2, 3].map((i) => d.slice(i * 12, i * 12 + 12));
    const idValor = d[2];
    const calc = idValor === "6" || idValor === "7" ? mod10 : mod11Concessionaria;
    const valido = blocos.every((b) => calc(b.slice(0, 11)) === Number(b[11]));
    const barras = blocos.map((b) => b.slice(0, 11)).join("");
    const efetivo = idValor === "6" || idValor === "8";
    const valor = efetivo ? Number(barras.slice(4, 15)) / 100 : null;
    return {
      tipo: "concessionaria",
      valido,
      erro: valido ? undefined : "Algum número parece estar errado. Confira a linha digitável.",
      valor: valor && valor > 0 ? valor : null,
      vencimento: null,
      digitos: d,
    };
  }

  return {
    tipo: d.startsWith("8") ? "concessionaria" : "bancario",
    valido: false,
    erro: d.length === 0 ? undefined : `A linha digitável tem 47 ou 48 números. Esta tem ${d.length}.`,
    valor: null,
    vencimento: null,
    digitos: d,
  };
}

/** Formata a linha digitável com os espaços e pontos de costume, para facilitar a leitura. */
export function formatarLinha(d: string) {
  if (d.length === 47) {
    return `${d.slice(0, 5)}.${d.slice(5, 10)} ${d.slice(10, 15)}.${d.slice(15, 21)} ${d.slice(21, 26)}.${d.slice(26, 32)} ${d[32]} ${d.slice(33)}`;
  }
  if (d.length === 48) return [0, 1, 2, 3].map((i) => d.slice(i * 12, i * 12 + 11) + "-" + d[i * 12 + 11]).join(" ");
  return d;
}
