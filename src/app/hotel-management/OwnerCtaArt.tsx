/**
 * The illustration beside the closing call to action on /hotel-management.
 *
 * Inline SVG rather than a file in public/: it is part of the layout (it takes
 * the page's indigo palette and scales with the card), it costs no request, and
 * it cannot go missing the way a bitmap can — every asset under public/ was
 * answering 404 on the live site until the deploy started copying that folder
 * into the standalone build.
 *
 * Decorative: the heading and copy beside it already say everything, so the
 * whole thing is hidden from assistive technology.
 */
export default function OwnerCtaArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 400"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      {/* Soft disc the scene sits on */}
      <circle cx="300" cy="192" r="168" fill="#eef2ff" />

      {/* Clouds */}
      <g fill="#ffffff" opacity="0.9">
        <ellipse cx="118" cy="84" rx="26" ry="14" />
        <ellipse cx="140" cy="79" rx="17" ry="12" />
        <ellipse cx="99" cy="88" rx="15" ry="10" />
      </g>
      <g fill="#ffffff" opacity="0.75">
        <ellipse cx="300" cy="58" rx="19" ry="10" />
        <ellipse cx="315" cy="55" rx="12" ry="8" />
      </g>

      {/* Flight path and plane */}
      <path
        d="M348 118 C 374 94 402 70 436 56"
        fill="none"
        stroke="#c7d2fe"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="5 8"
      />
      <g transform="translate(455 46) rotate(40)">
        <path
          d="M0 -13 C2.6 -13 4 -9.4 4 -5.6 L4 -1 L13 5 L13 9 L4 6.6 L4 11 L7 14 L7 16 L0 14.6 L-7 16 L-7 14 L-4 11 L-4 6.6 L-13 9 L-13 5 L-4 -1 L-4 -5.6 C-4 -9.4 -2.6 -13 0 -13 Z"
          fill="#4f46e5"
        />
      </g>

      {/* Ground */}
      <ellipse cx="286" cy="350" rx="208" ry="15" fill="#e0e7ff" />

      {/* ── Hotel ── */}
      {/* Sign board */}
      <rect x="284" y="102" width="104" height="36" rx="9" fill="#4f46e5" />
      <text
        x="336"
        y="127"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontSize="19"
        fontWeight="800"
        letterSpacing="1.5"
        fill="#ffffff"
      >
        HOTEL
      </text>
      <rect x="300" y="138" width="7" height="10" fill="#a5b4fc" />
      <rect x="365" y="138" width="7" height="10" fill="#a5b4fc" />

      {/* Right wing, drawn first so the main block overlaps it */}
      <rect x="388" y="186" width="70" height="160" rx="6" fill="#f4f6ff" stroke="#c7d2fe" strokeWidth="2" />
      {[202, 236, 270].map(y => (
        <g key={`wing-${y}`}>
          <rect x="402" y={y} width="20" height="18" rx="3" fill="#c7d2fe" />
          <rect x="428" y={y} width="20" height="18" rx="3" fill="#e0e7ff" />
        </g>
      ))}

      {/* Main block */}
      <rect x="248" y="146" width="142" height="200" rx="7" fill="#ffffff" stroke="#c7d2fe" strokeWidth="2" />
      {[164, 202, 240].map((y, row) => (
        <g key={`win-${y}`}>
          {[262, 305, 348].map((x, col) => (
            <rect
              key={x}
              x={x}
              y={y}
              width="27"
              height="23"
              rx="3.5"
              fill={(row + col) % 3 === 0 ? '#a5b4fc' : '#e0e7ff'}
            />
          ))}
        </g>
      ))}

      {/* Entrance */}
      <rect x="292" y="288" width="56" height="9" rx="4.5" fill="#6366f1" />
      <rect x="301" y="300" width="38" height="46" rx="4" fill="#c7d2fe" />
      <line x1="320" y1="302" x2="320" y2="346" stroke="#ffffff" strokeWidth="2" />

      {/* Planting */}
      <g fill="#c7d2fe">
        <ellipse cx="245" cy="338" rx="24" ry="15" />
        <ellipse cx="472" cy="336" rx="20" ry="13" />
      </g>
      <rect x="490" y="312" width="6" height="32" rx="3" fill="#a5b4fc" />
      <circle cx="493" cy="304" r="21" fill="#c7d2fe" />

      {/* ── Booking card, front of scene ── */}
      <rect x="56" y="194" width="196" height="116" rx="16" fill="#ffffff" stroke="#e0e7ff" strokeWidth="2" />

      {/* Calendar */}
      <rect x="74" y="210" width="64" height="64" rx="9" fill="#4f46e5" />
      <rect x="74" y="230" width="64" height="44" rx="9" fill="#ffffff" />
      <rect x="74" y="230" width="64" height="12" fill="#ffffff" />
      <rect x="86" y="203" width="7" height="12" rx="3.5" fill="#a5b4fc" />
      <rect x="119" y="203" width="7" height="12" rx="3.5" fill="#a5b4fc" />
      {[240, 252, 262].map((y, row) => (
        <g key={`cal-${y}`}>
          {[81, 95, 109, 123].map((x, col) => (
            <rect
              key={x}
              x={x}
              y={y}
              width="9"
              height="7"
              rx="2"
              fill={row === 1 && col === 2 ? '#4f46e5' : '#dbe1fb'}
            />
          ))}
        </g>
      ))}

      {/* Booking lines */}
      <rect x="152" y="216" width="84" height="10" rx="5" fill="#e0e7ff" />
      <rect x="152" y="234" width="62" height="10" rx="5" fill="#eef2ff" />
      <rect x="152" y="252" width="74" height="10" rx="5" fill="#eef2ff" />

      {/* Confirmed badge */}
      <circle cx="228" cy="286" r="17" fill="#4f46e5" />
      <path
        d="M220 286 l5.5 5.5 L236 281"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
