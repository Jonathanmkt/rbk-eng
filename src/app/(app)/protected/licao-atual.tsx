import Link from 'next/link';
import { ArrowRight, GraduationCap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

/**
 * Contrato da "lição atual" que a tela de início exibe.
 *
 * Ainda não existe módulo de lições — este é o formato que ele vai precisar
 * preencher. Quando ele nascer, troque o `LICAO_PLACEHOLDER` por uma consulta
 * e o card continua igual.
 */
export type LicaoAtual = {
  /** Título da lição (ex.: "Present Perfect na prática"). */
  titulo: string;
  /** Módulo de origem, para o badge e o link de continuar. */
  modulo: 'anki' | 'leitor' | 'musica' | 'palavras';
  /** Uma linha dizendo o que a pessoa vai fazer nesta lição. */
  descricao: string;
  /** Passo em que a pessoa parou e total de passos. */
  passoAtual: number;
  totalPassos: number;
  /** Para onde o botão "Continuar" leva. */
  href: string;
};

const MODULO_LABEL: Record<LicaoAtual['modulo'], string> = {
  anki: 'Anki',
  leitor: 'Leitor',
  musica: 'Música',
  palavras: 'Banco de Palavras',
};

/** Conteúdo genérico até existir a fonte real de lições. */
export const LICAO_PLACEHOLDER: LicaoAtual = {
  titulo: 'Sua primeira lição',
  modulo: 'leitor',
  descricao: 'Leia um trecho curto, salve as palavras novas e revise no Anki.',
  passoAtual: 0,
  totalPassos: 3,
  href: '/leitor',
};

export function LicaoAtualCard({ licao = LICAO_PLACEHOLDER }: { licao?: LicaoAtual }) {
  const progresso =
    licao.totalPassos > 0 ? Math.round((licao.passoAtual / licao.totalPassos) * 100) : 0;
  const comecou = licao.passoAtual > 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardDescription className="flex items-center gap-1.5">
          <GraduationCap className="size-4" aria-hidden />
          Lição atual
        </CardDescription>
        <CardTitle className="text-xl">{licao.titulo}</CardTitle>
        <CardAction>
          <Badge variant="secondary">{MODULO_LABEL[licao.modulo]}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{licao.descricao}</p>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Passo {licao.passoAtual} de {licao.totalPassos}
            </span>
            <span>{progresso}%</span>
          </div>
          <Progress value={progresso} aria-label={`Progresso da lição: ${progresso}%`} />
        </div>
      </CardContent>

      <CardFooter>
        <Button asChild>
          <Link href={licao.href}>
            {comecou ? 'Continuar' : 'Começar'}
            <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
