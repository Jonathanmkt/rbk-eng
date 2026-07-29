'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, PartyPopper, Volume2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { previewRatings, Rating, type ActiveRating, type CardRow } from '@/lib/anki/fsrs';
import { RichText, stripMarks } from '@/lib/anki/rich-text';
import { speak as speakTTS } from '@/lib/tts';
import { submitReview } from '../../actions';

const RATING_CONFIG: { rating: ActiveRating; label: string; variant: 'destructive' | 'outline' | 'secondary' | 'brand' }[] = [
  { rating: Rating.Again, label: 'Errei', variant: 'destructive' },
  { rating: Rating.Hard, label: 'Difícil', variant: 'outline' },
  { rating: Rating.Good, label: 'Bom', variant: 'secondary' },
  { rating: Rating.Easy, label: 'Fácil', variant: 'brand' },
];

function formatInterval(due: Date, now: Date): string {
  const diffMin = Math.round((due.getTime() - now.getTime()) / 60000);
  if (diffMin < 60) return `${Math.max(diffMin, 1)}min`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d`;
  const diffMonths = Math.round(diffDays / 30);
  return `${diffMonths}mês${diffMonths === 1 ? '' : 'es'}`;
}

export function StudySession({
  deckId,
  deckName,
  initialCards,
  audioLang,
}: {
  deckId: string;
  deckName: string;
  initialCards: CardRow[];
  audioLang: string | null;
}) {
  const [queue, setQueue] = useState(initialCards);
  const [revealed, setRevealed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const current = queue[0];
  // eslint-disable-next-line react-hooks/exhaustive-deps -- só "now" novo quando o cartão muda
  const now = useMemo(() => new Date(), [current]);
  const preview = useMemo(() => (current ? previewRatings(current, now) : null), [current, now]);

  // TTS via Web Speech API (nativo do navegador). Fala o texto no idioma do baralho.
  const speak = (text: string, rate = 1) => {
    if (!audioLang) return;
    // rate: 1 = normal, 0.6 = lento (tartaruga). stripMarks tira os ** do negrito.
    speakTTS(stripMarks(text), { lang: audioLang, rate });
  };

  // Toca a frente (idioma-alvo) automaticamente quando um novo cartão aparece.
  // O 1º cartão pode ser barrado pela política de autoplay; o botão "Ouvir" cobre isso.
  useEffect(() => {
    if (current) speak(current.front);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- speak é estável; só re-tocar ao trocar de cartão
  }, [current]);

  const handleRate = (rating: ActiveRating) => {
    if (!current || isPending) return;
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
    startTransition(async () => {
      await submitReview(current.id, deckId, rating);
      setQueue((q) => q.slice(1));
      setRevealed(false);
    });
  };

  if (!current) {
    return (
      <main className="mx-auto flex w-full flex-1 max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <PartyPopper className="size-10 text-brand" />
        <h1 className="text-xl font-bold">Sessão concluída!</h1>
        <p className="text-sm text-muted-foreground">
          Você revisou todos os cartões pendentes de {deckName}.
        </p>
        <Button asChild variant="brand">
          <Link href={`/anki/${deckId}`}>Voltar ao baralho</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full flex-1 max-w-md flex-col justify-center gap-6 p-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{deckName}</span>
        <Badge variant="secondary">
          {queue.length} restante{queue.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-col items-center gap-3">
          <CardTitle className="text-center text-lg leading-relaxed whitespace-pre-wrap">
            <RichText text={current.front} />
          </CardTitle>
          {audioLang && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => speak(current.front)}
                aria-label="Ouvir em velocidade normal"
                title="Ouvir em velocidade normal"
              >
                <Volume2 /> Normal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => speak(current.front, 0.7)}
                aria-label="Ouvir devagar"
                title="Ouvir devagar"
              >
                <Volume2 /> Lento
              </Button>
            </div>
          )}
        </CardHeader>
        {revealed && (
          <CardContent className="border-t pt-4 text-center text-base whitespace-pre-wrap text-muted-foreground">
            <RichText text={current.back} />
          </CardContent>
        )}
      </Card>

      {!revealed ? (
        <Button size="lg" onClick={() => setRevealed(true)}>
          <Check /> Mostrar resposta
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATING_CONFIG.map(({ rating, label, variant }) => (
            <Button
              key={rating}
              variant={variant}
              disabled={isPending}
              onClick={() => handleRate(rating)}
              className="flex h-auto flex-col gap-0.5 py-2.5"
            >
              <span>{label}</span>
              {preview && (
                <span className="text-xs opacity-70">{formatInterval(preview[rating].due, now)}</span>
              )}
            </Button>
          ))}
        </div>
      )}
    </main>
  );
}
