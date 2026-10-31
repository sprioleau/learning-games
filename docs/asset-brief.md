# Production artwork brief

Primary reference: `docs/design/references/Explorer Jellyfish Learning Games Board.png`.

The mascot is a peach-and-pink explorer jellyfish with a translucent bell, large eyes, rosy cheeks, softly curling tentacles, tan safari hat, blue-lensed goggles, turquoise satchel, and gold compass. Never use the fox. Preserve proportions and accessories across poses.

Match the cheerful storybook reference: subtle paper texture, rounded forms, warm cream, gold, coral, leafy green, sky blue, purple. Deliver individual files, no mockups, collages, watermarks, labels, or baked-in UI. Transparent means actual alpha, not a checkerboard. Keep tentacles completely inside the canvas.

| File                                           | Dimensions     | Format / transparency                   | Treatment                                                                                                                |
| ---------------------------------------------- | -------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `logo-mark.png`                                | 1024×1024      | PNG, transparent                        | Full-color friendly golden discovery star; recognizable at 24px; 10% padding                                             |
| `logo-mark-dark.png`                           | 1024×1024      | PNG, transparent                        | Same silhouette, solid #352820                                                                                           |
| `logo-mark-white.png`                          | 1024×1024      | PNG, transparent                        | Same silhouette, solid white                                                                                             |
| `favicon-source.png`                           | 512×512        | PNG, transparent                        | Simplified full-color logo star; recognizable at 16–32px; no lettering                                                   |
| `mascot-wave.png`                              | 1024×1024      | PNG, transparent                        | Full-color complete character, welcoming tentacle wave                                                                   |
| `mascot-cheer.png`                             | 1024×1024      | PNG, transparent                        | Same character, delighted expression, raised tentacles                                                                   |
| `mascot-think.png`                             | 1024×1024      | PNG, transparent                        | Same character, curious and encouraging, tentacle at cheek                                                               |
| `reward-star.png`                              | 512×512        | PNG, transparent                        | Full-color dimensional golden star, restrained highlights; no external sparkles                                          |
| `world-{jungle,desert,arctic,city,ocean}.webp` | 2560×1440 each | High-quality WebP, opaque; PNG accepted | Full-color world scenery; central 60% calm; no characters, text, UI, or stars; allow mobile cropping                     |
| `island-{jungle,desert,arctic,city,ocean}.png` | 768×768 each   | PNG, transparent                        | Full-color world-map vignettes; consistent viewpoint, scale, and lighting; no paths, labels, locks, characters, or stars |

Genuine SVG vector logo exports are preferred when the design tool supports them. Keep the wordmark as live code text for responsive composition and accessibility. Mascots need 10% clear padding and no background, ground plane, or detached shadow; retain internal translucency.

All 18 supplied assets are now organized and integrated through `src/lib/games/artwork.ts`. The supplied inventory is retained at `docs/design/asset-inventory.json`. Concept reference boards are intentionally not cut up into production sprites.
