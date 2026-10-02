import { MusicClient } from './music-client';

/**
 * Sem cabeçalho de página nem texto de orientação (decisão do CEO, 02/10/2026):
 * a tela tem de se explicar sozinha. O título "Música" aparece só na busca; com
 * a letra aberta, quem ocupa o topo é a barra da música.
 */
export default function MusicaPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 pt-1 pb-4 md:p-6">
      <MusicClient />
    </main>
  );
}
