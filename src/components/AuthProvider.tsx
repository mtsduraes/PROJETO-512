"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { modoDemo, supabase } from "@/lib/supabase";

interface Contexto {
  usuario: User | null;
  carregando: boolean;
  sair: () => Promise<void>;
}

const AuthContext = createContext<Contexto>({ usuario: null, carregando: true, sair: async () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [carregando, setCarregando] = useState(!modoDemo);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (modoDemo) return;
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => {
      setUsuario(data.session?.user ?? null);
      setCarregando(false);
    });
    const { data } = sb.auth.onAuthStateChange((_evento, sessao) => setUsuario(sessao?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  // Sem login, manda para a tela de entrada.
  useEffect(() => {
    if (modoDemo || carregando) return;
    if (!usuario && pathname !== "/login") router.replace("/login");
    if (usuario && pathname === "/login") router.replace("/");
  }, [usuario, carregando, pathname, router]);

  async function sair() {
    if (!modoDemo) await supabase().auth.signOut();
    router.replace("/login");
  }

  const bloqueado = !modoDemo && (carregando || (!usuario && pathname !== "/login"));

  return (
    <AuthContext.Provider value={{ usuario, carregando, sair }}>
      {bloqueado ? <div className="grid min-h-dvh place-items-center text-tinta-suave/80">Carregando…</div> : children}
    </AuthContext.Provider>
  );
}
