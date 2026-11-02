# Learning Games

A playful learning hub for ages 4–6, with an explorer jellyfish and a complete first game: **Word Bingo**.

- [Play the production app](https://sp-learning-games.vercel.app)
- [GitHub](https://github.com/sprioleau/learning-games)
- [Architecture and extension points](docs/architecture.md)
- [Artwork prompts and exact export specs](docs/asset-brief.md)

## First game

Listen to a US-English word, tap it on a 5×5 board, and find five across, down, or diagonally. Each bingo earns one star and discovery points. Worlds unlock at 0, 5, 10, 15, and 20 stars. There are no time limits, point penalties, names, email addresses, or login screens.

Solo is playable. Multiplayer room and participant contracts are foundations for a later slice, not a shipped multiplayer mode. The leaderboard is personal, not public.

## Stack

Next.js App Router, React, TypeScript, Tailwind, shadcn/ui with Base UI accessibility primitives, Convex, Zod, Lucide, canvas-confetti, and self-hosted Baloo 2/Nunito Sans fonts. Vitest runs rules, backend, UI, and real-browser tests. Playwright drives browsers; axe checks accessibility.

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

Anonymous progress is linked to an HTTP-only browser cookie. It persists across reloads but does not transfer between devices. Clearing cookies starts a new adventure. Browser speech synthesis prefers available natural or enhanced US-English voices and uses slower delivery at full volume. Both listening buttons repeat the word twice with a short pause. If speaking fails, the written prompt becomes visible.

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

The real-browser suite verifies wrong-answer recovery, speech replay dispatch, saved boards, winning, retained rewards, fixed-aspect-ratio portrait/landscape scenes, modal containment, browser zoom across navigation, and WCAG A/AA scans. Browser speech is stubbed only to observe the spoken text; check audible quality on real target devices.

## Deploy

The project is `sprioleau-projects/learning-games`. Development and production have separate Convex deployments and server secrets.

1. Deploy backend changes with `npx convex deploy`.
2. Set `NEXT_PUBLIC_CONVEX_URL` and `GAME_SERVER_SECRET` in Vercel production. The latter must match `GAME_SERVER_SECRET` in the production Convex deployment. Use CLI stdin or the dashboard for secrets, never command-line literals or public variables.
3. Run `vercel deploy --prod --scope sprioleau-projects`.
4. Verify the deployed flow. Use `TEST_BASE_URL=https://sp-learning-games.vercel.app npm run test:browser` when deployment access allows browser tests.

Vercel Git builds deploy the frontend only. After changing Convex functions or schema, deploy Convex first; an automated combined backend/preview pipeline is a later addition.

## Visual direction

Reference boards are in `docs/design/references`. The selected character is the **explorer jellyfish**. The supplied artwork is organized in `public/assets/{branding,mascot,worlds,islands,rewards,icons}` and mapped in `src/lib/games/artwork.ts`. The reference collages stay separate from the accessible, live UI.

The hub, adventure map, star collection, and bingo screens share a centered **16:9 game scene**. The supplied world background stays uncropped; portrait windows show the same composition with background above and below instead of rearranging the controls. Normal window resizing fits the scene to the available space. Browser zoom deliberately enlarges the entire scene, including art, text, controls, and dialogs; scrolling allows access to the enlarged content. Zooming out keeps the smaller scene centered horizontally and vertically. A full-screen control is available in the scene header.

Jellyfish cutouts float gently within the illustrated world. Reduced-motion preferences disable the floating and celebration animations. Settings and confirmation dialogs retain Base UI focus handling and render inside the same game frame.

## Icons, manifest, and sharing

- `src/app/favicon.ico`: 16/32/48px favicon frames.
- `src/app/icon.png`: 512px app icon.
- `src/app/apple-icon.png`: opaque 180px Apple touch icon.
- `src/app/manifest.ts`: browser web-app manifest, with 192px and 512px icons. This does not add offline support.
- `src/app/opengraph-image.tsx` and `twitter-image.tsx`: matching 1200×630 cards composed from supplied artwork; Next.js generates their metadata tags.
- `docs/design/asset-inventory.json`: supplied artwork inventory and checksums, distinct from the web-app manifest.

Run `npm run assets:icons` after replacing `assets/branding/favicon-source.png`. Next.js handles icon and social image routes automatically. Update `metadataBase` in the root layout if the canonical domain changes.

## Demo and admin mode

Open `/admin` and enter `admin` to unlock every implemented world and both Word Bingo collections. The server issues an HTTP-only signed cookie valid for eight hours. The admin dashboard can launch any world directly; normal map navigation also unlocks while demo mode is active. Demo progress uses a separate profile and never changes the child's earned stars. Use **Exit demo mode** to restore ordinary locks. `ADMIN_MODE_PASSWORD` can override the default password; signing uses `ADMIN_SESSION_SECRET` or the existing `GAME_SERVER_SECRET`.

The browser tests log in and complete both word collections in all five worlds, then check logout restores the normal locked map.

## Low-latency play

Correct answers update the board and sound immediately. Saves are queued in the background and authoritative responses reconcile progress; rewards are confirmed only after saving. Failed writes restore confirmed progress. Sound buffers are built once and reused. Idle, low-priority artwork warming decodes mascot poses, islands, reward icons, and world backgrounds with two concurrent requests, respecting data-saver settings. Routes and speech voice lists are warmed in the background as well.
