'use client'

import { useMemo } from 'react'

/**
 * The animated winter backdrop: a fixed photographed treeline that drifts slowly behind a
 * veil, with falling snow above it. Purely decorative, so it is hidden from assistive tech
 * and stops moving when the visitor asks for reduced motion.
 */
export default function WinterBackdrop() {
  const flakes = useMemo(
    () =>
      Array.from({ length: 42 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        size: `${3 + ((index * 11) % 6)}px`,
        delay: `${-((index * 1.7) % 14)}s`,
        duration: `${9 + ((index * 13) % 10)}s`,
        drift: `${-35 + ((index * 17) % 70)}px`,
        opacity: `${0.28 + ((index * 7) % 55) / 100}`,
      })),
    [],
  )

  return (
    <>
      <div className="winter-scene" aria-hidden="true">
        <img src="/winter-trees.png" alt="" className="winter-image" />
        <div className="winter-veil" />
      </div>
      <div className="snowfall" aria-hidden="true">
        {flakes.map((flake) => (
          <span
            key={flake.id}
            className="snowflake"
            style={
              {
                left: flake.left,
                width: flake.size,
                height: flake.size,
                opacity: flake.opacity,
                animationDelay: flake.delay,
                animationDuration: flake.duration,
                '--snow-drift': flake.drift,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </>
  )
}
