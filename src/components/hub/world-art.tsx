import Image from "next/image";
import { artwork } from "@/lib/games/artwork";
import { Mascot } from "./mascot";
import type { WorldId } from "@/lib/games/worlds";
/* Vector scenery stays separate from rules, ready to swap for commissioned artwork. */
export function WorldArt({
  world = "jungle",
  className = "",
}: {
  world?: WorldId;
  className?: string;
}) {
  const background = artwork.backgrounds[world];
  if (background)
    return (
      <div className={`supplied-world-art ${className}`}>
        <Image
          src={background}
          alt=""
          width={600}
          height={338}
          sizes="(max-width: 720px) 90vw, 500px"
        />
        {world === "jungle" && <Mascot className="supplied-world-mascot" />}
      </div>
    );
  return (
    <svg
      viewBox="0 0 600 280"
      className={`world-art ${className}`}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id={`dots-${world}`}
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="3" cy="3" r="1" fill="currentColor" opacity=".05" />
        </pattern>
      </defs>
      <circle
        cx="460"
        cy="68"
        r="40"
        fill={world === "arctic" ? "#fffdf0" : "#ffda75"}
      />
      <path
        d="M0 200Q130 90 280 185T600 130V280H0Z"
        fill="currentColor"
        opacity=".12"
      />
      <path
        d="M0 230Q170 150 350 220T600 190V280H0Z"
        fill="currentColor"
        opacity=".13"
      />
      {world === "jungle" ? (
        <>
          <path
            d="M81 270Q110 160 92 86M507 280Q475 150 510 80"
            fill="none"
            stroke="#6f8050"
            strokeWidth="15"
          />
          <path
            d="M95 125Q4 120 28 50Q100 55 95 125M95 125Q85 20 155 37Q169 108 95 125M95 125Q157 61 191 121Q163 158 95 125M503 123Q421 84 448 42Q517 56 503 123M503 123Q496 22 558 39Q574 104 503 123M503 123Q556 82 597 119Q572 164 503 123"
            fill="#6c9d68"
          />
          <path
            d="M0 280Q0 173 58 187Q76 225 44 257Q85 202 113 232L133 280M470 280Q466 209 514 217Q536 242 512 267Q549 202 582 226Q615 244 600 280"
            fill="#3e7557"
          />
          <foreignObject x="190" y="6" width="250" height="274">
            <Mascot />
          </foreignObject>
          <path
            d="M177 61l4-12m-4 12l-11-4m11 4l11 4m-11-4l-4 12"
            stroke="#fff6c9"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <text x="300" y="210" textAnchor="middle" fontSize="130">
            {world === "desert"
              ? "🌵"
              : world === "arctic"
                ? "🐧"
                : world === "city"
                  ? "🏡"
                  : "⛵"}
          </text>
          {world === "arctic" && (
            <path
              d="M0 240L110 90L220 240M375 240L490 100L600 240"
              fill="#f6fbff"
              opacity=".7"
            />
          )}
        </>
      )}
      <rect width="600" height="280" fill={`url(#dots-${world})`} />
    </svg>
  );
}
