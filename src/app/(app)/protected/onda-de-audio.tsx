import { cn } from '@/lib/utils';

/** Alturas relativas das 5 barras (em repouso) e a defasagem de cada uma na onda. */
const BARRAS = [
  { altura: 0.4, atraso: 0 },
  { altura: 0.75, atraso: 120 },
  { altura: 1, atraso: 240 },
  { altura: 0.75, atraso: 360 },
  { altura: 0.4, atraso: 480 },
];

/**
 * Ícone de onda de áudio. Parado por padrão; as barras sobem e descem defasadas
 * (token `animate-wave` do globals.css) quando `ondulando`, ou no hover/foco de
 * um ancestral `group`.
 */
export function OndaDeAudio({ ondulando, className }: { ondulando?: boolean; className?: string }) {
  return (
    <span className={cn('flex h-6 items-center gap-[3px]', className)} aria-hidden>
      {BARRAS.map((b, i) => (
        <span
          key={i}
          className={cn(
            'block w-[3px] origin-center rounded-full bg-current',
            'group-hover:animate-wave group-focus-visible:animate-wave',
            ondulando && 'animate-wave'
          )}
          style={{
            height: `${b.altura * 100}%`,
            ['--wave-delay' as string]: `${b.atraso}ms`,
          }}
        />
      ))}
    </span>
  );
}
