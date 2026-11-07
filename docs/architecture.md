# Learning Games foundation

The hub contains several solo games sharing anonymous progress, rewards, and scene components. Multiplayer has typed room, participant, command, and revision contracts, but no live rooms or invitations yet.

## Boundaries

- `src/lib/games/bingo.ts`: pure, serializable bingo rules, shared by client fallback and authoritative Convex backend. Exactly 25 distinct words; no free square. Prompts are shuffled separately from the board. Five across, down, or either diagonal ends the game immediately.
- `src/lib/games/options.ts`: validated, versioned modifiers and metadata. Rule options (`wordSet`) are captured in sessions. Assistance (`hasWordHints`, `speechRate`) and presentation (`isSoundEnabled`, `isCelebrationEnabled`) are current player preferences. Rule changes apply to the next board. Assistance never reduces rewards.
- `src/lib/games/activity.ts`: shared, versioned activity sessions for Word Builder, Fraction Café, Number Trail, Math Drops, and Jungle Jigsaw. Each game keeps its own server-generated questions and revision, and the server validates answers and awards the completion reward once. The browser can restore an in-progress activity after reload, including the placed puzzle pieces. Math Drops movement and its timer are presentation state; an expired drop requests a different question without advancing the score.
- `src/lib/games/worlds.ts`: declarative theme metadata. Jungle starts open, followed by desert at 5 stars, arctic at 10, city at 15, and ocean at 20. Themes change scenery and colors, not learning difficulty.
- `src/lib/platform/progress.ts`: one star per completed session, ten points per correct word plus 50 for bingo. No penalties, daily streak pressure, or time limits. Completion IDs prevent duplicate rewards. The current session is the only playable session, so trimming score history to 100 cannot make an old session replayable.
- `src/lib/platform/contracts.ts`: game registry, room and membership contracts, monotonic revisions, generic command envelope, and leaderboard entries. Future multiplayer should add a Convex subscription transport, private invite rooms, membership checks, host lifecycle, reconnect handling, and authoritative moves. There is no public matchmaking or chat.
- `src/components/scene`: shared 16:9 scene frame, uncropped world backdrop, header controls, reward stars, and scene-local dialog portal context. The scene width store fits ordinary resize events but compensates for browser zoom relative to the initial device scale. Zoom persists across client navigation and permits scrolling rather than shrinking enlarged content back into the viewport.
- `src/components/games`: reusable platform provider, settings dialog, personal leaderboard, normalized pointer canvas, confetti, and bingo presentation. Bingo uses semantic buttons instead of a canvas so words remain accessible.
- `src/lib/platform/audio.ts`: browser speech synthesis and synthesized feedback cues. Available natural/enhanced US-English voices are preferred; delayed voice lists are handled before falling back. Replay speaks twice, separated by a 400ms pause after completion. New prompts and navigation cancel pending playback. Speech replay is separate from effect muting. A speech failure shows the written prompt, and a grown-up can read it aloud. Real device audio must still be listened to during playtesting.
- `src/lib/platform/use-game-timer.ts`: monotonic active-play time, pauses when inactive or hidden. Available for later games; bingo stays untimed.

## Anonymous identity and persistence

`GET /api/player` creates a random 256-bit HTTP-only, same-site cookie. Only its SHA-256 hash goes to Convex. Players never provide names, email addresses, or passwords. This is a browser-specific anonymous account, not cross-device identity. Clearing cookies loses access to that browser's prior progress.

The Next.js route is the trust boundary. It validates commands with Zod, rejects cross-origin writes, and calls Convex using a server-only secret. Public Convex entry points independently require that secret; knowing another player's hash does not grant direct database access. Production and development use different secrets and deployments. No secret is embedded in client code.

Convex applies moves transactionally, checking the active session ID and expected revision. Wrong moves leave the board unchanged. Stale or repeated correct moves return the authoritative state without awarding anything again. Reward totals are calculated on the backend, never accepted from the client.

If a response is lost after a committed move, reloading recovers the saved state; retrying a stale move synchronizes without another reward. Start commands do not have a separate deduplication key yet. Retrying a start whose response was lost can create a fresh board.

When no backend environment is configured, the same rules run with versioned device storage. This is an explicit development fallback, identified in the footer. A configured but unavailable cloud backend shows a retryable error; it never silently forks cloud progress into local storage.

## Visual assets

Reference boards live in `docs/design/references`. They are visual references, not flattened UI images. `Brand` provides horizontal, stacked, compact, and light variants. The supplied illustrations are organized by purpose under `public/assets` and wired through `artwork.ts`. App icons use Next.js metadata files in `src/app`; `manifest.ts` generates the web-app manifest. `opengraph-image.tsx` and `twitter-image.tsx` generate matching 1200×630 social cards. The original asset inventory and prompts are preserved under `docs/design`. See `asset-brief.md` for exact delivery specs. All controls, text, paths, locks, counters, and rewards stay in code.

Scenes use Baloo 2 headings and Nunito Sans body text. The reference-driven layout places the transparent jellyfish, game signs, island map, and parchment controls directly over the supplied background. Scene geometry remains 16:9 in portrait and landscape, with letterboxing around the centered frame. Floating mascots and celebration effects respect reduced motion. Base UI dialogs portal into the scene container, so their overlays, positions, and scaling follow the frame while keyboard focus and Escape dismissal remain accessible.

## Verification loop

1. `npm run check`: TypeScript, ESLint, pure rules, Convex in-memory integration tests, and accessible UI behavior with Vitest.
2. `npm run dev`: frontend against the development Convex deployment; `npm run dev:backend` while changing backend functions.
3. `npx playwright install chromium` once, then `npm run test:browser` with the frontend running. Vitest remains the test runner; Playwright drives real browsers and axe checks WCAG A/AA. The browser tests use real HTTP and Convex persistence, not mocked storage. They test speech dispatch with a browser API stub; they do not assess voice quality.
4. `npm run build`: production compilation and prerendering.
5. Deploy Convex first, then Vercel; verify the hosted game with the same browser suite by setting `TEST_BASE_URL` when deployment access permits.

Test accounts are anonymous browser contexts in the dev backend. The tests do not clear or modify existing players' records.

## Next useful slices

- Test the supplied artwork, speech, browser zoom, and touch on real iPad/Safari and Android hardware.
- Add curated, educator-reviewed word packs and recorded US-English prompts if consistent offline voices are needed. Browser speech currently varies by device and may use a platform voice service.
- Implement private multiplayer as a focused slice, using per-player authenticated subscriptions and room authorization rather than exposing the current server secret to clients.
