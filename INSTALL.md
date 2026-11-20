# Install: BlankStare

Works in Google Chrome and browsers built on it (Edge, Brave, Opera, Vivaldi)
that support side panels (Chrome 116 or later).

## Load it into Chrome

1. Download the code: the green **Code → Download ZIP** button on GitHub, then
   unzip it. Or, with git:
   ```bash
   git clone https://github.com/Stravelakis/BlankStare-Dev-English-to-English.git
   ```
2. Open `chrome://extensions` in the address bar.
3. Switch on **Developer mode** (top right).
4. Press **Load unpacked** and choose the folder you downloaded (the one with
   `manifest.json` in it).
5. Settings opens by itself with a short 5-step setup.

Chrome will say BlankStare can "read and change all your data on all
websites". That is because the small button that appears next to selected
text has to be present on every page. BlankStare only reads what you select.

## Pick your AI (a key is optional)

BlankStare works with no key at all. In the setup, choose **Try it now** and
it uses OVHcloud's anonymous AI (Europe, free, slower when busy).

For better or faster answers, add a free key. No card or billing needed:

- **Google Gemini** (best quality): get a key at
  [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
- **Groq** (fastest): get a key at
  [console.groq.com/keys](https://console.groq.com/keys).

Paste it in the setup, or later in Settings. Settings save by themselves.
To go through the setup again, press **Run the setup again**.

Optional: a YouTube Data API key, for videos.

## Check it works

1. Press **Alt + Shift + B**. The panel opens.
2. Select any sentence on any page and press the ⚡ button beside it (it only appears while the panel is open), or right-click → **Explain with BlankStare**.
3. A plain-English version appears in the panel.

## For developers

```bash
git config core.hooksPath githooks   # secret scan on every commit
npm test                             # no install needed
```

## Update

Download the new version over the old folder, then press the reload arrow on
BlankStare's card in `chrome://extensions`. Your settings are kept.

## Uninstall

`chrome://extensions` → BlankStare → **Remove**. Your keys go with it.
