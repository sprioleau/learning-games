"use client";
import { getImageProps } from "next/image";
import { artwork } from "@/lib/games/artwork";
import type { WorldId } from "@/lib/games/worlds";

type ArtworkTask = {
  key: string;
  src: string;
  srcSet?: string;
  sizes?: string;
};
const queuedKeys = new Set<string>();
const queue: ArtworkTask[] = [];
const decodedImages = new Map<string, HTMLImageElement>();
let workerCount = 0;
function makeTask(
  src: string,
  width: number,
  height: number,
  sizes?: string,
): ArtworkTask {
  const { props } = getImageProps({ src, alt: "", width, height, sizes });
  return {
    key: `${src}:${width}:${sizes ?? ""}`,
    src: props.src,
    srcSet: props.srcSet,
    sizes: props.sizes,
  };
}
async function decodeArtwork(task: ArtworkTask) {
  const image = new window.Image();
  image.decoding = "async";
  image.fetchPriority = "low";
  if (task.sizes) image.sizes = task.sizes;
  if (task.srcSet) image.srcset = task.srcSet;
  image.src = task.src;
  try {
    await image.decode();
    decodedImages.set(task.key, image);
  } catch {
    /* A failed warmup can retry later; it never blocks the visible game. */
    queuedKeys.delete(task.key);
  }
}
async function drainArtworkQueue() {
  if (workerCount >= 2) return;
  workerCount += 1;
  try {
    while (queue.length) await decodeArtwork(queue.shift()!);
  } finally {
    workerCount -= 1;
  }
}
export function warmGameArtwork(world: WorldId) {
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  const shouldLimitTransfers =
    connection?.saveData ||
    connection?.effectiveType === "slow-2g" ||
    connection?.effectiveType === "2g";
  const tasks = [
    ...Object.values(artwork.mascot).map((src) =>
      makeTask(src, 1024, 1024, "(max-width: 720px) 240px, 360px"),
    ),
    ...[64, 80, 100].map((size) => makeTask(artwork.rewardStar, size, size)),
    ...Object.values(artwork.logo).map((src) => makeTask(src, 64, 64)),
    ...Object.values(artwork.islands).map((src) =>
      makeTask(src, 768, 768, "(max-width: 720px) 20vw, 280px"),
    ),
    ...Object.entries(artwork.backgrounds)
      .filter(([id]) => !shouldLimitTransfers || id === world)
      .map(([, src]) => {
        const { props } = getImageProps({
          src,
          alt: "",
          fill: true,
          sizes: "100vw",
        });
        return {
          key: src,
          src: props.src,
          srcSet: props.srcSet,
          sizes: props.sizes,
        };
      }),
  ];
  tasks.forEach((task) => {
    if (queuedKeys.has(task.key)) return;
    queuedKeys.add(task.key);
    queue.push(task);
  });
  void drainArtworkQueue();
  void drainArtworkQueue();
}
