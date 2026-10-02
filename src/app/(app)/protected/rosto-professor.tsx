import { cn } from '@/lib/utils';

export type EstadoRosto = 'parado' | 'ouvindo' | 'pensando' | 'falando';

/**
 * Rosto do professor: desenho próprio, só com tokens do tema (primary e
 * primary-foreground), então acompanha o preset ativo.
 *
 * - parado: sorriso, pisca de vez em quando
 * - ouvindo: sorriso mais aberto, olhos atentos
 * - pensando: olhos para cima, boca de lado
 * - falando: boca abre e fecha (token `animate-talk`)
 *
 * Os movimentos respeitam "reduzir movimento" do sistema.
 */
export function RostoProfessor({
  estado = 'parado',
  className,
}: {
  estado?: EstadoRosto;
  className?: string;
}) {
  const olhar = estado === 'pensando' ? 'translate(2 -3)' : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Rosto do professor"
      className={cn('size-12 shrink-0', className)}
    >
      {/* Cabeça */}
      <circle cx="50" cy="50" r="48" className="fill-primary" />

      {/* Cabelo: uma franja simples */}
      <path
        d="M18 38 C20 18, 42 8, 62 12 C74 14, 84 24, 84 36 C74 28, 58 26, 46 30 C36 33, 26 36, 18 38 Z"
        className="fill-primary-foreground/25"
      />

      {/* Olhos (piscam; olham para cima quando pensa) */}
      <g transform={olhar}>
        <ellipse
          cx="36"
          cy="48"
          rx="4.5"
          ry="5.5"
          className="animate-blink fill-primary-foreground [transform-box:fill-box] origin-center motion-reduce:animate-none"
        />
        <ellipse
          cx="64"
          cy="48"
          rx="4.5"
          ry="5.5"
          className="animate-blink fill-primary-foreground [transform-box:fill-box] origin-center motion-reduce:animate-none"
        />
      </g>

      {/* Óculos */}
      <g className="fill-none stroke-primary-foreground" strokeWidth="2.5">
        <circle cx="36" cy="48" r="11" />
        <circle cx="64" cy="48" r="11" />
        <path d="M47 47 Q50 44 53 47" />
        <path d="M25 46 L16 43" />
        <path d="M75 46 L84 43" />
      </g>

      {/* Boca */}
      {estado === 'falando' ? (
        <ellipse
          cx="50"
          cy="72"
          rx="9"
          ry="6"
          className="animate-talk fill-primary-foreground [transform-box:fill-box] origin-center motion-reduce:animate-none"
        />
      ) : estado === 'pensando' ? (
        <path
          d="M42 73 Q50 71 58 69"
          className="fill-none stroke-primary-foreground"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : (
        <path
          d={estado === 'ouvindo' ? 'M38 68 Q50 80 62 68' : 'M40 69 Q50 76 60 69'}
          className="fill-none stroke-primary-foreground transition-all"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
