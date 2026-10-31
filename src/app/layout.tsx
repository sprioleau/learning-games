import type { Metadata } from "next";
import localFont from "next/font/local";
import { GameProvider } from "@/components/games/game-provider";
import "./globals.css";
const nunito = localFont({
  src: "../../node_modules/@fontsource-variable/nunito-sans/files/nunito-sans-latin-wght-normal.woff2",
  variable: "--font-nunito",
  display: "swap",
});
const fredoka = localFont({
  src: "../../node_modules/@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2",
  variable: "--font-fredoka",
  display: "swap",
});
export const metadata: Metadata = {
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
    <html lang="en" className={`${nunito.variable} ${fredoka.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
