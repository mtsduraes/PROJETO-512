"use client";

import { useCallback, useEffect, useState } from "react";

/** Carrega dados de forma assíncrona e permite recarregar depois de salvar algo. */
export function useDados<T>(carregar: () => Promise<T>, deps: unknown[]) {
  const [dados, setDados] = useState<T | null>(null);
  const [erro, setErro] = useState("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fn = useCallback(carregar, deps);

  const recarregar = useCallback(() => {
    setErro("");
    fn()
      .then(setDados)
      .catch((e: Error) => setErro(e.message));
  }, [fn]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  return { dados, erro, recarregar };
}
