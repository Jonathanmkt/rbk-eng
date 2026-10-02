import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';
import { AppSidebar } from '@/components/app-sidebar';
import { AppMobileShell } from '@/components/app-mobile-shell';
import { UserMenu } from '@/components/user-menu';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  // Estado aberto/fechado persistido em cookie (padrão do sidebar shadcn) — sem "pulo" no SSR.
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false';

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = (data?.claims?.email as string | undefined) ?? null;
  const userId = data?.claims?.sub as string | undefined;

  // Perfil para o menu do canto superior direito.
  const { data: profile } = userId
    ? await supabase.from('profiles').select('nome_completo, roles').eq('id', userId).single()
    : { data: null };
  const nome = (profile?.nome_completo as string | null) ?? null;
  const roles = (profile?.roles as string[] | null) ?? [];

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar email={email} />
      {/* bg-transparent: nos presets glass o fundo mora no body (ver globals.css) */}
      <SidebarInset className="bg-transparent">
        {/* Header: toggle do sidebar só no desktop (no mobile a navegação é a bottom bar);
            perfil no canto superior direito em qualquer tamanho */}
        <header className="flex h-12 shrink-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
          <Separator orientation="vertical" className="hidden h-4 md:block" />
          <div className="ml-auto">
            <UserMenu nome={nome} email={email} roles={roles} />
          </div>
        </header>
        <AppMobileShell>{children}</AppMobileShell>
      </SidebarInset>
    </SidebarProvider>
  );
}
