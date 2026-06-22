import type { SVGProps } from "react";

const stroke = "currentColor";

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <path
        d="M16 3l2.5 6.5L25 12l-5.5 4 2 7-5.5-4-5.5 4 2-7L7 12l6.5-2.5L16 3z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M16 5.5c2.2 3.2 5 4.5 8.5 4.8-.3 4.2-2 7.5-4.6 9.5-1.4 1.1-2.6 2.7-3.9 5.2-1.3-2.5-2.5-4.1-3.9-5.2C9.5 17.8 7.8 14.5 7.5 10.3 11 10 13.8 8.7 16 5.5z"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// Abstract botanical glyphs (warm brown) — used in feature cards
export function GlyphClover(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" {...props}>
      <circle cx="20" cy="10" r="6" />
      <circle cx="10" cy="20" r="6" />
      <circle cx="30" cy="20" r="6" />
      <circle cx="20" cy="30" r="6" />
      <circle cx="20" cy="20" r="3" fill="var(--background)" />
    </svg>
  );
}

export function GlyphSprout(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" {...props}>
      <path d="M20 32V14" stroke="currentColor" strokeWidth="2.5" />
      <path d="M20 18c-4-2-8-1-10 2 2 3 6 4 10 2z" />
      <path d="M20 14c4-2 8-1 10 2-2 3-6 4-10 2z" />
      <path d="M20 22c-4-2-8-1-10 2 2 3 6 4 10 2z" />
    </svg>
  );
}

export function GlyphShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" {...props}>
      <path d="M20 5l12 4v10c0 8-6 14-12 16-6-2-12-8-12-16V9l12-4z" />
      <path d="M14 20l4 4 8-8" stroke="var(--background)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GlyphSpark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" {...props}>
      <path d="M20 4l3 13 13 3-13 3-3 13-3-13-13-3 13-3 3-13z" />
    </svg>
  );
}

export function GlyphCross(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" {...props}>
      <path d="M16 4h8v12h12v8H24v12h-8V24H4v-8h12V4z" />
    </svg>
  );
}

export function GlyphBloom(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 40" fill="currentColor" {...props}>
      <circle cx="20" cy="20" r="5" />
      <ellipse cx="20" cy="8" rx="4" ry="6" />
      <ellipse cx="20" cy="32" rx="4" ry="6" />
      <ellipse cx="8" cy="20" rx="6" ry="4" />
      <ellipse cx="32" cy="20" rx="6" ry="4" />
    </svg>
  );
}

export function PlusBadge(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" {...props}>
      <path d="M5 1h2v4h4v2H7v4H5V7H1V5h4V1z" />
    </svg>
  );
}

export function ArrowUpRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M5 11L11 5M11 5H6M11 5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
