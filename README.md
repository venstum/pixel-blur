# pixel-blur

Interactive image workspace built with Next.js, TypeScript, and Bun. Blur regions, magnify areas, or drop stickers on top of your images.

| Magnify | Blur |
| --- | --- |
| ![Magnify](assets/magnify.png) | ![Blur](assets/blur.png) |

## Prerequisites

- [Bun](https://bun.sh/) installed

## Scripts

- `bun run dev` – start the dev server at [http://localhost:3000](http://localhost:3000)
- `bun run dev:electron` – run Next.js dev server and Electron shell together
- `bun run build` – create an optimized production build
- `bun run start` – run the production server
- `bun run build:desktop` – build the Linux AppImage desktop bundle with electron-builder
- `bun run lint` – lint the codebase

## Getting Started

```bash
bun install
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## Desktop (Electron)

- Dev: `bun run dev:electron`
- Build: `bun run build:desktop`

## Project Notes

- Assets live in `assets/` and `public/`. The favicon is `public/icon.svg`.
- UI font is loaded locally from Terminus (`src/app/fonts.ts`).
- Undo is supported (Ctrl/Cmd+Z) for lens/sticker actions.
