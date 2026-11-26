/** Transforma o texto .ics do Google Agenda na lista de compromissos de um período (roda só no servidor). */
import ical, { type VEvent } from "node-ical";
import type { CompromissoGoogle } from "./types";

const FUSO = "America/Sao_Paulo";
const dataNoFuso = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

function texto(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v && "val" in v) return String((v as { val: unknown }).val ?? "");
  return String(v);
}

export function lerCompromissos(ics: string, inicio: Date, fim: Date): CompromissoGoogle[] {
  const dados = ical.sync.parseICS(ics);
  const itens: CompromissoGoogle[] = [];
  for (const item of Object.values(dados)) {
    if (!item || item.type !== "VEVENT") continue;
    const ev = item as VEvent;
    if (ev.recurrenceid) continue; // modificações de eventos repetidos já vêm na expansão
    const instancias = ical.expandRecurringEvent(ev, { from: inicio, to: fim, expandOngoing: true });
    for (const inst of instancias) {
      const comeco = inst.start as Date & { tz?: string };
      const data = inst.isFullDay
        ? new Intl.DateTimeFormat("en-CA", { timeZone: comeco.tz ?? "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(comeco)
        : dataNoFuso.format(comeco);
      itens.push({
        id: `${ev.uid}-${comeco.toISOString()}`,
        titulo: texto(inst.summary ?? ev.summary) || "(sem título)",
        inicio: comeco.toISOString(),
        fim: inst.end ? (inst.end as Date).toISOString() : null,
        diaInteiro: !!inst.isFullDay,
        data,
        local: texto(ev.location),
      });
    }
    if (itens.length > 500) break;
  }
  return itens.sort((a, b) => a.inicio.localeCompare(b.inicio));
}
