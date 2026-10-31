import Link from "next/link";
export function DiscoveryStar({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path
        d="M32 5c3 0 7 15 10 17s18 1 19 5-12 12-13 16 5 17 1 20-14-7-17-7-14 10-17 7 2-16 1-20S2 31 3 27s16-3 19-5S29 5 32 5Z"
        transform="translate(3 -2) scale(.9)"
        fill="#ffce45"
        stroke="#d89b27"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path
        d="m32 15 5 13 14 1-11 9 3 14-11-7-11 7 3-14-11-9 14-1Z"
        fill="#ffdf78"
        opacity=".65"
      />
    </svg>
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
      <DiscoveryStar className="brand-star" />
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
