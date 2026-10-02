#!/usr/bin/env python3
"""Custo por hora do professor de inglês por voz, por arquitetura — RECALCULÁVEL.

Acompanha o DR 2026-09-30-arquitetura-professor-de-ingles-por-voz-em-tempo-real.md.
Guarda a RELAÇÃO e as tarifas (datadas, com fonte no DR); o número sai daqui, não do texto.

Uso:  python 2026-09-30-voz-professor-arquitetura-custo-por-hora.py
Troque as constantes TARIFAS/CENARIO abaixo quando o preço ou o uso mudarem.

Por que a conta não é "tokens/s x preço": nos modelos de voz nativa o contexto da sessão é
RE-COBRADO a cada turno (Google: "a API cobra por turno todos os tokens presentes na janela de
contexto da sessão"; OpenAI: entrada em cache custa ~1/80 da entrada nova de áudio). Logo o custo
cresce com (turnos x histórico) e a compressão de contexto / o cache mandam no resultado.
"""

# ---------------- TARIFAS (US$ por 1 M de tokens), conferidas em 30/09/2026 ----------------
TARIFAS = {
    # Gemini 3.8 Live (ai.google.dev/gemini-api/docs/pricing): áudio in 3,00 · áudio out 12,00 · texto in 0,75
    "gemini": dict(audio_in=3.00, audio_out=12.00, texto_in=0.75, tok_s_in=25, tok_s_out=25),
    # gpt-realtime-2.1 (developers.openai.com/api/docs/pricing): áudio in 32 (cache 0,40) · out 64 · texto in 4 (cache 0,40)
    # tokens/s: Azure docs, "modelos Azure OpenAI ~10 tok/s entrada, ~20 tok/s saída"
    "openai": dict(audio_in=32.0, audio_in_cache=0.40, audio_out=64.0, texto_in=4.0, texto_in_cache=0.40, tok_s_in=10, tok_s_out=20),
    # GPT-Live-1: US$ 0,05/min só da camada de voz, por segundo; o modelo de trás é cobrado à parte
    "gpt_live": dict(usd_min_voz=0.05),
    # DeepSeek deepseek-flash (página oficial, 30/09/2026), pico: in miss 0,30 · hit 0,006 · out 1,20
    "deepseek_pico": dict(inp=0.30, hit=0.006, out=1.20),
}

# ---------------- CENÁRIO (hipóteses MINHAS — recalibrar com uso real) ----------------
CENARIO = dict(
    min_aluno_fala=20,      # minutos por hora em que o aluno de fato fala
    min_prof_fala=25,       # minutos por hora em que o professor fala
    prompt_tokens=750,      # system prompt + ferramentas (medido em 30/09/2026: 746 tokens de texto no 1º turno)
    janela_compressao=16_000,  # gatilho da compressão de contexto do Gemini (tokens); após o gatilho o contexto oscila ~W/2..W
    delegacoes_por_hora=30, # chamadas ao modelo que pensa (GPT-Live / duas LLMs)
    ctx_backend=3_000,      # tokens que o modelo de trás lê por delegação (90% em cache)
    saida_backend=120,
)


def gemini(turnos, mic_aberto=False, comprimir=True, c=CENARIO, t=TARIFAS["gemini"]):
    s_in = c["min_aluno_fala"] * 60 * t["tok_s_in"]   # tokens de áudio do aluno na hora
    s_out = c["min_prof_fala"] * 60 * t["tok_s_out"]  # tokens de áudio do professor na hora
    por_turno = (s_in + s_out) / turnos               # o que cada turno acrescenta ao histórico
    total_in = 0.0
    for n in range(turnos):
        hist = n * por_turno
        if comprimir:
            w = c["janela_compressao"]
            hist = hist if hist <= w else 0.75 * w
        total_in += hist * t["audio_in"] + c["prompt_tokens"] * t["texto_in"]
    novo_in = (60 * 60 * t["tok_s_in"] if mic_aberto else s_in) * t["audio_in"]  # áudio novo do aluno
    saida = s_out * t["audio_out"]
    return (total_in + novo_in + saida) / 1e6


