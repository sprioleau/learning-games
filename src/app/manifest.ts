import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Learning Games",
    short_name: "Learning Games",
    description:
      "Little games. Big discoveries. Learning adventures for ages 4–6.",
    lang: "en-US",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff9ed",
    theme_color: "#fff9ed",
    icons: [192, 512].map((size) => ({
      src: `/assets/icons/icon-${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any",
    })),
  };
}
