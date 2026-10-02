/** Evento que abre o painel do professor a partir de qualquer tela (ver ConversaFab). */
export const EVENTO_ABRIR_PROFESSOR = 'professor:abrir';

export type PedidoAbrirProfessor = {
  /** Abre direto no modo voz. */
  voz?: boolean;
};

/** Abre o painel do professor. Chame depois de criar a aula (ex.: POST /api/professor/aula). */
export function abrirProfessor(pedido: PedidoAbrirProfessor = {}) {
  window.dispatchEvent(new CustomEvent<PedidoAbrirProfessor>(EVENTO_ABRIR_PROFESSOR, { detail: pedido }));
}
