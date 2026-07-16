# Rapid Reader Library

A complete RSVP (Rapid Serial Visual Presentation) reading web app.  
Built with React 18, TypeScript, Tailwind CSS v4, and Vite.

## Live Demo Setup (GitHub Pages)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **gh-pages** / folder: **/ (root)**
4. Click **Save**

GitHub Actions will automatically build and deploy on every push to `main`.  
Your site will be live at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

> The base path is set automatically from your repo name via the workflow — no manual config needed.

---

## Local Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
```

## Features

- **Library** — card grid, search, sort, progress tracking
- **Import** — paste or upload .txt, auto-detects chapters
- **Book Details** — chapter list, jump to any chapter
- **RSVP Reader** — 100–1000 WPM, Focus Letter (ORP), phrase mode, dark mode, keyboard shortcuts, auto-saves progress

## Keyboard Shortcuts (Reader)

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| ← / → | Prev / Next word |
| Shift + ← / → | Skip ±10 words |
| ↑ / ↓ | Speed up / down |
| Esc | Exit fullscreen |

## Storage

All data lives in `localStorage` — no backend needed.

## Copyright

Only import books that are in the public domain, written by you, or licensed for your use.
