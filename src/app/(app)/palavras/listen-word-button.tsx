'use client';

import { Volume2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { speak as speakTTS } from '@/lib/tts';

export function ListenWordButton({ text, language }: { text: string; language: string }) {
  const speak = () => {
    speakTTS(text, { lang: language });
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
      aria-label="Ouvir"
      title="Ouvir"
      onClick={speak}
    >
      <Volume2 className="size-4" />
    </Button>
  );
}
