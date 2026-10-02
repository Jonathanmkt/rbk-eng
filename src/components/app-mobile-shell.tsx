'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Home, Library, Music, Vault } from 'lucide-react';

import { cn } from '@/lib/utils';

const ITEMS = [
  { title: 'Início', href: '/protected', icon: Home, exact: true },
  { title: 'Anki', href: '/anki', icon: BookOpen, exact: false },
  { title: 'Leitor', href: '/leitor', icon: Library, exact: false },
  { title: 'Palavras', href: '/palavras', icon: Vault, exact: false },
  { title: 'Música', href: '/musica', icon: Music, exact: false },
];

/**
 * Envolve o conteúdo das rotas autenticadas e adiciona a bottom bar no mobile.
 * O sidebar continua sendo a navegação no desktop (md+); a bottom bar é o
 * equivalente mobile e aparece em TODAS as telas logadas (decisão do CEO,
 * 30/09/2026 — antes sumia no leitor e no estudo).
 */
export function AppMobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      {/* Espaço p/ a bottom bar fixa não cobrir o fim do conteúdo (só no mobile) */}
      <div className="flex min-h-0 flex-1 flex-col pb-16 md:pb-0">{children}</div>
      <BottomBar pathname={pathname} />
    </>
  );
}

function BottomBar({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-border bg-sidebar text-sidebar-foreground backdrop-blur-lg pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex items-stretch">
        {ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors',
                  isActive ? 'text-sidebar-foreground' : 'text-sidebar-foreground/55'
                )}
              >
                {/* Pílula de destaque no ativo (mesma linguagem do sidebar) */}
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full px-4 py-0.5 transition-colors',
                    isActive && 'bg-sidebar-accent'
                  )}
                >
                  <item.icon className="size-5" />
                </span>
                <span>{item.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
