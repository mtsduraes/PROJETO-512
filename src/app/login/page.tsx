"use client";

import { useState } from "react";
import Link from "next/link";
import { modoDemo, supabase } from "@/lib/supabase";
import { Marca } from "@/components/AppShell";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEntrando(true);
    setErro("");
    const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setErro("E-mail ou senha incorretos.");
      setEntrando(false);
    }
    // Se deu certo, o AuthProvider leva para a tela inicial.
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-linha bg-white p-6 shadow-sm">
        <h1><Marca /></h1>
        <p className="mt-3 text-sm text-tinta-suave">Entre com o e-mail e a senha que você recebeu.</p>
        {modoDemo ? (
          <div className="mt-4 space-y-3 text-sm text-tinta-suave">
            <p>O painel está em modo demonstração (o banco de dados ainda não foi configurado), então não precisa de login.</p>
            <Link href="/" className="block rounded-lg bg-tinta py-3 text-center font-semibold text-white">
              Abrir o painel
            </Link>
          </div>
        ) : (
          <form onSubmit={entrar} className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm text-tinta-suave">E-mail</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-linha px-3 py-2.5"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-tinta-suave">Senha</span>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full rounded-lg border border-linha px-3 py-2.5"
              />
            </label>
            {erro && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{erro}</p>}
            <button disabled={entrando} className="w-full rounded-lg bg-tinta py-3 font-semibold text-white disabled:opacity-60">
              {entrando ? "Entrando…" : "Entrar"}
            </button>
            <p className="text-center text-xs text-tinta-suave/80">Esqueceu a senha? Fale com quem cuida do painel para criar uma nova.</p>
          </form>
        )}
      </div>
    </div>
  );
}
