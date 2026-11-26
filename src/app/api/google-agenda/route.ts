/**
 * Lê o Google Agenda pelo "endereço secreto no formato iCal" e devolve os compromissos do período.
 * O link fica só no servidor (variável GOOGLE_AGENDA_ICAL_URL na Vercel), nunca vai para o navegador,
 * e só quem está logado no painel consegue consultar.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lerCompromissos } from "@/lib/googleIcal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function usuarioLogado(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !chave || !token) return false;
  const { data, error } = await createClient(url, chave, { auth: { persistSession: false } }).auth.getUser(token);
  return !error && !!data.user;
}

export async function GET(req: NextRequest) {
  if (!(await usuarioLogado(req))) return NextResponse.json({ erro: "Entre no painel para ver a agenda." }, { status: 401 });

  const linkAgenda = process.env.GOOGLE_AGENDA_ICAL_URL?.trim().replace(/^["']|["']$/g, "");
  if (!linkAgenda) return NextResponse.json({ configurado: false, itens: [] });
  if (!/^https:\/\//.test(linkAgenda)) return NextResponse.json({ erro: "O link do Google Agenda precisa começar com https://" }, { status: 500 });

  const de = req.nextUrl.searchParams.get("de") ?? "";
  const ate = req.nextUrl.searchParams.get("ate") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(de) || !/^\d{4}-\d{2}-\d{2}$/.test(ate)) {
    return NextResponse.json({ erro: "Período inválido." }, { status: 400 });
  }
  const inicio = new Date(`${de}T00:00:00-03:00`);
  const fim = new Date(`${ate}T23:59:59-03:00`);
  if (fim.getTime() - inicio.getTime() > 120 * 86_400_000) return NextResponse.json({ erro: "Período grande demais." }, { status: 400 });

  try {
    const resposta = await fetch(linkAgenda, { next: { revalidate: 300 } });
    if (resposta.status === 404 || resposta.status === 403) {
      const publico = /\/public\/basic\.ics/.test(linkAgenda);
      throw new Error(
        publico
          ? "o link cadastrado é o endereço PÚBLICO. Use o \"Endereço secreto no formato iCal\" (tem a palavra private no meio)."
          : "o Google não reconheceu o link. Copie de novo o \"Endereço secreto no formato iCal\" e confira se colou inteiro.",
      );
    }
    if (!resposta.ok) throw new Error(`Google respondeu ${resposta.status}`);
    const itens = lerCompromissos(await resposta.text(), inicio, fim);
    return NextResponse.json({ configurado: true, itens });
  } catch (e) {
    return NextResponse.json({ erro: "Não deu para ler o Google Agenda: " + (e as Error).message }, { status: 502 });
  }
}
