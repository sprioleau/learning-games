import { mkdir, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

/* Derive conventional app icons without changing the supplied source artwork. */
const source = await readFile("assets/branding/favicon-source.png");
await mkdir("public/assets/icons", { recursive: true });
await writeFile("src/app/icon.png", source);
await sharp(source)
  .resize(180, 180)
  .flatten({ background: "#fff9ed" })
  .png()
  .toFile("src/app/apple-icon.png");
for (const size of [192, 512]) {
  await sharp(source)
    .resize(size, size)
    .png()
    .toFile(`public/assets/icons/icon-${size}.png`);
}

/* ICO directory entries point to PNG frames, preserving alpha at each size. */
const sizes = [16, 32, 48];
const frames = await Promise.all(
  sizes.map((size) => sharp(source).resize(size, size).png().toBuffer()),
);
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  directory.writeUInt8(sizes[index], entry);
  directory.writeUInt8(sizes[index], entry + 1);
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile("src/app/favicon.ico", Buffer.concat([directory, ...frames]));
