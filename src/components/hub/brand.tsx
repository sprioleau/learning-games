import Image from "next/image";
import { artwork } from "@/lib/games/artwork";
import Link from "next/link";
export function DiscoveryStar({
  className = "",
  tone = "color",
}: {
  className?: string;
  tone?: keyof typeof artwork.logo;
}) {
  return (
    <Image
      src={artwork.logo[tone]}
      alt=""
      width={64}
      height={64}
      className={className}
    />
  );
}
export function Brand({
  variant = "horizontal",
  tone = "dark",
  hasLink = true,
}: {
  variant?: "horizontal" | "stacked" | "compact";
  tone?: "dark" | "light";
  hasLink?: boolean;
}) {
  const content = (
    <>
      <DiscoveryStar
        className="brand-star"
        tone={tone === "light" ? "white" : "color"}
      />
      {variant !== "compact" && (
        <span className="brand-wordmark">
          Learning{variant === "stacked" ? <br /> : " "}Games
        </span>
      )}
    </>
  );
  const className = `brand brand-${variant} brand-${tone}`;
  return hasLink ? (
    <Link href="/" className={className} aria-label="Learning Games home">
      {content}
    </Link>
  ) : (
    <span className={className} role="img" aria-label="Learning Games">
      {content}
    </span>
  );
}
