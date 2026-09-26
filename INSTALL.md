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
5. Settings opens by itself.

Chrome will say BlankStare can "read and change all your data on all
websites". That is because the small button that appears next to selected
text has to be present on every page. BlankStare only reads what you select.

## Get your free key (about 3 minutes)

1. Go to [console.groq.com](https://console.groq.com) and sign in.
2. **API Keys → Create API Key**. Copy it.
3. In BlankStare Settings → **AI Engine**, paste it, press **Test**, then
   **Save Settings**.

Optional: a YouTube Data API key (for videos), and your own SearXNG search
server. Both are explained on the Settings page.

## Check it works

1. Press **Alt + Shift + B**. The panel opens.
2. Select any sentence on any page and press the brass button beside it.
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
