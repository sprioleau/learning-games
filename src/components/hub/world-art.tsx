import Image from "next/image";
import { artwork } from "@/lib/games/artwork";
import { Mascot } from "./mascot";
import type { WorldId } from "@/lib/games/worlds";

export function WorldArt({
  world = "jungle",
  className = "",
}: {
  world?: WorldId;
  className?: string;
}) {
  return (
    <div className={`supplied-world-art ${className}`}>
      <Image
        src={artwork.backgrounds[world]}
        alt=""
        width={2560}
        height={1440}
        sizes="(max-width: 720px) 90vw, 500px"
      />
      {world === "jungle" && <Mascot className="supplied-world-mascot" />}
    </div>
  );
}
