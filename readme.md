# ZY New Tab

A customizable Chrome new tab extension that lets you organize and quickly access your favorite websites with icons.

## Features

- **Bookmark Grid** — Display your favorite sites as icon cards on every new tab
- **Drag & Drop Reordering** — Rearrange icons in edit mode with simple drag and drop
- **Custom Icons** — Set icons via [Simple Icons](https://simpleicons.org/), image file upload, or image URL
- **Auto Favicon Fallback** — Automatically fetches favicons from Google if no custom icon is set
- **Search** — Filter your saved sites instantly by name or URL
- **Backup & Restore** — Export your bookmarks as JSON and import them back anytime
- **Inline Editing** — Rename or change the URL of any bookmark without leaving the page

## Installation

### From Release (Recommended)

1. Download the latest `kanon.crx` from the [Releases](../../releases) page
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right toggle)
4. Drag and drop `kanon.crx` onto the extensions page

### From Source

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>

# Install Tailwind CSS and build styles
npm install
npx tailwindcss -i ./input.css -o ./output.css
```

Then load the extension:

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the project folder

## Usage

| Action | How |
|--------|-----|
| Open a site | Click any icon card |
| Add a site | Click **Settings** (top right) → fill in name & URL → click **Add** |
| Edit / Delete | Click **Edit Mode** (top left) → use ✎ / ✕ buttons on each card |
| Reorder | Drag and drop cards in Edit Mode |
| Search | Type in the search box inside Settings |
| Backup | Settings → **Backup** button |
| Restore | Settings → **Restore** button → select your `.json` backup file |

## Icon Options

When adding a site, you can set a custom icon in three ways (pick one):

1. **Simple Icons search** *(recommended)* — Search by brand name (e.g. `github`, `youtube`) and select from the list
2. **Image file** — Upload any image from your device (auto-resized to 128×128)
3. **Image URL** — Paste a direct link to an image

If no icon is set, the extension fetches the site's favicon automatically.

## Development

The UI is built with [Tailwind CSS v4](https://tailwindcss.com/). After editing `input.css` or any HTML/JS files, rebuild styles:

```bash
# One-time build
npx tailwindcss -i ./input.css -o ./output.css

# Or use the included batch script (Windows)
tailwind-build.bat
```

Releases are automated via GitHub Actions — every push to `main` packages the extension as a `.crx` file and creates a pre-release.

