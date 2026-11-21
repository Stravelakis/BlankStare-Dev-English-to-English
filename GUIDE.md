# Guide: BlankStare

The complete manual. Install first: [INSTALL.md](INSTALL.md).

## Concepts

- **Translation, not explanation.** BlankStare rewrites the text you select so
  you can read its version *instead of* the original. It never says "this
  means…"; it just says it.
- **No key needed.** By default the writing is done by OVHcloud's anonymous AI
  endpoint (in Europe, free, slower when busy). If you want better or faster
  answers, add a free key: Google Gemini (best quality) or Groq (fastest).
  Keys stay in Chrome's sync storage.
- **Reading level.** Who the answer is written for: ELI5 (a child), Newbie,
  Standard (a smart non-developer), or Vibecoder (someone who builds with AI
  tools and knows what an API or a prompt is).
- **The panel.** Chrome's side panel, on the right of the window. BlankStare
  lives there, next to the page you are reading. Each tab gets its own panel:
  it opens in the tab you opened it from and hides when you switch tabs.

## Features

### Translate a selection

- **How:** select text on any page, then press the ⚡ button that appears
  beside it, or right-click → **Explain with BlankStare**, or press
  **Alt + Shift + E**. The ⚡ button only appears while the panel is open.
  Alt + Shift + E queues your selection (a "!" badge shows on the toolbar
  icon); it is explained at once if the panel is already open, otherwise when
  you open the panel (toolbar icon or Alt + Shift + B).
