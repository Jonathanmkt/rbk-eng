'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { ArrowLeft, BookmarkPlus, Check, Copy, Languages, Music, Sparkles, Square, Volume2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { paragraphOf } from '@/lib/leitor/words';
import {
  traduzir,
  traduzirLinhas,
  traduzirNoContexto,
  type BookLanguage,
  type ContextualTranslation,
} from '../leitor/actions';
import { speak as speakTTS } from '@/lib/tts';
import { salvarSelecaoMusica, type DeezerHit, type Song } from './actions';
import { fetchLyrics } from './lyrics';
import { SongSearch } from './song-search';

type Sel = { text: string; paragraph: string; pos: { left: number; top: number } };
type Panel = {
  common?: string;
  contextual?: ContextualTranslation;
  loading: 'common' | 'contextual' | null;
  error?: string;
};

export function MusicClient() {
  const [track, setTrack] = useState<Song | null>(null);
  // Música escolhida cuja letra ainda está sendo buscada (ou falhou).
  const [pending, setPending] = useState<{ title: string; artist: string } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const selToken = useRef(0);
  const language: BookLanguage = 'en-US'; // música: só inglês

  // Ao escolher no Deezer: vai JÁ pra tela da letra (com loading) e busca no LRCLIB.
  const pickSong = (hit: DeezerHit) => {
    const token = ++selToken.current;
    setTrack(null);
    setSel(null);
    setLoadError(false);
    setPending({ title: hit.title, artist: hit.artist });
    fetchLyrics(hit)
      .then((song) => {
        if (selToken.current !== token) return; // seleção obsoleta
        if (song) {
          setTrack(song);
          setPending(null);
        } else {
          setLoadError(true);
        }
      })
      .catch(() => {
        if (selToken.current === token) setLoadError(true);
      });
  };

  const cancelPending = () => {
    selToken.current++; // cancela a busca em voo
    setPending(null);
    setLoadError(false);
  };

  const lyricsRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [panel, setPanel] = useState<Panel>({ loading: null });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const speak = (text: string) => {
    speakTTS(text, { lang: language });
  };

  // Lê a letra inteira em voz alta (toggle). Para sozinho ao terminar / ao sair.
  const [speakingAll, setSpeakingAll] = useState(false);
  const toggleAllAudio = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (speakingAll) {
      window.speechSynthesis.cancel();
      setSpeakingAll(false);
      return;
    }
    if (!track) return;
    const started = speakTTS(track.lyrics, {
      lang: language,
      onend: () => setSpeakingAll(false),
      onerror: () => setSpeakingAll(false),
    });
    if (started) setSpeakingAll(true);
  };
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  // Tradução linha a linha da letra (Azure em lote). Toggle: mostra/esconde.
  const [lineTranslations, setLineTranslations] = useState<string[] | null>(null);
  const [translatingAll, setTranslatingAll] = useState(false);
  const toggleTranslateAll = () => {
    if (!track || translatingAll) return;
    if (lineTranslations) {
      setLineTranslations(null);
      return;
    }
    setTranslatingAll(true);
    traduzirLinhas(track.lyrics.split('\n'), language)
      .then((tr) => setLineTranslations(tr))
      .catch(() => setFeedback('Não foi possível traduzir.'))
      .finally(() => setTranslatingAll(false));
  };
  // Ao trocar de música, limpa a tradução.
  useEffect(() => {
    setLineTranslations(null);
  }, [track]);

  const onSelect = () => {
    const container = lyricsRef.current;
    const selection = window.getSelection();
    if (!container || !selection || selection.isCollapsed || selection.rangeCount === 0) {
      setSel(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return;
    const text = range.toString().replace(/\s+/g, ' ').trim();
    if (!text) {
      setSel(null);
      return;
    }
    const rect = range.getBoundingClientRect();
    const box = container.getBoundingClientRect();
    const left = Math.max(150, Math.min(rect.left + rect.width / 2 - box.left, box.width - 150));
    const top = rect.bottom - box.top + 8;
    setPanel({ loading: null });
    setFeedback(null);
    setSel({ text, paragraph: paragraphOf(range), pos: { left, top } });
  };

  const handleTranslate = () => {
    if (!sel || panel.loading) return;
    setPanel((p) => ({ ...p, loading: 'common', error: undefined }));
    traduzir(sel.text, language)
      .then((r) => setPanel((p) => ({ ...p, common: r, loading: null })))
      .catch((e) => setPanel((p) => ({ ...p, loading: null, error: msg(e) })));
  };

  const handleContextual = () => {
    if (!sel || panel.loading) return;
    setPanel((p) => ({ ...p, loading: 'contextual', error: undefined }));
    traduzirNoContexto(sel.text, sel.paragraph, language)
      .then((r) => setPanel((p) => ({ ...p, contextual: r, loading: null })))
      .catch((e) => setPanel((p) => ({ ...p, loading: null, error: msg(e) })));
  };

  const handleSave = () => {
    if (!sel || isSaving) return;
    startSaving(async () => {
      try {
        await salvarSelecaoMusica({
          selectedText: sel.text,
          paragraphContext: sel.paragraph,
          language,
          translationCommon: panel.common ?? null,
          translationContextual: panel.contextual?.traducao ?? null,
          contextExplanation: panel.contextual?.explicacao ?? null,
        });
        setFeedback('Salvo no banco de palavras ✓');
      } catch {
        setFeedback('Não foi possível salvar.');
      }
    });
  };

  const closeMenu = () => {
    window.getSelection()?.removeAllRanges();
    setSel(null);
  };

  // ── Leitura da letra selecionada ──
  if (track) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              window.speechSynthesis?.cancel();
              setSpeakingAll(false);
              setTrack(null);
            }}
          >
            <ArrowLeft /> Voltar
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{track.title}</p>
            <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
          </div>
          <Button
            variant={speakingAll ? 'brand' : 'outline'}
            size="sm"
            onClick={toggleAllAudio}
            aria-label={speakingAll ? 'Parar áudio' : 'Ouvir a letra'}
          >
            {speakingAll ? <Square /> : <Volume2 />}
            {speakingAll ? 'Parar' : 'Ouvir'}
          </Button>
          <Button
            variant={lineTranslations ? 'brand' : 'outline'}
            size="sm"
            onClick={toggleTranslateAll}
            disabled={translatingAll}
            aria-label="Traduzir a música"
          >
            <Languages />
            {translatingAll ? 'Traduzindo…' : lineTranslations ? 'Original' : 'Traduzir'}
          </Button>
        </div>

        <Card>
          <CardContent className="relative">
            <div
              ref={lyricsRef}
              onMouseUp={onSelect}
              onTouchEnd={onSelect}
              className="flex flex-col gap-1 leading-relaxed whitespace-pre-wrap select-text"
            >
              {track.lyrics.split('\n').map((line, i) => (
                <div key={i} className={line.trim() ? '' : 'h-3'}>
                  <p>{line}</p>
                  {lineTranslations?.[i] && (
                    <p className="text-sm text-primary/80 italic">{lineTranslations[i]}</p>
                  )}
                </div>
              ))}
            </div>

            {sel && (
              <div
                className="absolute z-20 w-[300px] -translate-x-1/2 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md"
                style={{ left: sel.pos.left, top: sel.pos.top }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="flex items-center justify-between gap-2 pb-1.5">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{sel.text}</p>
                  <Button variant="ghost" size="icon" className="size-6" onClick={closeMenu} aria-label="Fechar">
                    <X className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  <Button variant="outline" size="sm" className="h-8 px-0" onClick={() => navigator.clipboard.writeText(sel.text).then(() => setFeedback('Copiado ✓'))} title="Copiar">
                    <Copy />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-0" onClick={() => speak(sel.text)} title="Ouvir">
                    <Volume2 />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-0" onClick={handleTranslate} title="Traduzir" disabled={panel.loading === 'common'}>
                    <Languages />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-0" onClick={handleContextual} title="Traduzir no contexto (IA)" disabled={panel.loading === 'contextual'}>
                    <Sparkles />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 px-0" onClick={handleSave} title="Salvar no banco" disabled={isSaving}>
                    <BookmarkPlus />
                  </Button>
                </div>

                {(panel.loading || panel.common || panel.contextual || panel.error || feedback) && (
                  <div className="mt-2 flex flex-col gap-1.5 border-t pt-2 text-sm">
                    {panel.loading === 'common' && <p className="text-xs text-muted-foreground">Traduzindo...</p>}
                    {panel.loading === 'contextual' && <p className="text-xs text-muted-foreground">Analisando o contexto...</p>}
                    {panel.common && (
                      <p>
                        <span className="text-xs text-muted-foreground">Tradução: </span>
                        {panel.common}
                      </p>
                    )}
                    {panel.contextual && (
                      <div className="flex flex-col gap-0.5">
                        <p>
                          <span className="text-xs text-muted-foreground">No contexto: </span>
                          {panel.contextual.traducao}
                        </p>
                        {panel.contextual.explicacao && (
                          <p className="text-xs text-muted-foreground">{panel.contextual.explicacao}</p>
                        )}
                      </div>
                    )}
                    {panel.error && <p className="text-xs text-destructive">{panel.error}</p>}
                    {feedback && (
                      <p className="flex items-center gap-1 text-xs text-success">
                        <Check className="size-3.5" /> {feedback}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Buscando a letra (ou não encontrada) ──
  if (pending) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={cancelPending}>
            <ArrowLeft /> Voltar
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{pending.title}</p>
            <p className="truncate text-xs text-muted-foreground">{pending.artist}</p>
          </div>
        </div>

        <Card>
          <CardContent>
            {loadError ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Music className="size-8 text-muted-foreground" />
                <p className="font-medium">Não achamos a letra dessa música.</p>
                <p className="text-sm text-muted-foreground">Tente outra versão ou outra música.</p>
                <Button variant="outline" size="sm" onClick={cancelPending}>
                  Buscar outra
                </Button>
              </div>
            ) : (
              <LyricsLoading title={pending.title} artist={pending.artist} />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Busca no Deezer ──
  return <SongSearch onSelect={pickSong} />;
}

const LOADING_LINES = [
  'Afinando os instrumentos…',
  'Pescando os versos no ar…',
  'Ajustando o microfone…',
  'Procurando a melodia certa…',
  'Decorando o refrão pra você…',
  'Subindo no palco…',
];

/** Loading da letra: equalizador animado + mensagem que troca sozinha. */
function LyricsLoading({ title, artist }: { title: string; artist: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LOADING_LINES.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
      <div className="flex h-12 items-end gap-1.5" aria-hidden>
        {[55, 100, 40, 85, 65].map((h, b) => (
          <span
            key={b}
            className="w-2 animate-bounce rounded-full bg-primary"
            style={{ height: `${h}%`, animationDelay: `${b * 120}ms`, animationDuration: '900ms' }}
          />
        ))}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Aguarde, estamos trazendo a letra de</p>
        <p className="text-lg font-semibold">
          {title} <span className="font-normal text-muted-foreground">— {artist}</span>
        </p>
      </div>
      <p className="text-xs text-primary/70 italic">{LOADING_LINES[i]}</p>
    </div>
  );
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : 'Falhou.';
}