def openai_realtime(turnos, mic_aberto=False, cache=True, c=CENARIO, t=TARIFAS["openai"]):
    s_in = c["min_aluno_fala"] * 60 * t["tok_s_in"]
    s_out = c["min_prof_fala"] * 60 * t["tok_s_out"]
    por_turno = (s_in + s_out) / turnos
    hist_total = sum(n * por_turno for n in range(turnos))
    preco_hist = t["audio_in_cache"] if cache else t["audio_in"]
    prompt = turnos * c["prompt_tokens"] * (t["texto_in_cache"] if cache else t["texto_in"])
    novo_in = (60 * 60 * t["tok_s_in"] if mic_aberto else s_in) * t["audio_in"]
    return (hist_total * preco_hist + prompt + novo_in + s_out * t["audio_out"]) / 1e6


def gpt_live(c=CENARIO, tv=TARIFAS["gpt_live"], d=TARIFAS["deepseek_pico"]):
    voz = 60 * tv["usd_min_voz"]
    backend = c["delegacoes_por_hora"] * (
        (0.9 * c["ctx_backend"] * d["hit"] + 0.1 * c["ctx_backend"] * d["inp"] + c["saida_backend"] * d["out"]) / 1e6)
    return voz, backend


def duas_llms_gemini(turnos, c=CENARIO, d=TARIFAS["deepseek_pico"]):
    """Gemini Live como boca + DeepSeek como cérebro por ferramenta: soma a voz e o backend."""
    backend = c["delegacoes_por_hora"] * (
        (0.9 * c["ctx_backend"] * d["hit"] + 0.1 * c["ctx_backend"] * d["inp"] + c["saida_backend"] * d["out"]) / 1e6)
    return gemini(turnos) + backend


def _principal():
    print("Custo por HORA de aula (US$) — cenário:", {k: v for k, v in CENARIO.items() if k in ("min_aluno_fala", "min_prof_fala", "janela_compressao")})
    print(f"{'arquitetura':58} {'40 turnos/h':>12} {'120 turnos/h':>13}")
    for nome, f in [
        ("Gemini 3.8 Live, com compressão de contexto", lambda n: gemini(n)),
        ("Gemini 3.8 Live, SEM compressão", lambda n: gemini(n, comprimir=False)),
        ("Gemini 3.8 Live, mic aberto + compressão", lambda n: gemini(n, mic_aberto=True)),
        ("gpt-realtime-2.1, histórico em cache (otimista)", lambda n: openai_realtime(n)),
        ("gpt-realtime-2.1, SEM cache (pessimista)", lambda n: openai_realtime(n, cache=False)),
        ("Gemini Live (boca) + DeepSeek (cérebro por ferramenta)", lambda n: duas_llms_gemini(n)),
    ]:
        print(f"{nome:58} {f(40):12.2f} {f(120):13.2f}")
    voz, back = gpt_live()
    print(f"{'GPT-Live-1 (voz US$ 0,05/min) + DeepSeek atrás':58} {voz + back:12.2f} {voz + back:13.2f}   (voz {voz:.2f} + backend {back:.3f}; não depende do nº de turnos)")
    print("Cascata (DR 30/09 anterior): Deepgram multi + DeepSeek + Azure TTS + Azure PA ≈ 0,76–0,87 (mic aberto ≈ 1,0–1,1)")


