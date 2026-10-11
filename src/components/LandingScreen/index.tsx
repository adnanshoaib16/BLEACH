import { useId, useMemo, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useLandingAnimations } from './useAnimations';
import type { ReactElement } from 'react';

export interface LandingScreenProps {
  readonly onBegin: () => void;
}

const TITLE = 'REIATSU';

/* The title is laid out on a fixed grid of cells in its own coordinate space,
   so it scales with the viewport without reflowing and every glyph is its own
   node for the stagger. */
const VIEW_W = 1000;
const VIEW_H = 250;
const CELL = VIEW_W / TITLE.length;
const BASELINE = 198;
const GLYPH_SIZE = 214;

const DISPLAY_STACK = '"Bodoni Moda", Didot, "Times New Roman", serif';

/** The three kanji the brief asks for, used as the seal on the page. */
const SEALS = [
  { glyph: '霊', meaning: 'rei — spirit' },
  { glyph: '斬', meaning: 'zan — to cut' },
  { glyph: '魂', meaning: 'kon — soul' },
] as const;

/**
 * Chrome banding for the title fill.
 *
 * The dark band at 49% is the whole trick. A two-stop light-to-dark gradient
 * reads as grey paint; a ramp that goes bright, plunges almost to black across
 * a few percent, and comes back reads as a polished surface catching a
 * horizon. Tilting it a few degrees off vertical keeps it from looking like a
 * CSS default.
 */
const CHROME_STOPS = [
  ['0%', '#ffffff'],
  ['11%', '#eef6ff'],
  ['27%', '#a4b8cd'],
  ['41%', '#3d4a58'],
  ['49%', '#0b1016'],
  ['53%', '#33404b'],
  ['65%', '#a8bccf'],
  ['77%', '#ffffff'],
  ['88%', '#c2d1df'],
  ['100%', '#697684'],
] as const;

/**
 * The landing screen.
 *
 * One loud element and nothing else competing: the title is chrome seen
 * through a letter-shaped window, which is why it is built as an SVG mask
 * rather than clipped text — the mask can be animated per glyph while the
 * metal behind it stays perfectly still, so the letters feel like apertures
 * opening onto something rather than shapes being painted in.
 */
