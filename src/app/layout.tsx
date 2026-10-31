import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { GameProvider } from "@/components/games/game-provider";
import "./globals.css";
const nunito = localFont({
  src: "../../node_modules/@fontsource-variable/nunito-sans/files/nunito-sans-latin-wght-normal.woff2",
  variable: "--font-nunito",
  display: "swap",
});
const baloo = localFont({
  src: "../../node_modules/@fontsource-variable/baloo-2/files/baloo-2-latin-wght-normal.woff2",
  variable: "--font-baloo",
  display: "swap",
});
export const viewport: Viewport = { themeColor: "#fff9ed" };
export const metadata: Metadata = {
  metadataBase: new URL("https://learning-games-peach.vercel.app"),
  applicationName: "Learning Games",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Learning Games",
    title: "Learning Games — Little games. Big discoveries.",
    description:
      "Play Word Bingo, collect stars, and explore a world of learning. Ages 4–6. No login needed.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Learning Games — Little games. Big discoveries.",
    description:
      "Play Word Bingo, collect stars, and explore a world of learning. Ages 4–6.",
  },
  title: "Learning Games — Little games. Big discoveries.",
  description:
    "A playful learning adventure for curious kids ages 4–6. Listen, learn, and collect stars with Word Bingo. No login needed.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${nunito.variable} ${baloo.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
