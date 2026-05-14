# 🧭 Mattermost RTL Persian

Mattermost RTL Persian is a lightweight Mattermost webapp plugin that improves the experience of Persian and RTL users.

It adds per-user RTL support, Persian-friendly typography, Persian calendar timestamps, and relative time labels for Mattermost messages.

---

## ✨ Features

- 🇮🇷 **Persian / Farsi RTL support**
- ↔️ Automatically detects RTL messages
- 🧾 Keeps code blocks, links, mentions, reactions, and attachments readable
- 🕰️ Converts message timestamps to the **Persian calendar**
- ⏳ Adds **relative time** such as `۵ دقیقه پیش`
- 🔤 Applies a Persian-friendly font
- 🧑‍💻 Per-user toggle from the Mattermost main menu
- 🧱 Supports Mattermost messages and common editor areas
- 📋 Includes basic RTL improvements for Boards / Focalboard views

---

## 📸 Example

Instead of the default timestamp display, RTL messages can show:

```text
۵ دقیقه پیش - ۱۳:۴۵ - پنجشنبه ۲۵ اردیبهشت ۱۴۰۵
```

Persian messages are aligned right, while technical content such as code blocks stays left-to-right.

---

## 📦 Plugin Info

| Field | Value |
|---|---|
| Plugin name | Mattermost RTL Persian |
| Package name | `mattermost-rtl-persian` |
| License | MIT |
| Minimum Mattermost version | 11.0.0 |

---

## 🚀 Installation

### 1. Build the plugin

Clone the repository:

```bash
git clone https://github.com/amir-zouerami/mattermost-rtl-persian.git
cd mattermost-rtl-persian
```

Install dependencies:

```bash
npm install
```

Build and package the plugin:

```bash
npm run pack
```

This creates:

```text
dist/landin-rtl.tar.gz
```

---

### 2. Upload to Mattermost

1. Go to **System Console**
2. Open **Plugin Management**
3. Upload `dist/landin-rtl.tar.gz`
4. Enable the plugin

---

## 🧑‍🔧 Usage

After installing and enabling the plugin:

1. Open Mattermost
2. Open the main menu
3. Click **Toggle Landin RTL**
4. RTL support will be enabled or disabled for your user account

The setting is saved per user in browser local storage.

---

## 🛠️ Development

### Build

```bash
npm run build
```

### Watch mode

```bash
npm run dev
```

### Package for Mattermost

```bash
npm run pack
```

---

## 📁 Project Structure

```text
.
├── plugin.json
├── package.json
├── tsconfig.json
├── vite.config.ts
└── webapp
    └── src
        ├── index.ts
        ├── styles.css
        └── fonts
            └── IRANSansWeb.ttf
```

---

## 🧩 How It Works

The plugin runs in the Mattermost webapp and performs several UI enhancements:

### 🔍 RTL detection

Messages are scanned for RTL characters. If a message contains Persian, Arabic, Hebrew, or related RTL Unicode ranges, the plugin marks the post as RTL.

### 🧭 Direction handling

RTL messages are displayed with:

```css
direction: rtl;
text-align: right;
```

Neutral messages, such as emoji-only messages, are also handled carefully.

### 🧑‍💻 Code-safe formatting

The plugin avoids breaking technical content. Code blocks, inline code, attachments, images, call threads, and reactions remain left-to-right where needed.

### 🗓️ Persian calendar timestamps

Message timestamps are converted using the Persian calendar via the browser `Intl` API.

### ⏳ Relative time

Timestamps also include relative time using `Intl.RelativeTimeFormat`, for example:

```text
اکنون
۲ دقیقه پیش
دیروز
۳ هفته پیش
```

Relative time is refreshed automatically while the plugin is enabled.

---

## ⚙️ Configuration

No server-side configuration is required.

The plugin currently stores the enabled/disabled state in browser local storage using a per-user key.

---

## 🧪 Browser Support

This plugin relies on modern browser APIs:

- `Intl.DateTimeFormat`
- `Intl.RelativeTimeFormat`
- `MutationObserver`
- Unicode property escapes in regular expressions

Use a modern browser for the best experience.

---

## 🧹 Uninstalling

To remove the plugin:

1. Disable it from **System Console → Plugin Management**
2. Remove the plugin from Mattermost
3. Optionally clear browser local storage if you want to remove saved user preferences

---

## 🤝 Contributing

Contributions are welcome.

You can help by:

- 🐛 Reporting bugs
- 💡 Suggesting improvements
- 🌍 Improving Persian / RTL behavior
- 🧪 Testing with different Mattermost versions
- 📖 Improving documentation

---

## 📄 License

This project is licensed under the MIT License.