export function LandingScreen({ onBegin }: LandingScreenProps): ReactElement {
  const rootRef = useRef<HTMLElement>(null);
  const titleRef = useRef<SVGSVGElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();

  const rawId = useId();
  const uid = useMemo(() => rawId.replace(/:/g, ''), [rawId]);
  const maskId = `title-mask-${uid}`;
  const gradientId = `title-chrome-${uid}`;

  const glyphs = useMemo(() => Array.from(TITLE), []);

  useLandingAnimations({ rootRef, titleRef, leadRef, reduced });

  const glyphProps = {
    y: BASELINE,
    textAnchor: 'middle' as const,
    fontSize: GLYPH_SIZE,
    fontWeight: 900,
    style: { fontFamily: DISPLAY_STACK },
  };

  return (
    <section
      ref={rootRef}
      className="pad-safe pad-safe-y relative flex h-full flex-col justify-between gap-[clamp(1rem,3vh,2.5rem)]"
    >
      {/*背 — one enormous glyph bled off the right edge at almost no opacity.
          It is texture, not text, and it anchors the composition to the right
          while all the content stays left. */}
      <div
        aria-hidden
        className="kanji pointer-events-none absolute right-[-0.14em] top-1/2 -translate-y-1/2 select-none leading-none text-bone/[0.035]"
        style={{ fontSize: 'min(96vh, 68vw)' }}
      >
        魂
      </div>

      <header className="relative flex shrink-0 items-start pt-[clamp(0.5rem,2vh,1.5rem)]">
        <div className="chrome flex items-stretch">
          {SEALS.map((seal) => (
            <span
              key={seal.glyph}
              title={seal.meaning}
              className="landing-seal kanji border-r border-white/[0.12] px-[clamp(0.6rem,1.6vw,0.95rem)] py-[clamp(0.4rem,1vh,0.6rem)] text-label leading-none last:border-r-0"
            >
              {seal.glyph}
            </span>
          ))}
        </div>
      </header>

      <div className="relative flex min-h-0 shrink flex-col items-start">
        <h1 className="m-0 w-full">
          <svg
            ref={titleRef}
            role="img"
            aria-label={TITLE}
            viewBox={`0 0 ${String(VIEW_W)} ${String(VIEW_H)}`}
            className="block h-auto w-full"
            style={{ maxWidth: 'min(94vw, 1120px)' }}
          >
            <defs>
              <linearGradient
                id={gradientId}
                x1="0"
                y1="0"
                x2="0.14"
                y2="1"
                gradientUnits="objectBoundingBox"
              >
                {CHROME_STOPS.map(([offset, colour]) => (
                  <stop key={offset} offset={offset} stopColor={colour} />
                ))}
              </linearGradient>

              <mask
                id={maskId}
                maskUnits="userSpaceOnUse"
                x={-60}
                y={-60}
                width={VIEW_W + 120}
                height={VIEW_H + 120}
              >
                <rect
                  x={-60}
                  y={-60}
                  width={VIEW_W + 120}
                  height={VIEW_H + 120}
                  fill="#000000"
                />
                {glyphs.map((glyph, index) => (
                  <text
                    key={`${glyph}-${String(index)}`}
                    className="title-glyph"
                    x={CELL * (index + 0.5)}
                    fill="#ffffff"
                    {...glyphProps}
                  >
                    {glyph}
                  </text>
                ))}
              </mask>
            </defs>

            {/* The metal. Static — only the window over it moves. */}
            <rect
              x={0}
              y={0}
              width={VIEW_W}
              height={VIEW_H}
              fill={`url(#${gradientId})`}
              mask={`url(#${maskId})`}
            />

            {/* Two offset outline copies: misregistered ink in print, which is
                the same artefact as the lens aberration on the 3D layer. */}
            <g className="title-echo" style={{ mixBlendMode: 'screen' }} opacity={0}>
              {glyphs.map((glyph, index) => (
                <text
                  key={`hot-${glyph}-${String(index)}`}
                  x={CELL * (index + 0.5) + 8}
                  fill="none"
                  stroke="#ff3b1f"
                  strokeWidth={1.7}
                  {...glyphProps}
                >
                  {glyph}
                </text>
              ))}
            </g>
            <g className="title-echo" style={{ mixBlendMode: 'screen' }} opacity={0}>
              {glyphs.map((glyph, index) => (
                <text
                  key={`cool-${glyph}-${String(index)}`}
                  x={CELL * (index + 0.5) - 7}
                  fill="none"
                  stroke="#00e5ff"
                  strokeWidth={1.4}
                  {...glyphProps}
                >
                  {glyph}
                </text>
              ))}
            </g>
          </svg>
        </h1>

        <div
          className="landing-rule rule-slice mt-[clamp(0.5rem,1.6vh,1.1rem)] w-full"
          style={{ maxWidth: 'min(94vw, 1120px)' }}
        />

        <p
          ref={leadRef}
          className="mt-[clamp(0.9rem,2.4vh,1.6rem)] max-w-[46ch] text-pretty text-[clamp(0.95rem,1.2vw,1.2rem)] leading-relaxed text-bone/70"
        >
          Ten questions on Bleach lore, fifteen seconds each. Answer fast to earn more, and the
          archive will tell you what rank you hold.
        </p>

        <button
          type="button"
          onClick={onBegin}
          className="landing-cta cta chrome sheen focus-slice mt-[clamp(1.1rem,3vh,2.2rem)]"
        >
          <span className="hud-label text-label">Begin</span>
          <span className="cta-glyph kanji text-lead leading-none text-blood">斬</span>
        </button>
      </div>

      <footer className="landing-readout relative shrink-0 pb-[clamp(0.4rem,1.5vh,1.1rem)] opacity-0">
        <dl className="grid w-fit grid-cols-[auto_auto] gap-x-[clamp(1rem,3vw,2.5rem)] gap-y-1.5 border-l border-white/15 pl-[clamp(0.75rem,2vw,1.25rem)]">
          <dt className="hud-label text-micro text-bone/40">Questions</dt>
          <dd className="numeric m-0 text-micro text-bone/75">10</dd>
          <dt className="hud-label text-micro text-bone/40">Seconds each</dt>
          <dd className="numeric m-0 text-micro text-bone/75">15</dd>
          <dt className="hud-label text-micro text-bone/40">Ranks</dt>
          <dd className="numeric m-0 text-micro text-bone/75">7</dd>
        </dl>
      </footer>
    </section>
  );
}
