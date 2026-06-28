# ⚡ BlankStare: Dev-English to English

> **Zero cost BYOK** — Bring Your Own (free) API Key. No subscription. No hidden fees.

**Translate developer documentation, error messages, READMEs, terminal output, and tech jargon into plain English — instantly, while you browse.**

A Chrome sidebar extension powered by Groq's free AI API. Built for intelligent non-developers who frequently encounter technical content they need to understand quickly — and who are tired of getting the blank stare from Stack Overflow.

---

## ✨ Features (Phase 1)

| Feature | Details |
|---|---|
| 🧠 **AI explanations** | Groq streaming, word-by-word. 5 reading levels (ELI5 → Legal). |
| 🌐 **Greek & English** | Full EN/EL toggle — UI, explanations, and voice readout. |
| 📖 **Jargon dictionary** | Identifies every technical term in the explanation with a 2-10 word definition. |
| 🕐 **Session history** | Last 20 explanations — click any to reload it. |
| 📋 **Copy · 🔊 Voice · ↓ Deeper · ↺ Rephrase** | Four unobtrusive action buttons under every explanation. |
| 📄 **Full page summary** | Summarises the entire current page in 3-5 bullet points. |
| 💬 **Custom question** | Ask anything using the selected text as context. |
| 🎯 **Three trigger modes** | Floating button, right-click menu, always-on — any combination. |
| ⌨️ **Keyboard shortcuts** | Alt+Shift+B (open panel) · Alt+Shift+E (queue selection). |
| 📺 **YouTube search** | Inline video search and embed (requires free YouTube API key). |
| 🔍 **Web search** | SearXNG private instance or DuckDuckGo fallback. |
| 📚 **Resource links** | MDN, W3Schools, DevDocs — no API needed. |
| 🚫 **Exclude list** | Silence BlankStare completely on specific domains. |
| ⚙️ **3-tab settings page** | Settings · How to use · About — with accordion setup guides and live API test buttons. |
| 🔤 **Comfortaa font** | Bundled locally, Greek + Latin subsets, no external requests. |
| 🎬 **Lottie animations** | 18 animated icons, bundled locally, amber colour scheme. |

## 🔮 Coming in Phase 2

- 📖 Wiki integration (BookStack, self-hosted)
- 🏆 Community contributions with gamification (points, badges, leaderboard)

---

## 🚀 Getting Started

### Install for development (load unpacked)

1. Clone this repository:
   ```
   git clone https://github.com/Stravelakis/BlankStare-Dev-English-to-English.git
   ```

2. Open Chrome and go to `chrome://extensions`

3. Enable **Developer mode** (top-right toggle)

4. Click **Load unpacked** and select the `devtranslate` folder

5. The extension will appear in your toolbar. Click it to open Settings.

### API Keys

| Key | Where to get it | Required? |
|---|---|---|
| **Groq API key** | [console.groq.com](https://console.groq.com) — free account | ✅ Yes |
| **YouTube Data API v3** | [Google Cloud Console](https://console.cloud.google.com/apis/library/youtube.googleapis.com) — free tier (100 searches/day) | Optional |
| **SearXNG URL** | Your own self-hosted instance | Optional |

> **Privacy note:** Your API keys are stored in Chrome's local sync storage (`chrome.storage.sync`) and are only ever sent to the respective APIs (Groq, YouTube). They are never bundled in the extension or sent anywhere else.

---

## 🗂️ Project Structure

```
devtranslate/
├── manifest.json        ← Extension config (the "ID card" Chrome reads)
├── background.js        ← Service worker — coordinates everything
├── content.js           ← Injected into pages — handles text selection
├── content.css          ← Styles for the floating Explain button
│
├── sidepanel/
│   ├── sidepanel.html   ← Side panel UI layout
│   ├── sidepanel.js     ← Side panel logic (AI calls, YouTube, search)
│   └── sidepanel.css    ← Side panel styles
│
├── settings/
│   ├── settings.html    ← Settings page layout
│   ├── settings.js      ← Settings save/load logic
│   └── settings.css     ← Settings page styles
│
├── utils/
│   ├── api.js           ← All external API calls (Groq, YouTube, SearXNG)
│   └── storage.js       ← Chrome storage helpers
│
└── icons/               ← Extension icons (16, 32, 48, 128px)
```

---

## 🔧 SearXNG CORS Setup

If you use your own SearXNG instance for web search, you need to enable CORS so the extension can call it. In your SearXNG `settings.yml`:

```yaml
server:
  cors_cors_allowed_origins: "*"
```

Restart SearXNG after changing this.

---

## 🤖 AI Models

Both models run on Groq's infrastructure and are fast:

| Model | Speed | Best for |
|---|---|---|
| `llama-3.1-8b-instant` | ⚡ Very fast | Quick lookups, simple jargon |
| `llama-3.3-70b-versatile` | 🧠 Slightly slower | Complex concepts, nuanced explanations |

---

## 📋 Roadmap

- [x] Phase 1: Core explanation engine, resource links, YouTube, web search
- [ ] Phase 2: BookStack wiki integration
- [ ] Phase 2: Community contributions + gamification
- [ ] Chrome Web Store publication

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

*Built with Claude, Groq, and a healthy frustration with developer documentation that assumes everyone has a CS degree.*
