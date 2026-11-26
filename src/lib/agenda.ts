import { STATUS_EVENTO, type Evento, type StatusEvento } from "./types";

export function rotuloStatus(s: StatusEvento) {
  return STATUS_EVENTO.find((x) => x.valor === s)?.rotulo ?? s;
}

/** Classes de cor de cada situação (com texto, nunca só cor). */
export const COR_STATUS: Record<StatusEvento, { ponto: string; selo: string }> = {
  orcamento: { ponto: "bg-ambar", selo: "bg-ambar-claro text-ambar-texto" },
  confirmado: { ponto: "bg-jade", selo: "bg-jade-claro text-jade-texto" },
  realizado: { ponto: "bg-tinta-suave", selo: "bg-porcelana text-tinta-suave" },
  cancelado: { ponto: "bg-erro", selo: "bg-erro-claro text-erro" },
};

const semTraco = (d: string) => d.replace(/-/g, "");
const semDoisPontos = (h: string) => h.replace(":", "") + "00";

function diaSeguinte(iso: string) {
  const [a, m, d] = iso.split("-").map(Number);
  const x = new Date(Date.UTC(a, m - 1, d + 1));
  return `${x.getUTCFullYear()}${String(x.getUTCMonth() + 1).padStart(2, "0")}${String(x.getUTCDate()).padStart(2, "0")}`;
}

/** Link que abre o Google Agenda já com o evento preenchido (a pessoa só confirma). */
export function linkGoogleAgenda(ev: Evento) {
  let datas: string;
  if (ev.hora_inicio) {
    const ini = `${semTraco(ev.data)}T${semDoisPontos(ev.hora_inicio)}`;
    let fimData = ev.data;
    let fimHora = ev.hora_fim;
    if (!fimHora) {
      const [h, m] = ev.hora_inicio.split(":").map(Number);
      fimHora = `${String(Math.min(h + 4, 23)).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    } else if (fimHora <= ev.hora_inicio) {
      // termina depois da meia-noite
      const [a, mm, d] = ev.data.split("-").map(Number);
      const x = new Date(Date.UTC(a, mm - 1, d + 1));
      fimData = `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, "0")}-${String(x.getUTCDate()).padStart(2, "0")}`;
    }
    datas = `${ini}/${semTraco(fimData)}T${semDoisPontos(fimHora)}`;
  } else {
    datas = `${semTraco(ev.data)}/${diaSeguinte(ev.data)}`;
  }
  const detalhes = [
    `${ev.tipo} - ${rotuloStatus(ev.status)}`,
    ev.convidados ? `${ev.convidados} convidados` : "",
    ev.telefone ? `Cliente: ${ev.telefone}` : "",
    ev.observacao,
    "Cadastrado no Caderno de Caixa da 512.",
  ]
    .filter(Boolean)
    .join("\n");
  const p = new URLSearchParams({
    action: "TEMPLATE",
    text: `${ev.cliente}${ev.titulo ? " - " + ev.titulo : ""}`,
    dates: datas,
    ctz: "America/Sao_Paulo",
    details: detalhes,
    location: ev.local,
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

/** Link do WhatsApp do cliente (acrescenta o 55 do Brasil quando falta). */
export function linkWhatsApp(telefone: string) {
  let d = telefone.replace(/\D/g, "");
  if (!d) return null;
  if (d.length <= 11) d = "55" + d;
  return `https://wa.me/${d}`;
}

/** Monta a grade do mês (semanas começando no domingo). */
export function gradeDoMes(mes: string) {
  const [a, m] = mes.split("-").map(Number);
  const primeiro = new Date(a, m - 1, 1);
  const inicio = new Date(primeiro);
  inicio.setDate(1 - primeiro.getDay());
  const dias: { iso: string; doMes: boolean; dia: number }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dias.push({ iso, doMes: d.getMonth() === m - 1, dia: d.getDate() });
  }
  // corta a última semana se ela for toda do mês seguinte
  while (dias.length > 35 && dias.slice(-7).every((x) => !x.doMes)) dias.splice(-7);
  return dias;
}

export function horario(ev: Pick<Evento, "hora_inicio" | "hora_fim">) {
  if (!ev.hora_inicio) return "dia todo";
  return ev.hora_fim ? `${ev.hora_inicio} às ${ev.hora_fim}` : ev.hora_inicio;
}