# ============================================================================================
# COMPLEMENTO (30/09/2026): custo de UMA AULA no Gemini 3.1 Flash Live / 3.8 Live, turno a turno
# Tarifa oficial (ai.google.dev/gemini-api/docs/pricing, linha única dos 3 modelos Live, 30/09/2026):
#   entrada texto 0,75 · entrada áudio 3,00 (= "US$ 0,005/min") · saída áudio 12,00 (= "US$ 0,018/min")
#   saída texto 4,50 (cobrada SOBRE a transcrição, se inputAudioTranscription/outputAudioTranscription ligados)
# Regra de cobrança (best-practices, atualizado 15/09/2026): todo o contexto da sessão é re-cobrado a
# cada turno, o áudio acumulado à tarifa de ENTRADA DE ÁUDIO; a compressão faz cobrar só o que ficou.
# Medidas do dev (usageMetadata, 7 turnos, 5 ferramentas): texto fixo ~1.300 (sistema + 383 das ferramentas),
#   +~43 texto/turno (transcrição), áudio +~387/turno (fala do aluno + resposta do modelo), 1º turno ~279 de áudio,
#   saída ~190 tokens de áudio/turno; turno com ferramenta relê o contexto (3.168 contra 1.521).
# ============================================================================================
LIVE_PRECO = dict(texto_in=0.75, audio_in=3.00, audio_out=12.00, texto_out=4.50)
LIVE_MEDIDO = dict(texto_fixo=1300, texto_por_turno=43, audio_1o_turno=279, audio_por_turno=387, saida_audio=190)


def aula_live(turnos=33, chamadas_ferramenta=6, compressao=None, reinicio_a_cada=None, resumo_texto=400,
              p=LIVE_PRECO, m=LIVE_MEDIDO, transcricao=True):
    """Custo (US$) de uma aula. compressao=(gatilho, alvo) em tokens; reinicio_a_cada=N turnos (sessão nova com resumo em texto)."""
    total = 0.0
    hist_txt = hist_aud = 0.0
    desde_reinicio = 0
    cobradas = []
    for t in range(turnos):
        if reinicio_a_cada and desde_reinicio == reinicio_a_cada:
            hist_txt, hist_aud, desde_reinicio = float(resumo_texto), 0.0, 0   # sessão nova: só o resumo em texto
        novo_aud = m["audio_1o_turno"] if t == 0 else m["audio_por_turno"]
        hist_txt += m["texto_por_turno"]
        hist_aud += novo_aud
        ctx_txt = m["texto_fixo"] + hist_txt
        ctx_aud = hist_aud
        if compressao:
            gatilho, alvo = compressao
            if ctx_txt + ctx_aud > gatilho:                                   # o que passa do alvo sai (mais antigo primeiro)
                sobra = max(0.0, alvo - ctx_txt)
                ctx_aud = min(ctx_aud, sobra)
                hist_aud = ctx_aud
        custo_turno = (ctx_txt * p["texto_in"] + ctx_aud * p["audio_in"] + m["saida_audio"] * p["audio_out"]) / 1e6
        if transcricao:
            custo_turno += (m["texto_por_turno"] * p["texto_out"]) / 1e6
        total += custo_turno
        cobradas.append(ctx_txt + ctx_aud)
        desde_reinicio += 1
        if chamadas_ferramenta and t in {int(round((i + 0.5) * turnos / chamadas_ferramenta)) for i in range(chamadas_ferramenta)}:
            total += (ctx_txt * p["texto_in"] + ctx_aud * p["audio_in"]) / 1e6  # a volta da ferramenta relê o contexto
    return total, cobradas


if __name__ == "__main__":
    _principal()
    print()
    print("UMA AULA de 15 min = 33 turnos (ritmo medido pelo dev), 5 ferramentas, 6 chamadas de ferramenta")
    print(f"{'cenário':62} {'US$/aula':>9} {'US$/h (x4)':>11} {'contexto máx':>13}")
    for nome, kw in [
        ("sem compressão", {}),
        ("sem ferramenta nenhuma (piso)", dict(chamadas_ferramenta=0)),
        ("compressão gatilho 4.000 → alvo 2.000", dict(compressao=(4000, 2000))),
        ("compressão gatilho 3.000 → alvo 1.800 (agressiva)", dict(compressao=(3000, 1800))),
        ("compressão gatilho 2.500 → alvo 1.600 (muito agressiva)", dict(compressao=(2500, 1600))),
        ("reinício a cada 8 turnos, resumo de 400 tokens de texto", dict(reinicio_a_cada=8)),
        ("reinício a cada 5 turnos, resumo de 400 tokens de texto", dict(reinicio_a_cada=5)),
    ]:
        c, ctx = aula_live(**kw)
        print(f"{nome:62} {c:9.3f} {c*4:11.2f} {int(max(ctx)):13d}")
