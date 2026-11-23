---
checkedAgainst: v0.8.1
checkedOn: 2026-11-21
---

## Start here

This page takes you from "I have never added anything to my browser" to "I selected a scary error message and read it in plain words". Go slowly. Nothing here can break your computer, and every step says what you should see, so you always know whether it worked.

> **Do this first** You do not need to understand everything before you begin. Read **The ideas** (about five minutes), then follow the steps. Come back to the rest when you want it.

**What you will have at the end:**

- BlankStare added to your Chrome browser.
- A side panel that rewrites hard "programmer words" into easy ones.
- A free way to get answers (and a free upgrade if you want one).
- A clear picture of what stays on your computer and what travels.

**What you do not need:** an account, a credit card, or any knowledge of code. You need Google Chrome and the internet.

**How long:** about 15 minutes.

## The ideas

Take them one at a time. Nothing here is a test.

### 1. Programmers write in a secret language

Programs sometimes show you messages like `TypeError: Cannot read properties of undefined`. Setup guides say things like "run `npm install` in your terminal". These are written for programmers. If you are not one, it feels like a foreign language. BlankStare is a translator for it.

### 2. An extension is a small add-on for your browser

Your **browser** is the program you use to look at websites (here: Google Chrome). An **extension** is a small helper that you add to it, like adding an app to a phone. BlankStare is an extension.

### 3. The side panel

A **panel** is a little window. BlankStare's lives at the right-hand side of the Chrome window, next to the page you are reading. You do not leave your page.

### 4. "Select" means colour the words in

To **select** text, you hold down the left mouse button and drag across the words. They get a coloured background. That is how you tell BlankStare "this is the part I do not understand".

### 5. The clever computer that writes the answer

BlankStare does not think by itself. It asks an **AI model**: a program that has read a huge amount of text and is good at writing. Think of it as a very well-read helper that lives on a company's computers far away. BlankStare asks it to say the same thing again in easy words.

### 6. Free helpers, and tickets

Several companies lend out their helper for free. BlankStare knows three: **OVHcloud** (in Europe), **Google Gemini** and **Groq**. OVHcloud works straight away with nothing to sign up for. For Google and Groq you need a **key**: a long secret code, like a free library ticket, that says "this person is allowed". A key is optional. It just makes answers faster or better.

### 7. Your words travel

When you ask for an explanation, the words you selected are **sent over the internet** to the helper that answers, because that is where the thinking happens. So: do not select passwords, private messages or anything secret. Google's free tier says it may read what you send.

### 8. It can be wrong

The helper is a clever guesser, not a person who checked. Usually it is right. Sometimes it is confidently wrong. When a step could delete or break something, it should warn you, and you should read that warning before you do the step.

> **In short** You select hard words. BlankStare sends them to a free AI helper, which writes the same thing in easy words in a panel beside the page. Your selected words travel, so keep secrets out of them. It can be wrong, so read warnings.

## Step 1: Check you have Chrome

1. Open Google Chrome. (If you use Edge, Brave, Opera or Vivaldi, those can work too. This page uses Chrome.)
2. Click the long box at the top where web addresses go. Type `chrome://version` and press **Enter**.

**What you should see:** a page of details that starts with a version number made of several numbers joined by dots. The **first number** must be **116 or higher**. If it is lower, update Chrome first (the same page has a link to check for updates).

## Step 2: Download BlankStare

BlankStare is not in the Chrome Web Store yet, so you add it by hand. That is a few clicks.

