import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import ts from "typescript";
import instructions from "../src/lib/games/spoken-instructions.json" with { type: "json" };

const source = ts.createSourceFile(
  "bingo.ts",
  await readFile("src/lib/games/bingo.ts", "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
let collections;
function findCollections(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(source) === "wordCollections"
  )
    collections = node.initializer;
  ts.forEachChild(node, findCollections);
}
findCollections(source);
if (!collections || !ts.isObjectLiteralExpression(collections))
  throw new Error("Could not find the Bingo word collections.");
const words = [
  ...new Set(
    collections.properties.flatMap((property) => {
      if (
        !ts.isPropertyAssignment(property) ||
        !ts.isArrayLiteralExpression(property.initializer)
      )
        throw new Error("Invalid Bingo word collection.");
      return property.initializer.elements.map((element) => {
        if (!ts.isStringLiteral(element) || !/^[a-z]+$/.test(element.text))
          throw new Error("Bingo words must use lowercase letters.");
        return element.text;
      });
    }),
  ),
];
const activitySource = ts.createSourceFile(
  "activity.ts",
  await readFile("src/lib/games/activity.ts", "utf8"),
  ts.ScriptTarget.Latest,
  true,
);
let puzzles;
function findPuzzles(node) {
  if (
    ts.isVariableDeclaration(node) &&
    node.name.getText(activitySource) === "wordPuzzles"
  )
    puzzles = node.initializer;
  ts.forEachChild(node, findPuzzles);
}
findPuzzles(activitySource);
if (!puzzles || !ts.isArrayLiteralExpression(puzzles))
  throw new Error("Could not find Word Builder puzzles.");
const builderEntries = puzzles.elements.flatMap((puzzle) => {
  if (!ts.isObjectLiteralExpression(puzzle))
    throw new Error("Invalid Word Builder puzzle.");
  const fields = Object.fromEntries(
    puzzle.properties
      .filter(ts.isPropertyAssignment)
      .map((property) => [
        property.name.getText(activitySource),
        ts.isStringLiteral(property.initializer)
          ? property.initializer.text
          : null,
      ]),
  );
  if (!fields.word || !/^[a-z]+$/.test(fields.word) || !fields.sentence)
    throw new Error("Invalid Word Builder text.");
  return [
    {
      text: fields.word,
      path: `public/assets/audio/builder/${fields.word}.mp3`,
    },
    {
      text: fields.sentence,
      path: `public/assets/audio/builder/${fields.word}-sentence.mp3`,
    },
  ];
});
const voiceId = "SAz9YHcvj6GT2YYXdXww";
const modelId = "eleven_flash_v2_5";
const manifestPath = "public/assets/audio/manifest.json";
const isDryRun = process.argv.includes("--dry-run");
let manifest = {};
try {
  manifest = JSON.parse(await readFile(manifestPath, "utf8"));
} catch {
  /* A first run has no manifest. */
}
const entries = [
  ...builderEntries,
  ...words.map((word) => ({
    text: word,
    path: `public/assets/audio/bingo/${word}.mp3`,
  })),
  ...Object.values(instructions).map(({ id, text }) => ({
    text,
    path: `public/assets/audio/instructions/${id}.mp3`,
  })),
  ...Array.from({ length: 101 }, (_, number) => ({
    text: String(number),
    path: `public/assets/audio/parts/number-${number}.mp3`,
  })),
  ...Object.entries({
    plus: "plus",
    minus: "minus",
    times: "times",
    divide: "divided by",
  }).map(([id, text]) => ({
    text,
    path: `public/assets/audio/parts/${id}.mp3`,
  })),
];
const client = isDryRun ? null : new ElevenLabsClient();
await mkdir("public/assets/audio/instructions", { recursive: true });
await mkdir("public/assets/audio/parts", { recursive: true });
await mkdir("public/assets/audio/builder", { recursive: true });
for (const { text, path } of entries) {
  const hash = createHash("sha256")
    .update(JSON.stringify({ text, voiceId, modelId }))
    .digest("hex");
  const hasFile = await stat(path)
    .then((file) => file.size > 0)
    .catch(() => false);
  if (hasFile && manifest[path] === hash) {
    continue;
  }
  process.stdout.write(
    `${isDryRun ? "Would generate" : "Generating"}: ${path}\n`,
  );
  if (isDryRun) continue;
  const audio = await client.textToSpeech.convert(voiceId, {
    text,
    modelId,
    outputFormat: "mp3_44100_64",
  });
  await writeFile(path, Buffer.from(await new Response(audio).arrayBuffer()));
  manifest[path] = hash;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
if (!isDryRun)
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
