import { lerLinhaDigitavel, dataDoFator, formatarLinha } from "../src/lib/boleto.ts";
import assert from "node:assert/strict";

function mod10(n: string) { let s=0,p=2; for (let i=n.length-1;i>=0;i--){let x=Number(n[i])*p; if(x>9)x=Math.floor(x/10)+x%10; s+=x; p=p===2?1:2;} const r=s%10; return r===0?0:10-r; }
function mod11(n: string) { let s=0,p=2; for (let i=n.length-1;i>=0;i--){ s+=Number(n[i])*p; p=p===9?2:p+1;} const d=11-(s%11); return d===0||d===10||d===11?1:d; }

function gerar(fator: number, valor: number) {
  const livre = "1090000012345678901234567"; // 25 dígitos
  const semDv = "3419" + String(fator).padStart(4,"0") + String(Math.round(valor*100)).padStart(10,"0") + livre;
  const dv = mod11(semDv);
  const barras = semDv.slice(0,4) + dv + semDv.slice(4);
  const c1 = barras.slice(0,4) + barras.slice(19,24); const c2 = barras.slice(24,34); const c3 = barras.slice(34,44);
  return c1 + mod10(c1) + c2 + mod10(c2) + c3 + mod10(c3) + barras[4] + barras.slice(5,19);
}

const hoje = new Date(Date.UTC(2026, 10, 26));
// 10/12/2026 no fator novo: dias desde 22/02/2025 + 1000
const dias = (Date.UTC(2026, 11, 10) - Date.UTC(2025, 1, 22)) / 86400000;
const linha = gerar(1000 + dias, 1234.56);
assert.equal(linha.length, 47);
const r = lerLinhaDigitavel(formatarLinha(linha), hoje);
assert.equal(r.valido, true, "bancário válido");
assert.equal(r.valor, 1234.56);
assert.equal(r.vencimento, "2026-12-10");

// dígito trocado é detectado
const errada = linha.slice(0, 15) + ((Number(linha[15]) + 1) % 10) + linha.slice(16);
assert.equal(lerLinhaDigitavel(errada, hoje).valido, false, "detecta erro");

// fator antigo (antes de 2025) continua certo quando a data é antiga
assert.equal(dataDoFator(1000, new Date(Date.UTC(2001, 0, 1))), "2000-07-03");
assert.equal(dataDoFator(9999, new Date(Date.UTC(2025, 1, 1))), "2025-02-21");
assert.equal(dataDoFator(1000, hoje), "2025-02-22");

// concessionária (48 dígitos, valor efetivo id 6, DV módulo 10)
const semDv = "826" + String(15790).padStart(11, "0") + "0001" + "2026121000000000000000000";
assert.equal(semDv.length, 43);
const barras = semDv.slice(0, 3) + mod10(semDv) + semDv.slice(3);
const blocos = [0,1,2,3].map(i => barras.slice(i*11, i*11+11));
const conc = blocos.map(b => b + mod10(b)).join("");
const rc = lerLinhaDigitavel(conc, hoje);
assert.equal(rc.tipo, "concessionaria");
assert.equal(rc.valido, true, "concessionária válida");
assert.equal(rc.valor, 157.9);

// tamanho errado
assert.match(lerLinhaDigitavel("123", hoje).erro!, /47 ou 48/);
console.log("todos os testes de boleto passaram ✔", formatarLinha(linha));
