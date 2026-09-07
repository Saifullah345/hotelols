/**
 * The envelope-and-paper-plane mark beside the contact form.
 *
 * Inline SVG for the same reasons as the CTA artwork on /hotel-management: it
 * takes the page's indigo palette, costs no request, and cannot go missing the
 * way a file under public/ can. Purely decorative — the form beside it says
 * what the page is for.
 */
export default function ContactArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 320"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ca-flap" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <linearGradient id="ca-body" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="ca-plane" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c7d2fe" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>

      {/* Halo */}
      <circle cx="168" cy="182" r="104" fill="#eef2ff" />

      {/* Motion ticks, the way a flat illustration shows something in flight */}
      <g stroke="#a5b4fc" strokeWidth="6" strokeLinecap="round">
        <line x1="46" y1="96" x2="60" y2="110" />
        <line x1="34" y1="140" x2="52" y2="140" />
        <line x1="286" y1="150" x2="304" y2="150" />
        <line x1="278" y1="186" x2="296" y2="176" />
      </g>

      {/* Paper plane, up and to the right of the envelope */}
      <g transform="translate(228 62) rotate(-12)">
        <path d="M0 34 L74 0 L46 62 L34 44 Z" fill="url(#ca-plane)" />
        <path d="M0 34 L74 0 L34 44 Z" fill="#e0e7ff" />
        <path d="M34 44 L46 62 L40 40 Z" fill="#a5b4fc" />
      </g>

      {/* Envelope, tilted so it reads as floating rather than filed away */}
      <g transform="translate(78 138) rotate(-14)">
        {/* Back of the envelope */}
        <rect x="0" y="18" width="164" height="106" rx="14" fill="url(#ca-body)" />
        {/* The letter rising out of it */}
        <rect x="26" y="-14" width="112" height="86" rx="9" fill="#ffffff" />
        <g fill="#dbe1fb">
          <rect x="42" y="6" width="80" height="8" rx="4" />
          <rect x="42" y="24" width="62" height="8" rx="4" />
          <rect x="42" y="42" width="72" height="8" rx="4" />
        </g>
        {/* Front panel and flap, drawn last so the letter tucks behind them */}
        <path d="M0 60 L82 112 L164 60 L164 110 A14 14 0 0 1 150 124 L14 124 A14 14 0 0 1 0 110 Z" fill="url(#ca-flap)" />
        <path d="M0 60 L82 112 L164 60 L164 72 L82 124 L0 72 Z" fill="#4338ca" opacity="0.35" />
      </g>
    </svg>
  )
}
