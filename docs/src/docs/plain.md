---
checkedAgainst: v0.8.1
checkedOn: 2026-11-21
---

## What BlankStare is

A free add-on for **Google Chrome** that opens a panel at the side of your browser. When you hit something written for programmers (an error message, a setup guide, a README, terminal output), you select it and the panel rewrites it in plain English or Greek, as you watch.

It does not put notes on top of the original. It gives you a version you can read **instead of** the original, with the exact commands kept so you can still copy and run them.

> **In short** Select confusing text, right-click, choose **Explain with BlankStare**, read the plain version. No account, no card, and it works with no key at all.

What you need:

- Chrome 116 or newer, or a browser built on Chrome (Edge, Brave, Opera, Vivaldi) that has the side panel.
- Nothing else. For faster or better answers you can add a free key from Google Gemini or Groq. Each takes about three minutes and needs no card.

## Install it

BlankStare is installed by hand from the code for now. It is not in the Chrome Web Store yet.

1. Download the code: on the [GitHub page](https://github.com/Stravelakis/BlankStare-Dev-English-to-English), the green **Code** button, then **Download ZIP**. Unzip it.
2. In Chrome, open `chrome://extensions`.
3. Switch on **Developer mode** (top right).
4. Press **Load unpacked** and pick the unzipped folder (the one with `manifest.json` in it).
5. A Settings tab opens by itself with a five-step setup: language, how simple, which free AI, a key or **Try it now**, done.

> **Watch out** Chrome will say BlankStare can "read and change all your data on all websites". That is because the small ⚡ button beside selected text has to be present on every page. BlankStare only reads what you select, or the page when you ask for a summary.

**To update:** download the new version over the old folder, then press the reload arrow on BlankStare's card in `chrome://extensions`. Your settings are kept. **To remove it:** `chrome://extensions` → BlankStare → **Remove**. Your keys go with it.

## Use it every day

1. Open the panel: click the BlankStare toolbar icon, or press **Alt + Shift + B** (on a Mac, **Ctrl + Shift + B**).
2. Select the confusing text on any page.
3. Right-click and choose **Explain with BlankStare**, or press the small **⚡ Explain** button that appears beside the selection.
4. Read the answer as it appears. Commands come in boxes with a **Copy** button, and steps are numbered.

The ⚡ button only appears **while the panel is open** (Chrome does not let a page open the panel by itself). Right-click works either way. **Alt + Shift + E** queues the selected text: if the panel is open it explains at once, otherwise a "!" badge shows on the toolbar icon and it waits until you open the panel.

Each browser tab gets its **own panel**. It opens in the tab you opened it from, keeps its own answer, and is hidden when you switch to another tab.

### Under each answer

- **↓ More detail**: a longer, fuller answer.
- **↺ Different wording**: the same meaning, said another way.
- **📄 Full page**: a short summary of the page the tab is showing right now. BlankStare picks the main article and skips menus and footers, and reads at most the first 4,000 characters.
- **🧭 What do I need first?** lists the accounts, programs and files to have ready.
- **✅ Do it with me** turns the steps into a checklist you tick off.
- **📋** copies the whole answer. **🔊** reads it aloud.
- **📖 Term glossary** (a switch): every technical term in your selection with a short meaning.
- **💬 Ask a follow-up**: type your own question, or tap a ready-made one such as "Is this safe to do?" or "What could go wrong?".
- **📺 YouTube explanation**: videos about the topic, played inside the panel. Needs a YouTube key (see below).

### Change who it talks to

At the top of the panel:

- **The reading-level box** has four levels: **ELI5**, **Newbie**, **Standard** (a smart person who does not write code) and **Vibecoder** (someone who builds with AI tools and already knows what an API or a prompt is). Settings calls the same four "Like I’m five", "New to this", "I work with developers" and "I build with AI".
- **+ Context** lets you add a line about yourself ("I'm setting up WordPress on Windows") so the examples fit.
- **EN / EL** switches the panel, the answers and the voice between English and Greek.
- **↻** lights up after you change the level, language or context. Press it to run the same text again.

Other things to know:

- **Paste a screenshot:** copy one, click in the panel and press **Ctrl + V**. It is explained as well. Big images are shrunk first.
- **History:** the clock icon shows your last 20 answers. Click one to open it again. They disappear when you close the browser.
- **English text only:** BlankStare translates English developer text. If your selection looks like Greek it stops and tells you, to save the request. To get the answer **in** Greek, use the EN / EL button and keep selecting English text.

## Which AI answers

BlankStare uses free AI services. On the first use each day it checks which free models are really working (a public daily list called **The Nein**, plus each service's own list) and uses the best one. If one is busy or gone it moves to the next by itself. Under every answer it shows which model wrote it.

| You have | You get |
|---|---|
| **Nothing** | **OVHcloud**, in Europe. Free, no account. Slower when it is busy. |
| A free **Google Gemini** key | The best answers, and they can be read aloud in Gemini's own voice, Greek included. |
| A free **Groq** key | The fastest answers. Also unlocks the **Orpheus** voice (English only). |

You can add keys any time in **Settings** (the gear icon in the panel). Under **Your free AI**, press **Test** next to a key and it checks it in seconds. **Today's models** shows the list for today; **Try first** lets you pin one model, and **Check again now** rebuilds the list.

### Get a free key

1. **Gemini:** open [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in with Google, press **Create API key**, copy it. Make it in a Google project with **no billing set up**, or the free tier will not apply.
2. **Groq:** open [console.groq.com/keys](https://console.groq.com/keys), make a free account, press **Create API Key**, copy it (it starts with `gsk_`).
3. Paste it into Settings under **Your free AI** and press **Test**.

> **Watch out** A key is like a password to your account at that service. Keep it private. BlankStare stores it in Chrome's own extension storage, never anywhere else.

## Settings worth knowing

Settings save by themselves, so there is no Save button. The sections are **You**, **Your free AI**, **Voice**, **How you open it** and **Extras**.

- **Voice:** **Best available** (default), **Orpheus** (needs a Groq key), or **Browser voice** (your computer's own voice, works in Greek if you have a Greek voice installed).
- **How you open it:** switch the **Right-click menu** and the **Floating button** on or off (at least one must stay on), and the **Jargon list under each answer** (the same switch as the panel's glossary).
- **Extras → YouTube videos in the panel:** paste a YouTube Data API key. Without one, the panel's YouTube box asks you to add it.
- **Extras → Stay quiet on these sites:** one website per line. On those sites the ⚡ button does not appear. `example.com` also covers `www.example.com`. It does **not** switch off the right-click menu or the shortcuts.
- **Run the setup again** (at the bottom) repeats the five steps.

## Your privacy

- **What leaves your computer:** the text you select (or a screenshot you paste, or the page text when you press **Full page**), plus anything you type in **+ Context** or a follow-up. It goes to the AI that answers: OVHcloud, Google or Groq.
- **It can go to more than one.** If the first model is busy or refuses, the same text goes to the next one. So with a Gemini key on, a request may touch OVHcloud, Google and Groq in turn.
- **Google's free tier:** Google says it may use what you send to improve its AI, and people at Google may read it. Do not select private information when Gemini is answering.
- **Once a day** BlankStare downloads The Nein's public list of free models, and asks each service you use which models it offers. No text of yours is sent with those.
- **YouTube:** only if you added a YouTube key and press **Search**, a search phrase based on the start of your selection goes to Google. Playing a video loads YouTube's own player.
- **Your keys and settings** live in Chrome's extension storage. If you have Chrome sync turned on, Chrome syncs them between your own devices.
- **Nothing goes to the author.** No account, no analytics, no tracking.
- The full policy is on the [privacy page](/BlankStare-Dev-English-to-English/privacy/).

## Fix it

<details>
<summary>Answers are slow, or it says every model is busy</summary>

The no-key AI (OVHcloud) slows down when many people use it, or when you ask a lot in a short time. Wait a minute and try again. If it keeps happening, add a free Gemini or Groq key in Settings. BlankStare tries the next model by itself, so a busy one rests for about a minute.

</details>

<details>
<summary>A key is refused</summary>

It was mistyped, or deleted at the provider. Copy it again and paste it. For Gemini, make the key in a project with no billing. BlankStare sets that service aside for the day and uses the others.

</details>

<details>
<summary>The ⚡ button does not appear</summary>

Check these in order: the **panel is open** (press Alt + Shift + B); **Floating button** is on in Settings → How you open it; the site is not on your **Stay quiet** list. On `chrome://` pages and the Chrome Web Store, Chrome forbids extensions, so copy the text into any normal page. Right-click always works if the page allows it.

</details>

<details>
<summary>Full page says it cannot read this page</summary>

Reload the page once and try again. Tabs opened before BlankStare was installed or updated cannot be read until they are reloaded. Browser pages and PDFs cannot be read at all: select the text instead.

</details>

<details>
<summary>The answer stopped halfway, with a notice</summary>

The connection dropped. What arrived is kept on screen. Press **↻** to run it again.

</details>

<details>
<summary>The voice reads nothing or only part</summary>

The free voices have a daily allowance and a length limit, and the panel tells you when it shortened an answer. If a voice fails, BlankStare falls back to your computer's own voice. For Greek, add a Greek voice in your computer's speech settings.

</details>

## It can be wrong

It is an AI. Free models guess, and they can be confidently wrong. BlankStare tells them to keep exact numbers and warnings, to say when a step could delete or break something, and to say when they are not sure, but that is a request to the model, not a guarantee. **Read warnings before you run a command**, and use **💬 Ask a follow-up → "Is this safe to do?"** when in doubt.
