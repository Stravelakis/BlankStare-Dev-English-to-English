# Chrome Web Store listing: BlankStare

Everything to paste into the developer dashboard
(https://chrome.google.com/webstore/devconsole), field by field.
Prepared 21/11/2026 for version 0.8.1.

## Package

- **File:** `blankstare-v0.8.1.zip`, built from the `v0.8.1` tag with:

  ```bash
  git archive --format=zip -o blankstare-v0.8.1.zip v0.8.1 manifest.json background.js content.js sidepanel settings utils vendor fonts icons LICENSE NOTICE
  ```

## Store listing tab

- **Name:** comes from the manifest: `BlankStare: Dev English to English`
- **Summary:** comes from the manifest:
  `Turns developer docs, error messages and tech jargon into plain English or Greek you can act on. Free, works with no key.`
- **Category:** Developer Tools
- **Language:** English
- **Description:**

  ```text
  Found an error message, a README or install steps you can't follow? Select the text and BlankStare rewrites it in plain English (or Greek) you can act on: what it means, and what to do next.

  • Works straight away. No account, no key, no payment.
  • Commands stay exact, in copy boxes. Steps keep their numbers.
  • "Do it with me" turns instructions into a checklist you tick off.
  • "What do I need first?" lists what to install or know before you start.
  • More detail, different wording, or a summary of the whole page.
  • Ask follow-up questions, or paste a screenshot (Ctrl+V) to have it explained.
  • Four reading levels, from "like I'm five" to "I build with AI".
  • Answers read aloud. English and Greek.
  • Each tab has its own panel. Your last 20 answers are one click away.

  How it gets answers: BlankStare uses free AI services. With no key it uses OVHcloud's free AI. You can add a free Google Gemini or Groq key for faster, better answers. It checks every day which free models are working and moves on by itself when one is busy or gone.

  Open it: select text and right-click "Explain with BlankStare", click the toolbar icon, or press Alt+Shift+B. Alt+Shift+E queues the selection.

  Privacy: the text you select goes only to the AI service that answers. Nothing goes to the author. No ads, no tracking. Full policy: https://docs.stravelakis.com/BlankStare-Dev-English-to-English/privacy/

  Documentation: https://docs.stravelakis.com/BlankStare-Dev-English-to-English/
  ```

- **Store icon (128×128):** `icons/icon128.png`
- **Screenshots (1280×800), in this order:** `store/1-result.png`,
  `store/2-checklist.png`, `store/3-greek.png`, `store/4-setup.png`,
  `store/5-settings.png`
- **Small promo tile (440×280, required):** `store/promo-small-440x280.png`
- **Marquee promo tile (1400×560, optional):** `store/promo-marquee-1400x560.png`
- **Official URL:** leave empty. It needs a site verified in Google Search Console.
- **Homepage URL:** https://docs.stravelakis.com/BlankStare-Dev-English-to-English/
- **Support URL:** https://github.com/Stravelakis/BlankStare-Dev-English-to-English/issues

## Privacy practices tab

- **Single purpose:**

  ```text
  Explains developer text (error messages, documentation, instructions) that the user selects, in plain English or Greek, in the browser side panel.
  ```

- **Permission justifications:**

  | Permission | Justification to paste |
  |---|---|
  | `storage` | Saves the user's settings, optional free API keys, today's model list and the last 20 answers. Settings sync through the user's own Chrome account; answers are kept only for the browser session. |
  | `contextMenus` | Adds the "Explain with BlankStare" item to the right-click menu when text is selected. |
  | `sidePanel` | BlankStare's whole interface is the side panel, opened for the tab the user opened it from. |
  | Host permission: `oai.endpoints.kepler.ai.cloud.ovh.net` | Sends the selected text to OVHcloud's free AI to get the explanation (the default, no key needed). |
  | Host permission: `generativelanguage.googleapis.com` | Sends the selected text to Google Gemini when the user has added their own free Gemini key. |
  | Host permission: `api.groq.com` | Sends the selected text to Groq when the user has added their own free Groq key, and for the optional Orpheus read-aloud voice. |
  | Host permission: `www.googleapis.com` | YouTube video search, only when the user adds a YouTube key and presses Search. |
  | Host permission: `stravelakis.com/wp-json/nein/*` | Downloads a public list of which free AI models are working today. Nothing is sent. |
  | Content script on all sites | Reads the text the user selects (and the page text when they press "Full page"), and shows the small "Explain" button beside a selection while the panel is open. It reads nothing until the user acts. |

- **Remote code:** No, I am not using remote code. (All scripts ship in the package.)
- **Data usage, what is collected:** tick
  - **Website content** — the selected text, or the page text for "Full page", sent to the AI service to produce the answer.
  - **Authentication information** — the user's own optional API keys, stored in their Chrome and sent only to Google or Groq to sign the request.
- **Certify all three:** not sold to third parties; not used for unrelated purposes; not used for creditworthiness or lending.
- **Privacy policy URL:** https://docs.stravelakis.com/BlankStare-Dev-English-to-English/privacy/

## Distribution tab

- **Visibility:** Public
- **Regions:** All regions
- **Price:** Free

## Review notes

- The content script on all sites usually means an in-depth review, which can
  take longer than a few days.
- If the reviewer asks how to test: install, select any text on a web page,
  right-click "Explain with BlankStare". No key or account needed.
