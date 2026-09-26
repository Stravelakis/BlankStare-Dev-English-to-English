# Guide: BlankStare

The complete manual. Install first: [INSTALL.md](INSTALL.md).

## Concepts

- **Translation, not explanation.** BlankStare rewrites the text you select so
  you can read its version *instead of* the original. It never says "this
  means…"; it just says it.
- **Bring your own key (BYOK).** The writing is done by Groq, an AI company
  with a free allowance. You make a free key once; it stays in your browser.
- **Reading level.** Who the answer is written for: ELI5 (a child), Newbie,
  Standard (a smart non-developer), or Vibecoder (someone who builds with AI
  tools and knows what an API or a prompt is).
- **The panel.** Chrome's side panel, on the right of the window. BlankStare
  lives there, next to the page you are reading.

## Features

### Translate a selection

- **How:** select text on any page, then press the brass button that appears
  beside it, or right-click → **Explain with BlankStare**, or press
  **Alt + Shift + E**.
- **Options:** reading level (dropdown at the top), **+ Context** (tell it who
  you are or what you're doing, e.g. "I'm setting up WordPress").
- **Limits:** the floating button only appears while the panel is open (Chrome
  won't let a page open the panel by itself). Right-click and the shortcut work
  either way.

### Re-explain, Go deeper, Different wording

- **Re-explain (↻):** after changing the level, language or context, the button
  turns bright; press it to run the same text again.
- **Go deeper:** a longer, fuller answer (twice the length budget).
- **Different wording:** the same meaning, said another way.

### Jargon dictionary

Switch on **Jargon dictionary** in the panel. Every technical term in the
selection is listed with a two-to-ten word meaning.

### Read aloud

- The speaker button reads the answer.
- **English:** Groq's Orpheus voices (Tara, Leah, Leo, Jess, Zac, Zoe, Mia;
  choose in Settings → Tweak the Brain), or the computer's own voice.
- **Greek:** always the computer's Greek voice. Orpheus only speaks English.
- **Limits:** Orpheus has a daily allowance (about 100 a day on the free tier)
  and a length limit; long answers are shortened and the panel says so. If
  Orpheus fails, BlankStare falls back to the computer's voice.

### Full page summary

**Full page** summarises the whole page you're on in three to five points.
BlankStare picks the main article and skips menus and footers.

### Ask your own question

**Ask a follow-up** under the answer: ask anything, with the selection as
background.

### Read more, videos and web search

- **Read more on:** links to MDN, W3Schools and DevDocs for the selection.
- **YouTube:** needs a free YouTube key (Settings → YouTube). Videos play
  inside the panel.
- **Web search:** your own SearXNG server shows results inside the panel.
  Without one, **Search** opens DuckDuckGo in a new tab.

### History

The clock icon at the top opens your last 20 answers. Click one to show it
again. History is cleared when you close the browser.

### Language

**EN / EL** at the top switches the panel, the answers and the voice between
English and Greek.

### Exclude list

Settings → **Exclude list**: websites where BlankStare stays completely silent
(no button, nothing). One domain per line; `example.com` also covers
`www.example.com`.

## Configuration

| Setting | Default | What it does |
|---|---|---|
| Language | English | Language of the panel, answers and voice |
| Default reading level | Standard | Level each new answer starts at |
| Groq API key | none (required) | The key the answers are written with |
| Model | llama-3.1-8b-instant | Which of 9 free models writes. This one has the biggest daily allowance (14,400) |
| Auto-fallback | on | When a model is busy, try the next one automatically |
| Voice | Orpheus, Zoe | English read-aloud voice |
| YouTube key | none | Turns on video search |
| SearXNG URL | none | Your own search server; Chrome asks permission for it when you press Test |
| Floating button | on | The brass button beside selected text |
| Right-click menu | on | "Explain with BlankStare" on right-click |
| Exclude list | empty | Sites where BlankStare does nothing |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "API key needed" in the panel | No Groq key saved | Settings → AI Engine → paste key → Test → Save Settings |
| "Invalid Groq API key" | Key mistyped or deleted at Groq | Make a new key at console.groq.com |
| "…is rate-limited — trying…" | That model's free allowance is used up for now | Nothing: auto-fallback moves on. If it's off, pick another model |
| No brass button appears | Panel is closed, the site is on the exclude list, or the button is switched off | Open the panel (Alt + Shift + B); check Settings → Trigger modes and Exclude list |
| Button doesn't appear on `chrome://` pages or the Web Store | Chrome forbids extensions there | Copy the text into any normal page |
| Voice reads nothing | Orpheus allowance used up, or no system voice installed | Settings → switch to Browser voice; for Greek, add a Greek voice in your computer's speech settings |
| SearXNG Test fails (error 403) | JSON results are off, which is SearXNG's default | In SearXNG's settings.yml add `json` under `search:` → `formats:`, restart it, press Test |
| SearXNG Test says permission declined | You pressed Block on Chrome's prompt | Press Test again and choose Allow |
| The answer stops halfway with a notice | The connection dropped | What arrived is kept; press ↻ to run it again |

## Previewing without Chrome (developers)

```bash
npx http-server . -p 8123 -c-1
```

Open `http://localhost:8123/lab/preview.html` for the panel in every state,
colourway and language, and `lab/button-preview.html` for the floating button
on a deliberately hostile page. `node lab/shoot.mjs` regenerates every
screenshot.

## FAQ

**Is it really free?**
Yes. Groq's free allowance covers normal use, and BlankStare has no paid tier.
If it saves you time, there's a Ko-fi link in the README.

**What does it send, and where?**
The text you select (or the page, for a summary) goes to Groq. Video searches
go to YouTube, web searches to your own server or DuckDuckGo, only when you
press Search. Nothing goes to the author.

**Why does Chrome warn it can "read and change all your data"?**
The brass button has to be on every page before you select anything, and that
requires access to every page. BlankStare only reads your selection, or the
page when you ask for a summary.

**Does it work in Edge or Brave?**
Any Chromium browser from version 116 with side-panel support.
