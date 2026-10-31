import Image from "next/image";
import { artwork } from "@/lib/games/artwork";

export function Mascot({
  pose = "wave",
  className = "",
}: {
  pose?: keyof typeof artwork.mascot;
  className?: string;
}) {
  return (
    <div className={`mascot-image ${className}`}>
      <Image
        src={artwork.mascot[pose]}
        alt="Our friendly explorer jellyfish"
        width={1024}
        height={1024}
        sizes="(max-width: 720px) 240px, 360px"
      />
    </div>
  );
}
