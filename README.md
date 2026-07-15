# EmbedFix

[English](#features) · [Chính sách quyền riêng tư](privacy.html)

EmbedFix is a polished, client-side utility that converts social media URLs into embed-friendly alternatives. It uses no backend, sends no URLs to a server, and works by opening `index.html` in a modern browser.

The project also includes a Manifest V3 extension for Google Chrome and Microsoft Edge in the [`extension`](extension/) directory.

## Features

- Converts links automatically while you type, paste, or drop them
- Preserves the original URL path, query parameters, and fragment
- Distinguishes invalid URLs from unsupported platforms
- Copies, opens, shares, and generates a QR code for converted URLs
- Stores the latest 20 unique conversions in `localStorage`
- Imports and exports history as JSON
- Supports `?url=` for prefilled conversions
- Includes light, dark, and system themes
- Provides keyboard navigation, visible focus, ARIA labels, and reduced-motion support
- Runs entirely in the browser with no build tools or backend

## Supported platforms

| Platform | Accepted hostnames | Converted hostname |
| --- | --- | --- |
| Facebook | `facebook.com`, `www.facebook.com`, `m.facebook.com`, `fb.watch` | `facebed.com` |
| TikTok | `tiktok.com`, `www.tiktok.com`, `vm.tiktok.com`, `vt.tiktok.com` | `tnktok.com` |
| Reddit | `reddit.com`, `www.reddit.com`, `old.reddit.com` | `vxreddit.com` |
| X / Twitter | `twitter.com`, `www.twitter.com`, `x.com`, `www.x.com` | `fixupx.com` |
| Pixiv | `pixiv.net`, `www.pixiv.net` | `phixiv.net` |

## How conversion works

EmbedFix parses the input with the browser's native `URL` API, finds an exact hostname match in `PLATFORM_MAP`, and replaces only `URL.hostname`.

For example:

```text
https://x.com/OpenAI/status/123456?lang=en#replies
                         ↓
https://fixupx.com/OpenAI/status/123456?lang=en#replies
```

The protocol, port, path, query parameters, and fragment remain intact. Inputs without a protocol are treated as HTTPS links.

## How to use

1. Open `index.html` in Chrome, Edge, Firefox, or Safari.
2. Paste or drop a supported social media URL into the input.
3. Copy, open, share, or display the QR code for the converted link.

You can also prefill the app from another page:

```text
index.html?url=https%3A%2F%2Fx.com%2FOpenAI%2Fstatus%2F123456
```

Keyboard shortcuts:

- `Ctrl + L` (or `Cmd + L`): focus and select the URL input
- `Ctrl + Shift + C` (or `Cmd + Shift + C`): copy the current converted URL

## Adding a platform

Add one entry to `PLATFORM_MAP` near the top of `script.js`:

```js
example: {
  name: "Example",
  icon: "E",
  hosts: ["example.com", "www.example.com"],
  targetHost: "fixexample.com",
},
```

The converter and supported-platform cards both read from this object, so no duplicated conversion logic is required.

## Folder structure

```text
EmbedFix/
├── index.html    # Semantic page structure and metadata
├── style.css     # Responsive design, themes, and animations
├── script.js     # Conversion, history, QR, sharing, and theme logic
├── privacy.html  # Public privacy policy for the browser extension
├── extension/    # Chrome and Edge Manifest V3 extension
└── README.md     # Project documentation
```

## Chrome and Edge extension

The extension automatically converts the active tab, provides toolbar and context-menu actions, supports a global copy shortcut, and stores history with `chrome.storage.local`. See [`extension/README.md`](extension/README.md) for sideloading and packaging instructions.

## QR code dependency

QR generation uses [QRCode.js](https://github.com/davidshimjs/qrcodejs) from the cdnjs CDN. The rest of the app works without a network connection; QR generation requires the CDN script to be available.

## Privacy

Conversions happen locally. EmbedFix has no analytics, account system, tracking scripts, or backend API. Only theme choice and conversion history are stored, using the browser's `localStorage`.

The public privacy policy for the Chrome Web Store and Microsoft Edge Add-ons is available at [`privacy.html`](privacy.html).

### Publish the privacy policy with GitHub Pages

1. Open the repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and the `/ (root)` folder, then save.
4. After deployment finishes, use this URL in the extension store listing:

```text
https://anhtruc1803.github.io/embedfix/privacy.html
```

The policy page is a standalone HTML file and does not use analytics, cookies, external fonts, scripts, or third-party assets.

## License

MIT License. You may use, modify, and distribute this project with attribution.
