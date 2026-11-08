<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project conventions

- Boolean variables, properties, and parameters use a verb prefix: `is`, `has`, `should`, or `will`.
- Named functions use the `function` keyword. Inline anonymous arrow callbacks are fine.
- Regular comments use multiline block syntax. Reserve JSDoc for actual tooling.
- Vitest is the test runner. Test meaningful behavior, with accessible labels for interactive queries. Use test IDs only when no accessible query is possible.
- Run `npm run check` and the relevant browser flow for game changes. See `docs/architecture.md`.

## In-game speech

- Every new or changed child-facing game instruction, menu label, feedback message, or prompt must have a corresponding prerecorded narration path using the selected ElevenLabs voice. Cover dynamic text with reusable prerecorded components where practical.
- Use `scripts/generate-bingo-voice.mjs` and the audio catalog workflow in `docs/speech.md`. Run the script with `--dry-run` first, inspect the planned work, then generate only missing or changed clips. Commit the audio files and `public/assets/audio/manifest.json` together.
- Never commit or print the ElevenLabs API key. Use the local ignored `.env.local` and never call ElevenLabs from a child's gameplay session.
