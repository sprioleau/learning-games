# Speech recordings

Word Bingo uses prerecorded ElevenLabs clips for the words in `wordCollections` in `src/lib/games/bingo.ts`. Game-level instructions come from `src/lib/games/spoken-instructions.json`. Recordings are served as static files, so gameplay does not call ElevenLabs or expose an API key.

After adding words or changing instruction text, run:

```sh
node --env-file=.env.local scripts/generate-bingo-voice.mjs --dry-run
node --env-file=.env.local scripts/generate-bingo-voice.mjs
```

The first command lists only missing or changed clips and uses no ElevenLabs credits. The second generates those clips and records their text, voice and model fingerprints in `public/assets/audio/manifest.json`. Commit the manifest and audio files together. Existing recordings are reused; a changed text, voice, or model regenerates the affected recording. The local API key must stay in `.env.local` and must never be committed.

The shared instruction button currently reads a general instruction for each game. Individual menu labels, feedback, and dynamically generated questions are not yet covered by prerecorded narration.
