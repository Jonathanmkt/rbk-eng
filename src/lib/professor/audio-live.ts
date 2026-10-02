// Áudio do professor por voz ao vivo (Gemini Live), no navegador.
//
// Microfone: captura em PCM 16-bit, 16 kHz, mono, em pedaços de ~200 ms — o
// formato que a Live API recebe. O cancelamento de eco do navegador fica ligado:
// é ele que evita o professor "ouvir" a própria voz no alto-falante.
// Alto-falante: toca o PCM 16-bit, 24 kHz, mono que a Live API devolve, em fila
// sem emenda audível, e para na hora quando o aluno fala por cima.

const TAXA_ENTRADA = 16_000;
const TAXA_SAIDA = 24_000;
/** 200 ms a 16 kHz. */
const AMOSTRAS_POR_PEDACO = 3_200;

// Ganho automático (02/10/2026): no celular a voz do aluno chegou com volume ~0,003 (RMS),
// baixo demais para o Google perceber que ele falou. Leva a fala para perto do alvo.
const VOLUME_ALVO = 0.05;
const PISO_DE_RUIDO = 0.002;
const GANHO_MAXIMO = 6;
const GANHO_MINIMO = 0.2;

// Roda na thread de áudio. Se o navegador não criar o contexto em 16 kHz, reduz
// a taxa descartando amostras (qualidade suficiente para fala).
const CODIGO_CAPTURA = `
class Captura16k extends AudioWorkletProcessor {
  constructor() {
    super();
    this.razao = sampleRate / ${TAXA_ENTRADA};
    this.passo = 0;
    this.buf = [];
  }
  process(inputs) {
    const canal = inputs[0] && inputs[0][0];
    if (!canal) return true;
    for (let i = 0; i < canal.length; i++) {
      this.passo += 1;
      if (this.passo >= this.razao) {
        this.passo -= this.razao;
        this.buf.push(canal[i]);
      }
    }
    if (this.buf.length >= ${AMOSTRAS_POR_PEDACO}) {
      // Ganho automático por pedaço: fala baixa sobe (até ${GANHO_MAXIMO}x) e som alto — como a
      // voz do professor vazando pelo alto-falante — desce. Silêncio fica como está.
      let soma = 0;
      for (let i = 0; i < this.buf.length; i++) soma += this.buf[i] * this.buf[i];
      const rms = Math.sqrt(soma / this.buf.length);
      const ganho = rms > ${PISO_DE_RUIDO} ? Math.min(${GANHO_MAXIMO}, Math.max(${GANHO_MINIMO}, ${VOLUME_ALVO} / rms)) : 1;
      const pcm = new Int16Array(this.buf.length);
      for (let i = 0; i < this.buf.length; i++) {
        const s = Math.max(-1, Math.min(1, this.buf[i] * ganho));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage({ pcm: pcm.buffer, nivel: rms }, [pcm.buffer]);
      this.buf = [];
    }
    return true;
  }
}
registerProcessor('captura-16k', Captura16k);
`;

/** O navegador permite microfone aqui? (só em https ou localhost) */
export function microfonePermitido(): { ok: true } | { ok: false; motivo: string } {
  if (typeof window === 'undefined') return { ok: false, motivo: 'Fora do navegador.' };
  if (!window.isSecureContext) {
    return { ok: false, motivo: 'O microfone só funciona em endereço seguro (https ou localhost).' };
  }
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
    return { ok: false, motivo: 'Este navegador não captura áudio.' };
  }
  return { ok: true };
}

export class Microfone {
  private stream: MediaStream | null = null;
  private contexto: AudioContext | null = null;
  private no: AudioWorkletNode | null = null;
  private url: string | null = null;

  /** `aoPedaco` recebe cada ~200 ms de PCM 16 kHz e o nível de volume (0..1, RMS). */
  async iniciar(aoPedaco: (pcm: ArrayBuffer, nivel: number) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    });
    try {
      this.contexto = new AudioContext({ sampleRate: TAXA_ENTRADA });
    } catch {
      this.contexto = new AudioContext();
    }
    this.url = URL.createObjectURL(new Blob([CODIGO_CAPTURA], { type: 'application/javascript' }));
    await this.contexto.audioWorklet.addModule(this.url);
    const fonte = this.contexto.createMediaStreamSource(this.stream);
    this.no = new AudioWorkletNode(this.contexto, 'captura-16k');
    this.no.port.onmessage = (e: MessageEvent<{ pcm: ArrayBuffer; nivel: number }>) =>
      aoPedaco(e.data.pcm, e.data.nivel);
    fonte.connect(this.no);
  }

  parar() {
    this.no?.port.close();
    this.no?.disconnect();
    this.no = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    void this.contexto?.close().catch(() => {});
    this.contexto = null;
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }
}

export class AltoFalante {
  private contexto: AudioContext | null = null;
  private proximoInicio = 0;
  private readonly fontes = new Set<AudioBufferSourceNode>();
  private readonly aoMudar: (tocando: boolean) => void;

  constructor(aoMudar: (tocando: boolean) => void) {
    this.aoMudar = aoMudar;
  }

  /** Cria o contexto de áudio. Chame a partir de um toque do usuário (regra de autoplay). */
  preparar() {
    if (!this.contexto) {
      try {
        this.contexto = new AudioContext({ sampleRate: TAXA_SAIDA });
      } catch {
        this.contexto = new AudioContext();
      }
    }
    void this.contexto.resume();
  }

  get tocando() {
    return this.fontes.size > 0;
  }

  /** Enfileira um pedaço de PCM 16-bit 24 kHz em base64. */
  tocar(base64: string) {
    this.preparar();
    const ctx = this.contexto!;
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
    const amostras = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
    if (!amostras.length) return;

    const buffer = ctx.createBuffer(1, amostras.length, TAXA_SAIDA);
    const canal = buffer.getChannelData(0);
    for (let i = 0; i < amostras.length; i++) canal[i] = amostras[i] / 0x8000;

    const fonte = ctx.createBufferSource();
    fonte.buffer = buffer;
    fonte.connect(ctx.destination);
    const inicio = Math.max(ctx.currentTime + 0.03, this.proximoInicio);
    fonte.start(inicio);
    this.proximoInicio = inicio + buffer.duration;

    const estava = this.tocando;
    this.fontes.add(fonte);
    if (!estava) this.aoMudar(true);
    fonte.onended = () => {
      this.fontes.delete(fonte);
      if (!this.fontes.size) this.aoMudar(false);
    };
  }

  /** Corta a fala na hora (o aluno falou por cima). */
  parar() {
    for (const f of this.fontes) {
      f.onended = null;
      try {
        f.stop();
      } catch {}
    }
    const estava = this.tocando;
    this.fontes.clear();
    this.proximoInicio = 0;
    if (estava) this.aoMudar(false);
  }

  fechar() {
    this.parar();
    void this.contexto?.close().catch(() => {});
    this.contexto = null;
  }
}
