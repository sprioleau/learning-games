import Image from "next/image";
import { artwork } from "@/lib/games/artwork";
/* Temporary vector artwork gives way to supplied transparent production assets. */
export function Mascot({
  pose = "wave",
  className = "",
}: {
  pose?: "wave" | "cheer" | "think";
  className?: string;
}) {
  const source = artwork.mascot[pose];
  if (source)
    return (
      <div className={`mascot-image ${className}`}>
        <Image
          src={source}
          alt="Our friendly explorer jellyfish"
          width={1024}
          height={1024}
          sizes="(max-width: 720px) 240px, 360px"
        />
      </div>
    );
  return (
    <svg
      viewBox="0 0 360 370"
      className={`mascot ${className}`}
      aria-label="A friendly explorer jellyfish waving hello"
      role="img"
    >
      <defs>
        <linearGradient id={`jelly-${pose}`} x1="0" y1="0" x2="0.7" y2="1">
          <stop stopColor="#ffdbc0" />
          <stop offset=".6" stopColor="#ffb4ab" />
          <stop offset="1" stopColor="#f58d98" />
        </linearGradient>
      </defs>
      <ellipse cx="180" cy="347" rx="94" ry="11" fill="#3c6940" opacity=".12" />
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="24"
      >
        <path d="M110 209Q70 253 107 270T90 319" stroke="#ef9b9f" />
        <path d="M141 216Q108 276 140 293T125 340" stroke="#f7b5a0" />
        <path d="M181 222Q158 274 181 298T173 345" stroke="#f1a1ae" />
        <path d="M214 216Q253 264 218 289T232 337" stroke="#ffc596" />
        <path d="M248 208Q284 247 256 267T279 317" stroke="#e5a3b5" />
      </g>
      <path
        d="M94 183Q38 229 43 192Q51 175 42 166"
        fill="none"
        stroke="#ffb7aa"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M258 183Q299 225 319 174Q323 160 315 151"
        fill="none"
        stroke="#ffbcaa"
        strokeWidth="22"
        strokeLinecap="round"
      />
      <path
        d="M82 184C82 67 278 62 279 184Q279 232 249 214Q234 239 212 219Q188 245 165 222Q143 239 125 218Q84 241 82 184Z"
        fill={`url(#jelly-${pose})`}
        stroke="#e89891"
        strokeWidth="3"
      />
      <ellipse cx="113" cy="181" rx="13" ry="9" fill="#f48c8d" opacity=".55" />
      <ellipse cx="244" cy="181" rx="13" ry="9" fill="#f48c8d" opacity=".55" />
      {pose === "cheer" ? (
        <g stroke="#49352b" fill="none" strokeWidth="5" strokeLinecap="round">
          <path d="M130 162Q141 149 151 162" />
          <path d="M207 162Q218 149 228 162" />
        </g>
      ) : (
        <g fill="#49352b">
          <ellipse cx="141" cy="161" rx="10" ry="14" />
          <ellipse cx="217" cy="161" rx="10" ry="14" />
          <g fill="#fff8e9">
            <ellipse cx="138" cy="156" rx="3" ry="4" />
            <ellipse cx="214" cy="156" rx="3" ry="4" />
          </g>
        </g>
      )}
      <path
        d="M164 180Q181 190 197 178Q194 204 180 204Q169 203 164 180Z"
        fill="#704137"
      />
      <path d="M171 197Q181 188 191 197Q182 207 171 197" fill="#f4878a" />
      <path d="M105 244L130 223L156 244L140 277Z" fill="#f57d65" />
      <path
        d="M229 225Q192 251 140 267"
        stroke="#755b3e"
        strokeWidth="12"
        fill="none"
      />
      <rect
        x="109"
        y="249"
        width="56"
        height="47"
        rx="12"
        fill="#4ea8ac"
        stroke="#32828b"
        strokeWidth="3"
      />
      <path d="M113 254L158 254L153 273H118Z" fill="#76c6c7" />
      <rect x="130" y="267" width="12" height="15" rx="3" fill="#f9cc65" />
      <circle
        cx="209"
        cy="270"
        r="24"
        fill="#f3bf50"
        stroke="#c79538"
        strokeWidth="3"
      />
      <circle cx="209" cy="270" r="18" fill="#fff3d3" />
      <path d="M209 255L216 277L209 273L202 280Z" fill="#ed816c" />
      <path d="M209 255L209 273L202 280Z" fill="#50899d" />
      <path
        d="M61 130Q77 87 130 67Q178 51 250 80L294 112Q255 140 182 143Q100 149 61 130Z"
        fill="#e5b663"
        stroke="#ad7c36"
        strokeWidth="3"
      />
      <path
        d="M106 102L118 51Q165 17 224 42L250 97Q175 125 106 102Z"
        fill="#f3ce82"
        stroke="#b98c49"
        strokeWidth="3"
      />
      <path d="M111 86Q172 107 244 81L249 97Q174 124 107 102Z" fill="#957843" />
      <path
        d="M124 54Q176 31 220 48"
        fill="none"
        stroke="#80663c"
        strokeWidth="10"
      />
      <g transform="rotate(-9 170 66)">
        <ellipse
          cx="146"
          cy="63"
          rx="25"
          ry="21"
          fill="#bc9347"
          stroke="#896433"
          strokeWidth="3"
        />
        <ellipse
          cx="204"
          cy="63"
          rx="25"
          ry="21"
          fill="#bc9347"
          stroke="#896433"
          strokeWidth="3"
        />
        <ellipse cx="146" cy="63" rx="18" ry="15" fill="#75c7e5" />
        <ellipse cx="204" cy="63" rx="18" ry="15" fill="#75c7e5" />
        <path d="M170 63H180" stroke="#896433" strokeWidth="6" />
        <path
          d="M137 61L148 53M195 61L206 53"
          stroke="#d6f3ff"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      <g stroke="#f6c43d" strokeWidth="4" strokeLinecap="round">
        <path d="M303 99L313 88M311 115L326 111M291 90L295 75" />
      </g>
    </svg>
  );
}