1. Go to the BlankStare page on GitHub: [github.com/Stravelakis/BlankStare-Dev-English-to-English](https://github.com/Stravelakis/BlankStare-Dev-English-to-English). **GitHub** is a website where programmers keep their projects. This is the official home of BlankStare.
2. Click the green button called **Code**.
3. Click **Download ZIP**.
4. Wait for it to finish.

**What you should see:** a file ending in **.zip** appears in your browser's download list, usually saved in your **Downloads** folder.

## Step 3: Unpack it

A **ZIP** file is like a box with everything folded flat inside. You have to open the box.

1. Find the ZIP file in your **Downloads** folder.
2. On Windows: right-click it and choose **Extract All**, then **Extract**. On a Mac: double-click it.
3. Open the new folder that appears.

**What you should see:** a folder full of files. One of them is called **manifest.json**. If you do not see `manifest.json` straight away, you are one folder too high: open the folder inside this one.

> **Watch out** Do not delete this folder afterwards. Chrome reads BlankStare from it every time it starts. Put it somewhere you will not tidy away, like your Documents folder.

## Step 4: Add it to Chrome

1. In Chrome, click the address box, type `chrome://extensions` and press **Enter**.
2. At the top right, switch on **Developer mode**.
3. Click **Load unpacked** (it appears on the top left after you switch Developer mode on).
4. In the window that opens, choose the folder that has `manifest.json` in it, and press **Select Folder**.

**What you should see:** a card called **BlankStare: Dev English to English** appears in the list, with a version number, and a new tab opens by itself with the setup.

> **Why** "Developer mode" sounds scary but it only means "let me add things that did not come from the Web Store". It does not change anything else.

<details>
<summary>Chrome says BlankStare can "read and change all your data on all websites"</summary>

That is Chrome's standard warning for anything that puts a button on web pages. BlankStare's little ⚡ button has to be on every page so that it is ready when you select something. It only reads the words you select, or the page when you press **Full page**.

</details>

<details>
<summary>I see an error and no card appears</summary>

You probably picked the wrong folder. Go back to Step 3 and make sure the folder you choose has **manifest.json** directly inside it.

</details>

## Step 5: The setup

The new tab shows five short screens. Use **Next** to move on and **Back** to go back. You can press **Skip setup** and do it later.

1. **Which language?** Choose **English** (or Ελληνικά for Greek).
2. **How simple?** Choose how you want answers written. **Like I’m five** is the simplest. **New to this** is friendly and assumes nothing. If unsure, pick **New to this**.
3. **Pick your free AI.** Choose **Start now, no key**. It is the one that works right now.
4. Press **Try it now**.
5. The last screen says **You’re ready**. Press **Start using BlankStare**.

**What you should see:** on screen 4, a short message with green ticks saying OVHcloud answered. It can take a few seconds. Then the Settings page, with a little "All set" message.

![The setup's third screen: Start now with no key, or a free Google Gemini or Groq key](/BlankStare-Dev-English-to-English/screenshots/settings-setup.png)

<details>
<summary>The try-it says every model is busy</summary>

The no-key helper is sometimes crowded. Wait a minute and press **Try it now** again. If it keeps failing, use the Gemini or Groq key steps near the end of this page. They take about three minutes.

</details>

## Step 6: Pin the icon

Chrome hides new extensions in a puzzle-piece menu. Pinning puts BlankStare where you can always see it.

1. Click the **puzzle piece** icon at the top right of Chrome.
2. Find **BlankStare: Dev English to English** in the list.
3. Click the **pin** icon next to it.

**What you should see:** the BlankStare icon now sits in the toolbar, next to the address box.

## Step 7: Open the panel

1. Go to any ordinary website.
2. Click the BlankStare icon. (Shortcut: hold **Alt** and **Shift**, then press **B**. On a Mac: **Ctrl**, **Shift**, **B**.)

**What you should see:** a panel opens at the right with the title **Select any dev text** and three small hints: Select → Explain, Alt+Shift+E, and Paste a screenshot (Ctrl+V).

![The empty panel: Select any dev text](/BlankStare-Dev-English-to-English/screenshots/sidepanel-welcome.png)

> **Watch out** Each browser tab has its own panel. If you open a new tab, open the panel there again.

## Step 8: Explain something

Here is a real example of programmer words. Select this whole line with your mouse:

```
npm ERR! peer react@"^18.0.0" from react-beautiful-dnd@13.1.1
```

1. Drag across the whole line so it is coloured in.
2. Right-click on the coloured words.
3. Click **Explain with BlankStare**.

(You can also press the small **⚡ Explain** button that appears beside the selection. It only shows up while the panel is open.)

**What you should see:** the panel shows your words under **You selected:**, then the word "Translating…", then easy words writing themselves out. Under the answer, a faint line says which helper wrote it, for example "via" a model name and a company.

![An error message turned into plain English in the panel](/BlankStare-Dev-English-to-English/screenshots/sidepanel-result.png)

<details>
<summary>Nothing happens when I right-click</summary>

Make sure you coloured in some words first (right-click on the coloured part). If you added BlankStare while this page was already open, reload the page once, then try again.

</details>

<details>
<summary>The ⚡ button does not appear</summary>

It only appears while the side panel is open. Open the panel (Step 7), then select again. Right-click always works instead.

</details>

## Step 9: Make it simpler (or harder)

1. At the top of the panel there is a box that says **Standard**. Click it.
2. Pick **ELI5** for the simplest words, **Newbie** for friendly and gentle, **Standard** for an everyday smart reader, or **Vibecoder** for someone who builds things with AI tools.
3. The round arrow **↻** next to **+ Context** lights up. Press it.

**What you should see:** the same text again, written for the level you chose.

You can also press **+ Context** and type a line about yourself, such as "I run a small shop website and use Windows". The examples then fit you better.

## Step 10: Do it with me

When the words tell you to do things, BlankStare can turn them into a to-do list.

1. Select instructions, for example "Install Node.js 18 or newer. Run npm install."
2. Explain them as in Step 8.
3. Under the answer, press **✅ Do it with me**.

**What you should see:** a list with an empty square before each job. Tick each one as you finish it. Any command you must type sits in a dark box with a **Copy** button, so you can paste it exactly.

Also under the answer:

- **🧭 What do I need first?** lists what to have ready before you start.
- **↓ More detail** says more. **↺ Different wording** says it again another way.
- **📄 Full page** summarises the whole page you are on.

## Step 11: Ask your own question

1. Scroll down in the panel to **Ask a follow-up**.
2. Tap a ready-made question, like **Is this safe to do?**, or type your own and press **Enter**.

**What you should see:** a short answer appears under the box, about the text you selected.

## Step 12: Try Greek, history and sound

- **Greek:** press the **EN** button at the top. It becomes **EL**, and answers come in Greek. Press **↻** to redo the current one.
- **History:** press the **clock** icon. Your last 20 answers appear. Click one to read it again. They vanish when you close Chrome.
- **Sound:** press the **speaker** button under an answer to hear it read out.
- **Screenshots:** copy a picture of your screen, click inside the panel and press **Ctrl + V**. It explains the picture.

## Step 13 (optional): A free key for better answers

A key makes answers faster or better. It is free and needs no card.

1. For **Google Gemini**: go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in with Google and press **Create API key**. Copy the long code.
2. For **Groq**: go to [console.groq.com/keys](https://console.groq.com/keys), make a free account and press **Create API Key**. Copy the code (it starts with `gsk_`).
3. In the panel, press the **gear** icon at the top. Under **Your free AI**, paste the code into the box for that company and press **Test**.

**What you should see:** a green message saying the key works, and the card's tag changes to **Working**.

> **Watch out** A key is like a password for your account at that company. Do not share it or paste it into chats. For Gemini, make the key in a project that has **no billing** set up, or the free tier will not apply.

## Where your words go, plainly

- The words you select go to **one helper company** at a time, and to the next one if the first is busy. That could be OVHcloud, Google or Groq.
- Once a day BlankStare downloads a public list of which free helpers are working. Nothing about you goes with it.
- Your keys and settings stay in Chrome's own add-on storage. If Chrome sync is on, Chrome copies them to your other devices.
- Nothing is sent to the person who made BlankStare.
- The full [privacy page](/BlankStare-Dev-English-to-English/privacy/) says it all.

## If something goes wrong

<details>
<summary>Answers are very slow</summary>

The no-key helper is crowded. Wait a minute, or add a free Gemini or Groq key (Step 13).

</details>

<details>
<summary>It says it cannot read this page</summary>

That message appears when you press **Full page**. Reload the page once and try again. Special Chrome pages, the Web Store and PDFs cannot be read at all, so select the words instead.

</details>

<details>
<summary>The answer stops halfway</summary>

The internet dropped for a moment. What arrived stays on screen. Press **↻** to ask again.

</details>

<details>
<summary>It will not explain my Greek text</summary>

BlankStare is built to translate **English** programmer words. If your selection looks like Greek it stops, on purpose. Select the English text, and use the **EN / EL** button if you want the answer in Greek.

</details>

<details>
<summary>I want to remove it</summary>

Go to `chrome://extensions`, find BlankStare and press **Remove**. Your keys and settings go with it.

</details>

## A little dictionary

- **Browser:** the program you use to look at websites. Here, Google Chrome.
- **Extension:** a small add-on for your browser.
- **Panel:** a small window beside the page you are reading.
- **Select:** colour words in by dragging the mouse across them.
- **Error message:** a note a program shows when something went wrong.
- **Terminal:** a window where you type instructions to your computer instead of clicking.
- **README:** the "read me first" note that comes with a program.
- **AI model:** a program that has read a huge amount of text and writes answers.
- **Key:** a long secret code, like a library ticket, that lets a program use a company's service for you.
- **Free tier:** the free allowance a company gives.
- **ZIP:** a folded-up box of files that you open before using.
