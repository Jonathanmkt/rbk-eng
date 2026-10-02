'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type Mensagem = { role: 'user' | 'assistant'; content: string };

/**
 * Conversa com o professor (rota /api/professor → DeepSeek).
 *
 * A conversa fica guardada no banco (schema `tutor`): ao abrir o painel, a
 * última conversa aberta é recarregada; se não houver, o professor começa uma.
 * Quem usa este hook é o botão flutuante, que não desmonta — fechar e reabrir
 * o painel não recarrega nada.
 */
export function useConversa() {
  const [sessaoId, setSessaoId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [pensando, setPensando] = useState(false);
  /** Uma resposta está chegando (do pedido até o último pedaço). */
  const [respondendo, setRespondendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /** Uma rodada: manda para a rota e acompanha a resposta em streaming. */
  const rodada = useCallback(
    async (
      corpo: { sessaoId?: string | null; mensagem?: string; nova?: boolean },
      base: Mensagem[]
    ) => {
      abortRef.current?.abort();
      const abort = new AbortController();
      abortRef.current = abort;
      setErro(null);
      setPensando(true);
      setRespondendo(true);
      setMensagens([...base, { role: 'assistant', content: '' }]);

      try {
        const resp = await fetch('/api/professor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(corpo),
          signal: abort.signal,
        });
        const id = resp.headers.get('X-Sessao-Id');
        if (id) setSessaoId(id);
        if (!resp.ok || !resp.body) {
          const erroJson = await resp.json().catch(() => null);
          throw new Error(erroJson?.erro ?? 'O professor não respondeu agora. Tente de novo.');
        }
        const leitor = resp.body.getReader();
        const decoder = new TextDecoder();
        let texto = '';
        for (;;) {
          const { done, value } = await leitor.read();
          if (done) break;
          texto += decoder.decode(value, { stream: true });
          setPensando(false);
          setMensagens([...base, { role: 'assistant', content: texto }]);
        }
        if (!texto.trim()) throw new Error('O professor ficou sem resposta. Tente de novo.');
      } catch (e) {
        if (!abort.signal.aborted) {
          setErro(e instanceof Error ? e.message : 'Erro inesperado.');
          setMensagens(base);
        }
      } finally {
        if (abortRef.current === abort) {
          setPensando(false);
          setRespondendo(false);
        }
      }
    },
    []
  );

  /** Primeira abertura do painel: retoma a conversa guardada ou começa uma. */
  const retomar = useCallback(async () => {
    setPensando(true);
    try {
      const resp = await fetch('/api/professor');
      const dados = resp.ok ? await resp.json() : null;
      if (dados?.sessaoId && dados.mensagens?.length) {
        setSessaoId(dados.sessaoId);
        setMensagens(dados.mensagens);
        setPensando(false);
        return;
      }
      await rodada({ sessaoId: dados?.sessaoId ?? null, nova: true }, []);
    } catch {
      setPensando(false);
      setErro('Não consegui abrir a conversa. Tente de novo.');
    }
  }, [rodada]);

  const enviar = useCallback(
    (texto: string) => {
      const base: Mensagem[] = [...mensagens, { role: 'user', content: texto }];
      void rodada({ sessaoId, mensagem: texto }, base);
    },
    [mensagens, rodada, sessaoId]
  );

  const reiniciar = useCallback(() => {
    void rodada({ sessaoId, nova: true }, []);
  }, [rodada, sessaoId]);

  /**
   * Conversa por voz ao vivo: acrescenta um pedaço de transcrição na tela.
   * Emenda na última mensagem se for da mesma pessoa; senão abre outra.
   * (Quem grava no banco é a rota ao vivo; aqui é só a tela.)
   */
  const acrescentarAoVivo = useCallback((role: Mensagem['role'], texto: string) => {
    setMensagens((atuais) => {
      const ultima = atuais.at(-1);
      if (ultima?.role === role) {
        return [...atuais.slice(0, -1), { role, content: ultima.content + texto }];
      }
      return [...atuais, { role, content: texto.trimStart() }];
    });
  }, []);

  /** Relê a conversa guardada (ao sair da voz, para a tela bater com o banco). */
  const recarregar = useCallback(async () => {
    const resp = await fetch('/api/professor').catch(() => null);
    const dados = resp?.ok ? await resp.json() : null;
    if (dados?.sessaoId) {
      setSessaoId(dados.sessaoId);
      setMensagens(dados.mensagens ?? []);
    }
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { mensagens, pensando, respondendo, erro, enviar, reiniciar, retomar, acrescentarAoVivo, recarregar };
}

export type Conversa = ReturnType<typeof useConversa>;
