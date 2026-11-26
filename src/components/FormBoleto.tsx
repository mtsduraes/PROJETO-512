"use client";

import { useMemo, useState } from "react";
import { formatarLinha, lerLinhaDigitavel } from "@/lib/boleto";
import { dataBR, dinheiro, hojeISO, lerValor } from "@/lib/format";
import { excluirBoleto, salvarBoleto } from "@/lib/dados";
import { modoDemo } from "@/lib/supabase";
import type { Boleto, Categoria } from "@/lib/types";

interface Props {
  categorias: Categoria[];
  fornecedores: string[];
  inicial?: Boleto | null;
  onFechar: () => void;
  onSalvo: () => void;
}

export function FormBoleto({ categorias, fornecedores, inicial, onFechar, onSalvo }: Props) {
  const [linha, setLinha] = useState(inicial?.linha_digitavel ? formatarLinha(inicial.linha_digitavel) : "");
  const [fornecedor, setFornecedor] = useState(inicial?.fornecedor ?? "");
  const [descricao, setDescricao] = useState(inicial?.descricao ?? "");
  const [valor, setValor] = useState(inicial ? inicial.valor.toFixed(2).replace(".", ",") : "");
  const [vencimento, setVencimento] = useState(inicial?.vencimento ?? hojeISO());
  const [categoriaId, setCategoriaId] = useState(inicial?.categoria_id ?? "");
  const [observacao, setObservacao] = useState(inicial?.observacao ?? "");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [preenchido, setPreenchido] = useState("");

  const leitura = useMemo(() => lerLinhaDigitavel(linha), [linha]);
  const opcoes = categorias.filter((c) => c.tipo === "saida" && (c.ativa || c.id === categoriaId));

  function mudarLinha(texto: string) {
    setLinha(texto);
    const r = lerLinhaDigitavel(texto);
    if (!r.valido) return setPreenchido("");
    const partes: string[] = [];
    if (r.valor) {
      setValor(r.valor.toFixed(2).replace(".", ","));
      partes.push(`valor ${dinheiro(r.valor)}`);
    }
    if (r.vencimento) {
      setVencimento(r.vencimento);
      partes.push(`vencimento ${dataBR(r.vencimento)}`);
    }
    setLinha(formatarLinha(r.digitos));
    setPreenchido(partes.length ? `Preenchi sozinho: ${partes.join(" e ")}.` : "Código conferido. Este tipo de boleto não traz o vencimento, então preencha abaixo.");
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const v = lerValor(valor);
    if (!fornecedor.trim()) return setErro("Diga para quem é o boleto (fornecedor).");
    if (!Number.isFinite(v) || v <= 0) return setErro("Digite um valor maior que zero.");
    if (!vencimento) return setErro("Escolha a data de vencimento.");
    if (linha && !leitura.valido) return setErro("A linha digitável parece ter algum número errado. Confira ou deixe o campo em branco.");
    if (arquivo && arquivo.size > 10 * 1024 * 1024) return setErro("O arquivo passa de 10 MB. Tire uma foto menor ou envie o PDF.");
    setSalvando(true);
    setErro("");
    try {
      await salvarBoleto(
        {
          id: inicial?.id,
          fornecedor: fornecedor.trim(),
          descricao: descricao.trim(),
          valor: Math.round(v * 100) / 100,
          vencimento,
          linha_digitavel: leitura.digitos,
          categoria_id: categoriaId || null,
          status: inicial?.status ?? "a_pagar",
          pago_em: inicial?.pago_em ?? null,
          anexo_path: inicial?.anexo_path ?? null,
          observacao: observacao.trim(),
        },
        arquivo,
      );
      onSalvo();
    } catch (err) {
      setErro("Não deu para salvar: " + (err as Error).message);
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!inicial || !window.confirm("Excluir este boleto? Ele também sai do caixa. Não dá para desfazer.")) return;
    setSalvando(true);
    try {
      await excluirBoleto(inicial);
      onSalvo();
    } catch (err) {
      setErro("Não deu para excluir: " + (err as Error).message);
      setSalvando(false);
    }
  }

  const campo = "w-full rounded-lg border border-linha bg-superficie px-3 py-2.5 focus:border-jade focus:outline-none";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 md:items-center" onClick={onFechar}>
      <form
        onSubmit={enviar}
        onClick={(e) => e.stopPropagation()}
        className="folha max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-superficie p-5 shadow-xl md:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{inicial ? "Editar boleto" : "Novo boleto"}</h2>
          <button type="button" onClick={onFechar} className="text-2xl leading-none text-tinta-suave/80" aria-label="Fechar">
            ×
          </button>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Linha digitável (o número grande do boleto)</span>
            <textarea
              className={`${campo} min-h-20 font-mono text-sm tracking-wide`}
              inputMode="numeric"
              placeholder="Cole ou digite aqui"
              value={linha}
              onChange={(e) => mudarLinha(e.target.value)}
              autoFocus={!inicial}
            />
            {preenchido && <span className="mt-1 block text-sm text-jade-texto">✓ {preenchido}</span>}
            {!preenchido && leitura.erro && <span className="mt-1 block text-sm text-ambar-texto">{leitura.erro}</span>}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Fornecedor</span>
            <input
              className={campo}
              list="fornecedores"
              placeholder="Ex.: Atacadão, Enel"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              required
            />
            <datalist id="fornecedores">
              {fornecedores.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Descrição</span>
            <input className={campo} placeholder="Ex.: Compra para o casamento da Ana" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm text-tinta-suave">Valor (R$)</span>
              <input className={`${campo} font-semibold`} inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-tinta-suave">Vencimento</span>
              <input type="date" className={campo} value={vencimento} onChange={(e) => setVencimento(e.target.value)} required />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Categoria</span>
            <select className={campo} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
              <option value="">Sem categoria</option>
              {opcoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Foto ou PDF do boleto (opcional)</span>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-tinta-suave file:mr-3 file:rounded-lg file:border-0 file:bg-porcelana file:px-3 file:py-2 file:font-medium file:text-tinta"
            />
            {inicial?.anexo_path && !arquivo && <span className="mt-1 block text-xs text-tinta-suave/80">Já tem um arquivo guardado. Escolha outro só se quiser trocar.</span>}
            {modoDemo && <span className="mt-1 block text-xs text-tinta-suave/80">No modo demonstração o arquivo não é guardado de verdade.</span>}
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-tinta-suave">Observação (opcional)</span>
            <input className={campo} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </label>
        </div>

        {erro && <p className="mt-3 rounded-lg bg-erro-claro px-3 py-2 text-sm text-erro">{erro}</p>}

        <div className="mt-5 flex gap-2">
          {inicial && (
            <button type="button" onClick={excluir} disabled={salvando} className="rounded-lg border border-erro/40 px-4 py-3 text-erro">
              Excluir
            </button>
          )}
          <button type="submit" disabled={salvando} className="flex-1 rounded-lg bg-tinta py-3 font-semibold text-porcelana disabled:opacity-60">
            {salvando ? "Salvando…" : inicial ? "Salvar boleto" : "Cadastrar boleto"}
          </button>
        </div>
      </form>
    </div>
  );
}
