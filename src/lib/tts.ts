// Web Speech API (TTS nativo do navegador) com a VOZ sempre casada ao idioma.
//
// Definir só `utterance.lang` é apenas uma dica: se o navegador não tiver uma voz
// selecionada para aquele idioma, ele lê o texto com a voz padrão do sistema
// (em pt-BR, por exemplo) — texto em inglês sai com sotaque. Aqui a gente escolhe
// explicitamente uma voz que casa com o idioma pedido.

// Algumas engines só populam getVoices() depois do evento 'voiceschanged'.
// Dispara o carregamento assim que este módulo é importado no navegador.
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
}

/** Melhor voz disponível para o idioma (ex.: 'en-US'); null se não houver. */
export function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const target = lang.toLowerCase().replace('_', '-');
  const base = target.split('-')[0];
  return (
    voices.find((v) => v.lang?.toLowerCase().replace('_', '-') === target) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith(base)) ??
    null
  );
}

export type SpeakOptions = {
  /** Idioma-alvo. Padrão: 'en-US' (app de inglês). */
  lang?: string;
  rate?: number;
  onend?: () => void;
  onerror?: () => void;
  /** Interromper a fala atual antes de começar. Padrão: true. */
  cancel?: boolean;
};

/**
 * Fala `text` forçando uma voz que casa com o idioma. Retorna o utterance
 * (ou null se o navegador não suportar TTS). Use sempre isto em vez de montar
 * o SpeechSynthesisUtterance à mão, pra garantir a voz correta.
 */
export function speak(text: string, opts: SpeakOptions = {}): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const { lang = 'en-US', rate = 1, onend, onerror, cancel = true } = opts;
  const synth = window.speechSynthesis;
  if (cancel) synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  if (onend) u.onend = onend;
  if (onerror) u.onerror = onerror;
  synth.speak(u);
  return u;
}
