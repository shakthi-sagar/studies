# Shakthi's Archive Architecture

## Overview

Shakthi's Archive is a static React + TypeScript + Vite app for publishing nested Markdown essays.

- Essays live in `src/content/**/*.md`
- Folder nesting maps directly to sidebar navigation and essay routes
- App is deployed as static assets (GitHub Pages target)

## High-level flow

1. Build-time glob import loads markdown files from `src/content`
2. Markdown is parsed into `Essay` records (frontmatter + body + normalized route path)
3. Essays are indexed in:
   - a map for route lookup
   - a deterministic folder/file tree for UI navigation
4. Router renders:
   - home (`/`)
   - essay resolver page (`*`) that renders essay content or not-found

## Core modules

### Content model

`src/lib/content.ts`

Responsibilities:

- Discover markdown files with `import.meta.glob`
- Parse optional frontmatter keys:
  - `title`
  - `date`
  - `lastUpdated`
  - `summary`
  - `tags`
  - `draft`
- Apply fallbacks:
  - title: frontmatter -> first `# heading` -> filename
  - summary: frontmatter -> first non-heading paragraph snippet
- Compute progress metadata:
  - `wordCount`
  - `readingTimeMinutes`
  - `lastUpdated` (fallbacks to `date`)
- Normalize route segments to kebab-case
- Filter drafts in production (`draft: true` excluded unless `import.meta.env.DEV`)
- Export:
  - `essays`
  - `essayByRoutePath`
  - `rootTree`

### Navigation tree

`src/components/SidebarTree.tsx`

Responsibilities:

- Render folder/file hierarchy as collapsible tree
- Keep manual open/close state in `localStorage` (`archive.tree.v1`)
- Auto-expand active essay ancestor folders
- Navigate essays via `/<routePath>`

### Pages

`src/pages/HomePage.tsx`

- Intro and recent essays list
- Empty state when no essays exist

`src/pages/EssayPage.tsx`

- Resolve wildcard route to essay lookup
- Render metadata and markdown body
- Show essay-level not-found when path does not exist

### App shell and routing

`src/App.tsx`

- Top bar + desktop sidebar + mobile drawer behavior
- Route wiring for home and wildcard essay resolution

`src/main.tsx`

- `BrowserRouter` with `basename={import.meta.env.BASE_URL}`

## Route and path contract

Essay route format:

- `/<normalized-folder-and-file-path-without-extension>`

Example:

- `src/content/React/Hooks/useEffect.md` -> `/react/hooks/use-effect`

## UI behavior

- Desktop: persistent left sidebar tree + content pane
- Mobile: toggleable drawer for folder tree
- Active essay node is highlighted
- Essay metadata includes words, reading time, and last updated date
- Folder ordering is deterministic:
  - folders first
  - then files
  - alphabetical (case-insensitive)

## Styling system

`src/index.css`

- Single global stylesheet
- CSS variables for palette and layout tokens
- Editorial typography for reading-focused pages
- Responsive breakpoints for desktop/mobile navigation

## Deployment architecture

### Build

- `npm run build` runs:
  - `tsc -b`
  - `vite build`
  - `postbuild` script

### SPA fallback

`scripts/postbuild.mjs`

- Copies `dist/index.html` to `dist/404.html`
- Supports direct deep-link refresh on GitHub Pages

### Base path

`vite.config.ts`

- `base` derives from `VITE_BASE_PATH` (fallback `/`)

### CI/CD

`.github/workflows/deploy.yml`

- Installs dependencies
- Builds with `VITE_BASE_PATH=/<repo-name>/`
- Uploads `dist` artifact
- Deploys to GitHub Pages

## Authoring workflow

1. Add or edit markdown files in `src/content`
2. Keep folder structure aligned with topic hierarchy
3. Run `npm run dev` for preview
4. Run `npm run build` to validate production output
5. Push to `main` to deploy via GitHub Actions

## Out of scope (current version)

- In-browser editing with persistence
- Search index / full-text search UI
- RSS feed or sitemap generation
- Tag archive pages
- Auth/admin workflows
