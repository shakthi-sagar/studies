# Shakthi's Studies

Static React + Vite site for publishing nested Markdown essays.

## Authoring model

- Create essays only under `src/content/**/*.md`.
- Folder hierarchy is reflected directly in the UI sidebar tree.
- Example files:
  - `src/content/Rust/Generics.md`
  - `src/content/React/Hooks/useEffect.md`
- URL format:
  - `src/content/React/Hooks/useEffect.md` -> `/react/hooks/use-effect`

## Frontmatter (optional)

Use YAML frontmatter at the top of a markdown file:

```md
---
title: "My Essay Title"
date: "2026-03-02"
lastUpdated: "2026-03-06"
summary: "One line summary used in cards."
tags: [react, hooks]
draft: false
---
```

Supported keys:

- `title` (string)
- `date` (string or YAML date)
- `lastUpdated` (string or YAML date; fallback to `date`)
- `summary` (string)
- `tags` (array or comma-separated string)
- `draft` (boolean)

Fallback behavior:

- `title`: frontmatter `title` -> first `#` heading -> filename
- `summary`: frontmatter `summary` -> first non-heading paragraph
- `draft: true`: shown in dev, hidden in production build

Built-in accountability cues in UI:

- word count
- estimated reading time
- last updated date

## Local commands

- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run preview`

## Static hosting notes (GitHub Pages)

- Vite base path is configurable via `VITE_BASE_PATH`.
- GitHub Actions workflow is in `.github/workflows/deploy.yml`.
- The build generates `dist/404.html` as an SPA fallback copy of `index.html`.
- Workflow sets:
  - `VITE_BASE_PATH=/${{ github.event.repository.name }}/`

## Structure overview

- Content indexing and tree model: `src/lib/content.ts`
- Sidebar folder dropdown tree: `src/components/SidebarTree.tsx`
- Home page: `src/pages/HomePage.tsx`
- Essay route page: `src/pages/EssayPage.tsx`
