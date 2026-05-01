interface GenderSymbolProps {
  gender: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}

/**
 * Inline SVG gender symbols for the storefront filter.
 *
 * Using inline SVGs (rather than Lucide or Unicode) for three reasons:
 *   1. Lucide v0.462 doesn't have Mars/Venus icons (added in v0.475).
 *   2. Unicode glyphs render inconsistently across OSes.
 *   3. Inline SVG gives us full control over stroke + sizing.
 *
 * The SVGs use currentColor so they inherit text color from the parent.
 */
export function GenderSymbol({ gender, size = 14, className = '', strokeWidth = 1.5 }: GenderSymbolProps) {
  const g = gender.toLowerCase();
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  if (g === 'men' || g === 'male' || g === 'mars') {
    return (
      <svg {...common}>
        <circle cx="10" cy="14" r="5" />
        <path d="M14 10l5-5" />
        <path d="M19 10V5h-5" />
      </svg>
    );
  }

  if (g === 'women' || g === 'female' || g === 'venus') {
    return (
      <svg {...common}>
        <circle cx="12" cy="9" r="5" />
        <path d="M12 14v8" />
        <path d="M9 19h6" />
      </svg>
    );
  }

  // Unisex: interlocking Mars + Venus circles.
  // Two overlapping circles — top-right circle has the Mars arrow extending up-right,
  // bottom-left circle has the Venus cross extending down. Reads instantly as "both combined."
  return (
    <svg {...common} viewBox="0 0 24 24">
      {/* Bottom-left circle (Venus) */}
      <circle cx="9" cy="13" r="4.5" />
      {/* Top-right circle (Mars) */}
      <circle cx="15" cy="11" r="4.5" />
      {/* Mars arrow — up and right from top-right circle */}
      <path d="M17.5 7.5l3-3" />
      <path d="M20.5 7.5v-3h-3" />
      {/* Venus cross — down from bottom-left circle */}
      <path d="M9 17.5v3.5" />
      <path d="M7 19.5h4" />
    </svg>
  );
}
