# BlankStare v0.8 plan (Chrome Web Store release)

_Written 19/11/2026. Facts checked that day; source next to each._

## Why now

The app is broken for everyone. 7 of the 9 built-in Groq models were shut down
between 17/07/26 and 21/09/26, including the default (`llama-3.1-8b-instant`),
the key test and the glossary model. Source: console.groq.com/docs/deprecations.

## Facts this plan rests on

| Fact | Source |
|---|---|
| OVH with no account: every chat model answers, 2 requests/min per model per IP, free | Live calls 19/11 (Qwen3.8-27B, gpt-oss-120b, gemma-4-26b, DeepSeek-V4.1-Flash all answered); OVH getting-started doc |
| OVH with a key: only ~7 models are €0 (guard, TTS, SDXL) — Ak was right about keyed use | itsfree.ai, freellmapihub (Oct–Nov 2026) |
| Gemini free key: Gemma 4 31B and 26B = 30/min, 14,400/day | The Nein feed 19/11; aifreeapi.com (21/10 reading) |
| Gemini free key: 3.5 Flash-Lite = 15/min, 500/day; Flash = 5/min, 20/day | same |
| Gemini Live models (`gemini-3.8-live`) are free on the free tier; limits NOT published, never probed by The Nein | aifreeapi.com quoting Google pricing; Nein status `never_probed` |
| Live models are the only free Gemini 3+ models with Google Search grounding | aifreeapi.com quoting Google pricing — **unverified by us** |
| Groq live free chat models: gpt-oss-120b, gpt-oss-20b, qwen3.8-27b | Groq models page + The Nein, 19/11 |
| The Nein publishes `stravelakis.com/wp-json/nein/v1/models.json` (395 models, daily, per-model `test_status`) | fetched 19/11 |
| Self-reported knowledge cutoffs are useless (gpt-oss said "2021") | live call 19/11 |
| OVH reasoning models spend the whole token budget thinking (gemma, DeepSeek returned no answer at 200 tokens) | live call 19/11 |

## Prototype results (19/11, real keys)

| Test | Result |
|---|---|
| Groq live model list | qwen3.8-27b, gpt-oss-120b, gpt-oss-20b (+ allam-2-7b, guards, speech) |
| Groq old default `llama-3.1-8b-instant` | 404 "does not exist" — confirms the bug |
| AI Studio dashboard (Ak's screenshot) | Gemini 3.8 Live: requests unlimited/min and /day, 65K tokens/min |
| Gemini 3.8 Live, text answer | Refused: "TEXT not supported by the model" |
| Gemini 3.8 Live, voice answer + written transcript | Works. First word 1.3s, short answer done in 12.4s, good translation. The transcript is the text; the voice is a free read-aloud |
| Gemini 3.8 Live + Google Search | "Exceeded quota" twice on the one free key tried — **no free search seen** |
| Gemma 4 31B (Gemini key) | Works, good translation, but 26.9s, and one "high demand" 503 earlier |
| Key `GEMINI_API_KEY` | project has no free tier; `AK1_GEMINI_API_KEY` = paid, credit used up; tested on `BLACKSMITH_THE_NEIN_GEMINI_KEY` |

Consequence: Live's text comes at roughly talking speed — a long full-page
answer could take a minute or more. Live suits selections; Gemma suits whole
pages. No free way to search the web was found, so fresh knowledge comes from
using the newest models (Gemini 3.8 Live, Qwen3.8) and from the page itself.

## Providers, in order

1. **No key — OVH anonymous.** Works the minute it is installed. Rotates across
   2–3 good models so one person rarely hits the 2/min cap.
2. **Gemini free key (Google account, no card).** Selections: Gemini 3.8 Live
   (unlimited requests, newest model, its voice replaces the 100/day Orpheus
   read-aloud). Whole pages and fallback: Gemma 4 31B (14,400/day).
3. **Groq free key.** gpt-oss-120b / qwen3.8-27b, fastest.
4. AI Horde: left out (Ak, 19/11).

## Self-correcting, once a day

On the first translation of each day:
1. Fetch The Nein feed (one small request, no user data sent).
2. Keep models that are `free`, `live`, `test_status: ok`, text in/out, from a
   provider the user can use (keyless, or they have that key).
3. Rank by a BlankStare quality list (newest strong instruct models first),
   then by limits.
4. If The Nein is unreachable: ask each provider's own model list instead.
5. During use: a "model not found" answer marks that model dead for the day and
   moves to the next one, with a one-line "switched to X" note. A rate limit
   moves to the next one too.

## Work, in order (human work hours)

1. **Provider engine (~8h)** — one code path for OVH, Gemini, Groq; daily check;
   failover; key test uses whatever is live. Remove SearXNG (the DuckDuckGo
   link stays — it is just a link, no service).
2. **Gemini Live prototype (~3h)** — text out, Search grounding, real limits.
   Needs a Gemini key from the vault. Ship it only if it passes.
3. **Prompts, quality first (~3h)** — reasoning budget fixed; low randomness;
   must-type commands kept exact in a copy box; numbers/file names/settings kept
   exact; "say so if unsure"; page text fenced so a page can't instruct the AI;
   Rephrase sees the earlier answer.
4. **Side-by-side preview page (~3h)** — 2–3 versions of the settings page and
   the side panel to pick from.
5. **Settings page build (~12h)** — first-run Stepper wizard, Gradient Blinds
   background, Letter Glitch "decode" during the key test.
6. **Side panel motion (~4h)** — Prompt Bar follow-up with spark, first line
   decodes from symbols, shimmer edge while streaming, still under reduced motion.
7. **New features (~10h)** — first-install setup, explain a screenshot (vision
   model), "what do I need to know first?", "do it with me" checklist mode,
   "X free translations left today" meter.
8. **Store prep (~4h)** — privacy policy and store answers match the new network
   calls (OVH, Google, Groq, The Nein), tests, HANDOFF, screenshots.

Kept: the animated Lottie icons and the current colours.
