"use client";

import { useState } from "react";
import { Folha } from "@/components/estoque/Folha";
import { excluirEvento, salvarEvento } from "@/lib/dados";
import { hojeISO, lerValor } from "@/lib/format";
import { FORMAS_PAGAMENTO, STATUS_EVENTO, TIPOS_EVENTO, type Evento, type FormaPagamento, type StatusEvento, type TipoEvento } from "@/lib/types";

interface Props {
  inicial?: Evento | null;
  dataSugerida?: string;
  onFechar: () => void;
  onSalvo: (id: string) => void;
  onExcluido?: () => void;
}

export function FormEvento({ inicial, dataSugerida, onFechar, onSalvo, onExcluido }: Props) {
  const [cliente, setCliente] = useState(inicial?.cliente ?? "");
  const [titulo, setTitulo] = useState(inicial?.titulo ?? "");
  const [tipo, setTipo] = useState<TipoEvento>(inicial?.tipo ?? "Casamento");
  const [data, setData] = useState(inicial?.data ?? dataSugerida ?? hojeISO());
  const [horaInicio, setHoraInicio] = useState(inicial?.hora_inicio ?? "");
  const [horaFim, setHoraFim] = useState(inicial?.hora_fim ?? "");
  const [local, setLocal] = useState(inicial?.local ?? "");
  const [convidados, setConvidados] = useState(inicial?.convidados ? String(inicial.convidados) : "");
  const [telefone, setTelefone] = useState(inicial?.telefone ?? "");
  const [status, setStatus] = useState<StatusEvento>(inicial?.status ?? "confirmado");
  const [valor, setValor] = useState(inicial?.valor_total ? inicial.valor_total.toFixed(2).replace(".", ",") : "");
  const [sinal, setSinal] = useState("");
  const [formaSinal, setFormaSinal] = useState<FormaPagamento>("pix");
  const [observacao, setObservacao] = useState(inicial?.observacao ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const total = valor.trim() ? lerValor(valor) : 0;
    const vSinal = sinal.trim() ? lerValor(sinal) : 0;
    const conv = convidados.trim() ? Number(convidados) : null;
    if (!cliente.trim()) return setErro("Diga quem é o cliente.");
    if (!Number.isFinite(total) || total < 0) return setErro("O valor fechado precisa ser um número.");
    if (!Number.isFinite(vSinal) || vSinal < 0) return setErro("O sinal precisa ser um número.");
    if (conv !== null && (!Number.isInteger(conv) || conv < 0)) return setErro("Convidados precisa ser um número inteiro.");
    setSalvando(true);
    setErro("");
    try {
      const id = await salvarEvento(
        {
          id: inicial?.id,
          cliente: cliente.trim(),
          titulo: titulo.trim(),
          tipo,
          data,
          hora_inicio: horaInicio || null,
          hora_fim: horaFim || null,
          local: local.trim(),
          convidados: conv,
          telefone: telefone.trim(),
          status,
          valor_total: Math.round(total * 100) / 100,
          observacao: observacao.trim(),
        },
        vSinal > 0 ? { valor: Math.round(vSinal * 100) / 100, data: hojeISO(), forma: formaSinal } : undefined,
      );
      onSalvo(id);
    } catch (err) {
      setErro("Não deu para salvar: " + (err as Error).message);
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!inicial || !window.confirm("Excluir este evento? Os pagamentos dele também saem do caixa. Não dá para desfazer.")) return;
    setSalvando(true);
    try {
      await excluirEvento(inicial.id);
      onExcluido?.();
    } catch (err) {
      setErro("Não deu para excluir: " + (err as Error).message);
      setSalvando(false);
    }
  }

  const campo = "w-full rounded-lg border border-linha bg-superficie px-3 py-2.5 focus:border-jade focus:outline-none";
  const rotulo = "mb-1 block text-sm text-tinta-suave";

  return (
    <Folha titulo={inicial ? "Editar evento" : "Novo evento"} onFechar={onFechar} larga>
      <form onSubmit={enviar} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 block sm:col-span-1">
            <span className={rotulo}>Cliente</span>
            <input className={campo} placeholder="Ex.: Ana e Pedro" value={cliente} onChange={(e) => setCliente(e.target.value)} autoFocus={!inicial} required />
          </label>
          <label className="col-span-2 block sm:col-span-1">
            <span className={rotulo}>Nome do evento (opcional)</span>
            <input className={campo} placeholder="Ex.: Casamento" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={rotulo}>Tipo</span>
            <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value as TipoEvento)}>
              {TIPOS_EVENTO.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={rotulo}>Situação</span>
            <select className={campo} value={status} onChange={(e) => setStatus(e.target.value as StatusEvento)}>
              {STATUS_EVENTO.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="col-span-3 block sm:col-span-1">
            <span className={rotulo}>Data</span>
            <input type="date" className={campo} value={data} onChange={(e) => setData(e.target.value)} required />
          </label>
          <label className="block sm:col-span-1">
            <span className={rotulo}>Começa</span>
            <input type="time" className={campo} value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
          </label>
          <label className="col-span-2 block sm:col-span-1">
            <span className={rotulo}>Termina</span>
            <input type="time" className={campo} value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <label className="col-span-2 block">
            <span className={rotulo}>Local</span>
            <input className={campo} placeholder="Ex.: Espaço 512" value={local} onChange={(e) => setLocal(e.target.value)} />
          </label>
          <label className="block">
            <span className={rotulo}>Convidados</span>
            <input className={campo} inputMode="numeric" placeholder="0" value={convidados} onChange={(e) => setConvidados(e.target.value)} />
          </label>
        </div>

        <label className="block">
          <span className={rotulo}>WhatsApp do cliente</span>
          <input className={campo} type="tel" inputMode="tel" placeholder="(15) 99999-0000" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </label>

        <fieldset className="rounded-xl border border-linha p-3">
          <legend className="px-1 text-sm font-medium">Valores</legend>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={rotulo}>Valor fechado (R$)</span>
              <input className={`${campo} font-semibold`} inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} />
            </label>
            <label className="block">
              <span className={rotulo}>{inicial ? "Novo pagamento hoje (R$)" : "Sinal recebido (R$)"}</span>
              <input className={campo} inputMode="decimal" placeholder="0,00" value={sinal} onChange={(e) => setSinal(e.target.value)} />
            </label>
          </div>
          {sinal.trim() && (
            <label className="mt-3 block">
              <span className={rotulo}>Recebido por</span>
              <select className={campo} value={formaSinal} onChange={(e) => setFormaSinal(e.target.value as FormaPagamento)}>
                {FORMAS_PAGAMENTO.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.rotulo}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="mt-2 text-xs text-tinta-suave">
            {status === "orcamento"
              ? "Enquanto for orçamento, nada entra no caixa como \"falta receber\". Ao confirmar, o restante entra sozinho."
              : "O sinal entra no caixa como recebido hoje, e o restante aparece como \"falta receber\" na data do evento."}
          </p>
        </fieldset>

        <label className="block">
          <span className={rotulo}>Observações (cardápio, restrições, detalhes)</span>
          <textarea className={`${campo} min-h-20`} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </label>

        {erro && <p className="rounded-lg bg-erro-claro px-3 py-2 text-sm text-erro">{erro}</p>}

        <div className="flex gap-2">
          {inicial && (
            <button type="button" onClick={excluir} disabled={salvando} className="rounded-lg border border-erro/40 px-4 py-3 text-erro">
              Excluir
            </button>
          )}
          <button type="submit" disabled={salvando} className="flex-1 rounded-lg bg-tinta py-3 font-semibold text-porcelana disabled:opacity-60">
            {salvando ? "Salvando…" : inicial ? "Salvar evento" : "Cadastrar evento"}
          </button>
        </div>
      </form>
    </Folha>
  );
}
