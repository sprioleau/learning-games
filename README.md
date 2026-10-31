# Learning Games

A playful learning hub for ages 4–6, with an explorer jellyfish and a complete first game: **Word Bingo**.

- [Play the production app](https://learning-games-peach.vercel.app)
- [GitHub](https://github.com/sprioleau/learning-games)
- [Architecture and extension points](docs/architecture.md)
- [Artwork prompts and exact export specs](docs/asset-brief.md)

## First game

Listen to a US-English word, tap it on a 5×5 board, and find five across, down, or diagonally. Each bingo earns one star and discovery points. Worlds unlock at 0, 5, 10, 15, and 20 stars. There are no time limits, point penalties, names, email addresses, or login screens.

Solo is playable. Multiplayer room and participant contracts are foundations for a later slice, not a shipped multiplayer mode. The leaderboard is personal, not public.

## Stack

Next.js App Router, React, TypeScript, Tailwind, shadcn/ui with Base UI accessibility primitives, Convex, Zod, Lucide, canvas-confetti, and self-hosted Fredoka/Nunito Sans fonts. Vitest runs rules, backend, UI, and real-browser tests. Playwright drives browsers; axe checks accessibility.

## Develop

Use Node 24 and npm.

```sh
npm ci
npm run dev
```

This checkout is already linked to its Vercel project and development Convex deployment. Its ignored `.env.local` contains local connection settings. Never commit environment values.

For a new checkout:

```sh
cp .env.example .env.local
npx convex dev
node scripts/configure-backend.mjs
npm run dev
```

`convex dev` configures your deployment and generates bindings. Keep it running while changing backend functions (`npm run dev:backend`). The helper generates a server-only secret and installs it in the selected development deployment. A project with no backend values runs with explicitly labeled device storage. A configured but unreachable backend produces a retryable error instead of switching storage silently.

Anonymous progress is linked to an HTTP-only browser cookie. It persists across reloads but does not transfer between devices. Clearing cookies starts a new adventure. Browser speech synthesis requires an installed compatible voice; if speaking fails, the written prompt becomes visible.

## Verify

```sh
npm run check
npm run build
```

With the development server running:

```sh
npx playwright install chromium
npm run test:browser
```

The real-browser suite verifies wrong-answer recovery, speech replay dispatch, saved boards, winning, retained rewards, mobile touch targets, and WCAG A/AA scans. Browser speech is stubbed only to observe the spoken text; check audible quality on real target devices.

## Deploy

The project is `sprioleau-projects/learning-games`. Development and production have separate Convex deployments and server secrets.

1. Deploy backend changes with `npx convex deploy`.
2. Set `NEXT_PUBLIC_CONVEX_URL` and `GAME_SERVER_SECRET` in Vercel production. The latter must match `GAME_SERVER_SECRET` in the production Convex deployment. Use CLI stdin or the dashboard for secrets, never command-line literals or public variables.
3. Run `vercel deploy --prod --scope sprioleau-projects`.
4. Verify the deployed flow. Use `TEST_BASE_URL=https://learning-games-peach.vercel.app npm run test:browser` when deployment access allows browser tests.

Vercel Git builds deploy the frontend only. After changing Convex functions or schema, deploy Convex first; an automated combined backend/preview pipeline is a later addition.

## Visual direction

Reference boards are in `public/assets`. The selected character is the **explorer jellyfish**. The current vector mascot and logo are temporary; standalone artwork plugs into `src/lib/games/artwork.ts`. The reference collages stay separate from the accessible, live UI.
