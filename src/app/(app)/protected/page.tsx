import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { ConversaFab } from './conversa-fab';
import { LicaoAtualCard } from './licao-atual';

export default async function ProtectedPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    redirect('/auth/login');
  }

  const userId = data.claims.sub as string | undefined;

  // Só o nome, para a saudação — o resto do perfil vive no menu do canto superior direito.
  const { data: profile } = await supabase
    .from('profiles')
    .select('nome_completo')
    .eq('id', userId ?? '')
    .single();

  const primeiroNome = profile?.nome_completo?.split(' ')[0] ?? null;

  return (
    <main className="mx-auto flex w-full flex-1 max-w-3xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {primeiroNome ? `Olá, ${primeiroNome}` : 'Início'}
        </h1>
        <p className="text-sm text-muted-foreground">Continue de onde parou.</p>
      </header>

      {/* Lição atual: por enquanto conteúdo genérico, até existir a fonte de lições. */}
      <LicaoAtualCard />

      {/* Conversa em tempo real: botão flutuante, painel genérico até o módulo existir. */}
      <ConversaFab />
    </main>
  );
}
