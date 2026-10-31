import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const socialImageAlt =
  "Learning Games — little games, big discoveries, with our explorer jellyfish. Word Bingo for ages 4–6.";
export const socialImageSize = { width: 1200, height: 630 };
const mascot = `data:image/png;base64,${await readFile(join(process.cwd(), "public/assets/mascot/mascot-wave.png"), "base64")}`;
const logo = `data:image/png;base64,${await readFile(join(process.cwd(), "public/assets/branding/logo-mark.png"), "base64")}`;

/* ImageResponse uses its own image renderer rather than the browser's Next Image. */
export function createSocialImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#fff9ed",
        color: "#352b2a",
        padding: "55px 65px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          width: 610,
          height: 610,
          right: -65,
          top: 35,
          borderRadius: "50%",
          background: "#e3edcb",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 660,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 30,
            fontWeight: 700,
            gap: 10,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={64} height={64} />
          Learning Games
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 76,
            lineHeight: 1.1,
            letterSpacing: -3,
            fontWeight: 700,
            marginTop: 50,
          }}
        >
          <span>Little games.</span>
          <span style={{ color: "#577c39" }}>Big discoveries.</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 25,
            color: "#62694d",
            marginTop: 23,
          }}
        >
          A world of learning, one happy step at a time.
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            alignSelf: "flex-start",
            borderRadius: 18,
            background: "#ffcc45",
            padding: "16px 25px",
            fontSize: 24,
            fontWeight: 700,
            marginTop: 35,
          }}
        >
          Word Bingo · Ages 4–6
        </div>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mascot}
        alt=""
        width={510}
        height={510}
        style={{ position: "absolute", right: 5, bottom: 14 }}
      />
    </div>,
    socialImageSize,
  );
}
