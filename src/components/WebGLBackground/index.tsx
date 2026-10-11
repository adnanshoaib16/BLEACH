import { useThree } from '../../hooks/useThree';
import type { ReactElement } from 'react';

/**
 * Shown when WebGL is unavailable or the visitor has asked for reduced motion.
 *
 * Not a blank fallback: the same composition rendered as a still. Two ink
 * washes bleeding from the corners, the technical grid, and the accent
 * vignette — which still tracks the quiz, because it reads the same custom
 * property the live scene does.
 */
function StaticInkWash(): ReactElement {
  return (
    <div className="pointer-events-none fixed inset-0 z-webgl overflow-hidden bg-sumi" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 18% 12%, rgba(255,255,255,0.09), transparent 60%),' +
            'radial-gradient(ellipse 60% 50% at 88% 82%, rgba(0,229,255,0.11), transparent 62%),' +
            'radial-gradient(circle at 70% 18%, rgba(255,59,31,0.07), transparent 48%)',
        }}
      />
      <div className="hud-grid absolute inset-0 opacity-70" />
      <div className="reiatsu-vignette absolute inset-0 transition-opacity duration-700" />
      <div className="grain absolute inset-0" />
    </div>
  );
}

/**
 * The persistent background layer. Mounted once above the router-less screen
 * switch, so the scene survives every transition between landing, quiz and
 * results instead of being torn down and rebuilt.
 */
export function WebGLBackground(): ReactElement {
  const { canvasRef, profile } = useThree();

  if (profile.tier === 'off') return <StaticInkWash />;

  return (
    <div className="pointer-events-none fixed inset-0 z-webgl overflow-hidden" aria-hidden>
      <canvas ref={canvasRef} className="block h-full w-full" />

      {/* Overlays sit above the canvas but below the stage, so the HUD grid and
          scanlines read as part of the same display surface as the 3D. */}
      <div className="hud-grid absolute inset-0 opacity-80" />
      <div className="scanlines absolute inset-0" />
      <div className="reiatsu-vignette absolute inset-0 transition-opacity duration-500" />
    </div>
  );
}