- **Options:** reading level (dropdown at the top), **+ Context** (tell it who
  you are or what you're doing, e.g. "I'm setting up WordPress").
- **Screenshots:** copy a screenshot and press **Ctrl + V** in the panel to
  have it explained.
- **While it writes:** a brass light runs around the answer card, and symbols
  settle into "Translating..." until the first word arrives. Under each answer
  you can see which model wrote it. The welcome screen counts today's
  translations.
- **What you get:** exact commands sit in copy boxes with a **Copy** button;
  steps are numbered; numbers and warnings are kept. If the AI is unsure, it
  says so. Text on a page cannot give the AI orders.
- **Limits:** the floating button only appears while the panel is open (Chrome
  won't let a page open the panel by itself). Right-click and the shortcut work
  either way.

### Re-explain, More detail, Different wording

- **Re-explain (↻):** after changing the level, language or context, the button
  turns bright; press it to run the same text again.
- **↓ More detail:** a longer, fuller answer (twice the length budget).
- **↺ Different wording:** the same meaning, said another way.

### What do I need first? and Do it with me

- **🧭 What do I need first?** lists what you should have or know before
  starting.
- **✅ Do it with me** turns the answer into a checklist with tick boxes.

### Term glossary

Switch on **📖 Term glossary** in the panel (Settings calls the same setting
**Jargon list under each answer**). Every technical term in the selection is
listed with a two-to-ten word meaning. The list starts with the answer and
usually arrives first.

### Read aloud

- The 🔊 button (tooltip: Read aloud) reads the answer.
- **Gemini key:** Gemini 3.8 Live answers can be read aloud in Gemini's own
  voice.
- **Groq key:** also unlocks the Orpheus voice (English only).
- **No key, or Greek:** the computer's own voice. For Greek, add a Greek voice
  in your computer's speech settings.
- **Limits:** the free voices have a daily allowance and a length limit; long
  answers are shortened and the panel says so. If a voice fails, BlankStare
  falls back to the computer's voice.

### Full page summary

**📄 Full page** summarises the page the tab shows at the moment you press it,
in three to five points. BlankStare picks the main article and skips menus and
footers. If it says it cannot read the page, reload the page once: tabs opened
before BlankStare was installed or updated cannot be read until then.

### Ask your own question

**💬 Ask a follow-up** under the answer: ask anything, with the selection as
background.

### Videos

**YouTube:** needs a free YouTube key (Settings → Extras → YouTube videos in
the panel). Videos play inside the panel.

### History

The clock icon at the top opens your last 20 answers. Click one to show it
again. History is cleared when you close the browser.

### Language

**EN / EL** at the top switches the panel, the answers and the voice between
English and Greek.

### Stay quiet on these sites

Settings → Extras → **Stay quiet on these sites**: websites where BlankStare stays completely silent
(no button, nothing). One domain per line; `example.com` also covers
`www.example.com`.

## Self-correcting models

On the first use each day, BlankStare reads
[The Nein](https://stravelakis.com/project/the-nein/) (a daily free-model
checker by the same author) plus each provider's own model list, and builds
today's ranked list. A model that is gone is skipped for the day. A busy one
rests a minute. If a key is refused, that provider is set aside for the day.

## Configuration

Settings open with a 5-step setup: language, how simple, pick your free AI, a
key or **Try it now**, done. Press **Run the setup again** (bottom of
Settings) to redo it. Settings save by themselves; there is no Save button.
The page has these sections: **You** (Language, How simple, About you), **Your
free AI** (OVHcloud, Google Gemini and Groq cards, Today's models, Try first),
**Voice** (Best available, Orpheus, Browser voice), **How you open it**
(Right-click menu, Floating button, Jargon list under each answer) and
**Extras** (YouTube key, Stay quiet on these sites).

| Setting | Default | What it does |
|---|---|---|
| Language | English | Language of the panel, answers and voice |
| How simple | Standard | Level each new answer starts at |
| Gemini key | none (optional) | Free, best quality. From aistudio.google.com/apikey |
| Groq key | none (optional) | Free, fastest. From console.groq.com/keys. Also unlocks Orpheus |
| Try first | Automatic | Optional pin: ask one model first |
| YouTube key | none | Turns on video search |
| Floating button | on | The ⚡ button beside selected text (only while the panel is open) |
| Right-click menu | on | "Explain with BlankStare" on right-click |
| Stay quiet on these sites | empty | Sites where BlankStare does nothing |
| Jargon list under each answer | off | Same as the panel's Term glossary switch |
| Voice | Best available | Best available, Orpheus (Groq key) or Browser voice |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Answers are slow | The no-key AI (OVHcloud) is busy | Wait, or add a free Gemini or Groq key in Settings |
| A key is refused | Mistyped, or deleted at the provider | Paste a new key. BlankStare sets that provider aside for the day and uses the others |
| A model rests for a minute | It was busy | Nothing: BlankStare tries the next one |
| No ⚡ button appears | Panel is closed, the site is on the quiet list, or the button is switched off | Open the panel (Alt + Shift + B); check Settings → How you open it, and Extras → Stay quiet on these sites |
| ⚡ button doesn't appear on `chrome://` pages or the Web Store | Chrome forbids extensions there | Copy the text into any normal page |
| Voice reads nothing | Free voice allowance used up, or no system voice installed | Use the computer's voice; for Greek, add a Greek voice in your computer's speech settings |
| The answer stops halfway with a notice | The connection dropped | What arrived is kept; press ↻ to run it again |

## Previewing without Chrome (developers)

```bash
npx http-server . -p 8123 -c-1
```

Open `http://localhost:8123/lab/preview.html` for the panel in every state,
colourway and language, and `lab/button-preview.html` for the floating button
on a deliberately hostile page. `node lab/shoot/shoot.mjs` (after `npm install` in `lab/shoot`) regenerates every
screenshot.

## FAQ

**Is it really free?**
Yes. It works with no key, and the optional Gemini and Groq keys are free (no
card or billing). BlankStare has no paid tier.

**What does it send, and where?**
The text you select (or a pasted screenshot, or the page for a summary) goes to
whichever AI answers: OVHcloud, Google or Groq. BlankStare also fetches The
Nein's public model list. Video searches go to YouTube, only when you press
Search. Keys stay in Chrome's sync storage.
No data about you goes to the author. The daily model-list fetch from
stravelakis.com sends nothing about you.

**Why does Chrome warn it can "read and change all your data"?**
The ⚡ button has to be on every page before you select anything, and that
requires access to every page. BlankStare only reads your selection, or the
page when you ask for a summary.

**Does it work in Edge or Brave?**
Any Chromium browser from version 116 with side-panel support.
