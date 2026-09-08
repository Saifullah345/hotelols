/**
 * Inline SVG mockup of the hotel admin dashboard shown in the hero.
 * No image request, no 404 risk, matches the real app's layout.
 */
export default function HeroDashboardSVG({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 720 460"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id="hd-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6366f1" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>
        <clipPath id="hd-chart-clip">
          <rect x="182" y="200" width="332" height="96" />
        </clipPath>
      </defs>

      {/* ── Window chrome ── */}
      <rect width="720" height="460" rx="14" fill="#0d1526" />

      {/* Title bar */}
      <rect width="720" height="28" rx="14" fill="#1a2540" />
      <rect y="14" width="720" height="14" fill="#1a2540" />
      <circle cx="22" cy="14" r="5" fill="#ef4444" />
      <circle cx="38" cy="14" r="5" fill="#f59e0b" />
      <circle cx="54" cy="14" r="5" fill="#22c55e" />
      <rect x="220" y="6" width="280" height="16" rx="8" fill="#0d1526" />
      <text x="360" y="18" textAnchor="middle" fontSize="8.5" fill="#4b6080"
        fontFamily="system-ui,sans-serif">bookqayam.com/hotel-admin/dashboard</text>

      {/* ── Sidebar ── */}
      <rect x="0" y="28" width="152" height="432" fill="#1a2540" />

      {/* Logo */}
      <circle cx="22" cy="52" r="12" fill="#6366f1" />
      <text x="22" y="57" textAnchor="middle" fontSize="12" fontWeight="800"
        fill="white" fontFamily="system-ui,sans-serif">B</text>
      <text x="42" y="50" fontSize="10.5" fontWeight="700" fill="white"
        fontFamily="system-ui,sans-serif">BookQayam</text>
      <text x="42" y="63" fontSize="9" fill="#64748b"
        fontFamily="system-ui,sans-serif">Wah Palace</text>

      {/* Active nav item — Dashboard */}
      <rect x="8" y="78" width="136" height="26" rx="7" fill="#4f46e5" />
      <rect x="18" y="84" width="12" height="12" rx="2.5" fill="#a5b4fc" />
      <text x="36" y="94.5" fontSize="10.5" fontWeight="600" fill="white"
        fontFamily="system-ui,sans-serif">Dashboard</text>

      {/* Other nav items */}
      {[
        [110, 'Rooms'],
        [138, 'Bookings'],
        [166, 'WhatsApp'],
        [194, 'Staff'],
        [222, 'Reports'],
        [250, 'Reviews'],
        [278, 'Payments'],
        [306, 'Settings'],
      ].map(([y, label]) => (
        <g key={label}>
          <rect x="18" y={+y + 6} width="11" height="11" rx="2" fill="#334155" />
          <text x="36" y={+y + 16} fontSize="10" fill="#64748b"
            fontFamily="system-ui,sans-serif">{label}</text>
        </g>
      ))}

      {/* Sign out */}
      <rect x="10" y="432" width="132" height="20" rx="6" fill="#3f1515" />
      <text x="76" y="446" textAnchor="middle" fontSize="9.5" fill="#ef4444"
        fontFamily="system-ui,sans-serif">↩ Sign Out</text>

      {/* ── Main area background ── */}
      <rect x="152" y="28" width="568" height="432" fill="#f0f4fa" />

      {/* ── Header ── */}
      <rect x="152" y="28" width="568" height="48" fill="white" />
      <line x1="152" y1="76" x2="720" y2="76" stroke="#e8edf5" strokeWidth="1" />
      <text x="172" y="48" fontSize="13" fontWeight="700" fill="#0f172a"
        fontFamily="system-ui,sans-serif">Dashboard</text>
      <text x="172" y="64" fontSize="8.5" fill="#94a3b8"
        fontFamily="system-ui,sans-serif">Today, Monday, July 11, 2028</text>

      {/* Occupancy badge */}
      <rect x="516" y="38" width="72" height="20" rx="10" fill="#dcfce7" />
      <circle cx="528" cy="48" r="4" fill="#22c55e" />
      <text x="548" y="52" fontSize="8.5" fill="#15803d"
        fontFamily="system-ui,sans-serif">85% occupancy</text>

      {/* Pending badge */}
      <rect x="594" y="38" width="60" height="20" rx="10" fill="#fef3c7" />
      <circle cx="606" cy="48" r="4" fill="#f59e0b" />
      <text x="624" y="52" fontSize="8.5" fill="#92400e"
        fontFamily="system-ui,sans-serif">1 pending</text>

      {/* User avatar */}
      <circle cx="704" cy="52" r="14" fill="#6366f1" />
      <text x="704" y="57" textAnchor="middle" fontSize="9.5" fontWeight="700"
        fill="white" fontFamily="system-ui,sans-serif">SA</text>

      {/* ── Stat cards ── */}
      {/* Total Rooms */}
      <rect x="164" y="86" width="122" height="68" rx="10" fill="white" />
      <rect x="248" y="93" width="26" height="26" rx="7" fill="#ede9fe" />
      <rect x="255" y="100" width="12" height="12" rx="2" fill="#8b5cf6" />
      <text x="174" y="106" fontSize="8.5" fill="#94a3b8"
        fontFamily="system-ui,sans-serif">Total Rooms</text>
      <text x="174" y="129" fontSize="24" fontWeight="800" fill="#0f172a"
        fontFamily="system-ui,sans-serif">4</text>
      <text x="174" y="144" fontSize="7.5" fill="#94a3b8"
        fontFamily="system-ui,sans-serif">+1 this month</text>

      {/* Available Rooms */}
      <rect x="294" y="86" width="122" height="68" rx="10" fill="white" />
      <rect x="378" y="93" width="26" height="26" rx="7" fill="#dcfce7" />
      <rect x="385" y="100" width="12" height="12" rx="2" fill="#22c55e" />
      <text x="304" y="106" fontSize="8.5" fill="#94a3b8"
        fontFamily="system-ui,sans-serif">Available Rooms</text>
      <text x="304" y="129" fontSize="24" fontWeight="800" fill="#0f172a"
        fontFamily="system-ui,sans-serif">3</text>
      <text x="304" y="144" fontSize="7.5" fill="#94a3b8"
        fontFamily="system-ui,sans-serif">of 4 rooms free</text>

      {/* Total Bookings */}
      <rect x="424" y="86" width="122" height="68" rx="10" fill="white" />
      <rect x="508" y="93" width="26" height="26" rx="7" fill="#dbeafe" />
      <rect x="515" y="100" width="12" height="12" rx="2" fill="#3b82f6" />
      <text x="434" y="106" fontSize="8.5" fill="#94a3b8"
        fontFamily="system-ui,sans-serif">Total Bookings</text>
      <text x="434" y="129" fontSize="24" fontWeight="800" fill="#0f172a"
        fontFamily="system-ui,sans-serif">8</text>
      <text x="434" y="144" fontSize="7.5" fill="#22c55e"
        fontFamily="system-ui,sans-serif">↑ 12% last month</text>

      {/* Total Revenue */}
      <rect x="554" y="86" width="154" height="68" rx="10" fill="white" />
      <rect x="672" y="93" width="26" height="26" rx="7" fill="#dcfce7" />
      <rect x="679" y="100" width="12" height="12" rx="2" fill="#22c55e" />
      <text x="564" y="106" fontSize="8.5" fill="#94a3b8"
        fontFamily="system-ui,sans-serif">Total Revenue</text>
      <text x="564" y="129" fontSize="19" fontWeight="800" fill="#0f172a"
        fontFamily="system-ui,sans-serif">Rs 3,044</text>
      <text x="564" y="144" fontSize="7.5" fill="#22c55e"
        fontFamily="system-ui,sans-serif">↑ 8% last month</text>

      {/* ── Revenue Overview card ── */}
      <rect x="164" y="164" width="356" height="146" rx="10" fill="white" />
      <text x="178" y="181" fontSize="10.5" fontWeight="700" fill="#0f172a"
        fontFamily="system-ui,sans-serif">Revenue Overview</text>
      <text x="510" y="181" textAnchor="end" fontSize="10.5" fontWeight="700"
        fill="#0f172a" fontFamily="system-ui,sans-serif">Rs 3,044</text>

      {/* Grid lines */}
      {[0, 24, 48, 72].map((off, i) => (
        <line key={i} x1="182" y1={210 + off} x2="510" y2={210 + off}
          stroke="#f1f5f9" strokeWidth="1" />
      ))}
      {['4k', '3k', '2k', '1k'].map((lbl, i) => (
        <text key={lbl} x="179" y={215 + i * 24} textAnchor="end"
          fontSize="7" fill="#cbd5e1" fontFamily="system-ui,sans-serif">{lbl}</text>
      ))}

      {/* Area fill */}
      <path
        d="M 182,292 L 215,289 L 248,285 L 278,280 L 308,272 L 338,262 L 368,250 L 396,238 L 424,228 L 455,218 L 482,212 L 510,206 L 510,296 L 182,296 Z"
        fill="url(#hd-chart-fill)"
        clipPath="url(#hd-chart-clip)"
      />
      {/* Line */}
      <path
        d="M 182,292 L 215,289 L 248,285 L 278,280 L 308,272 L 338,262 L 368,250 L 396,238 L 424,228 L 455,218 L 482,212 L 510,206"
        fill="none" stroke="#6366f1" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Endpoint dot */}
      <circle cx="510" cy="206" r="4" fill="white" stroke="#6366f1" strokeWidth="2.5" />

      {/* Month labels */}
      {['Jan','Feb','Mar','Apr','May','Jun','Jul'].map((m, i) => (
        <text key={m} x={182 + i * 47} y={308}
          fontSize="7" fill="#94a3b8" fontFamily="system-ui,sans-serif">{m}</text>
      ))}

      {/* ── Today's Overview card ── */}
      <rect x="528" y="164" width="180" height="146" rx="10" fill="white" />
      <text x="542" y="181" fontSize="10.5" fontWeight="700" fill="#0f172a"
        fontFamily="system-ui,sans-serif">Today's Overview</text>

      <line x1="542" y1="218" x2="696" y2="218" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="542" y1="244" x2="696" y2="244" stroke="#f1f5f9" strokeWidth="1" />
      <line x1="542" y1="268" x2="696" y2="268" stroke="#f1f5f9" strokeWidth="1" />

      <text x="542" y="212" fontSize="9.5" fill="#475569"
        fontFamily="system-ui,sans-serif">Check-ins Today</text>
      <text x="696" y="212" textAnchor="end" fontSize="9.5" fontWeight="700"
        fill="#0f172a" fontFamily="system-ui,sans-serif">0</text>

      <text x="542" y="238" fontSize="9.5" fill="#475569"
        fontFamily="system-ui,sans-serif">Pending Bookings</text>
      <text x="696" y="238" textAnchor="end" fontSize="9.5" fontWeight="700"
        fill="#f59e0b" fontFamily="system-ui,sans-serif">1</text>

      <text x="542" y="262" fontSize="9.5" fill="#475569"
        fontFamily="system-ui,sans-serif">Occupancy Rate</text>
      <text x="696" y="262" textAnchor="end" fontSize="9.5" fontWeight="700"
        fill="#ef4444" fontFamily="system-ui,sans-serif">35%</text>

      {/* Occupancy bar */}
      <rect x="542" y="276" width="152" height="7" rx="3.5" fill="#fee2e2" />
      <rect x="542" y="276" width="53" height="7" rx="3.5" fill="#ef4444" />
      <text x="542" y="297" fontSize="7.5" fill="#94a3b8"
        fontFamily="system-ui,sans-serif">35% of rooms occupied</text>

      {/* ── Recent Bookings table ── */}
      <rect x="164" y="320" width="544" height="130" rx="10" fill="white" />
      <text x="178" y="337" fontSize="10.5" fontWeight="700" fill="#0f172a"
        fontFamily="system-ui,sans-serif">Recent Bookings</text>

      {/* Table header row */}
      <rect x="164" y="342" width="544" height="20" fill="#f8fafc" />
      {[
        [178, 'GUEST'],
        [304, 'ROOM'],
        [388, 'CHECK-IN'],
        [464, 'CHECK-OUT'],
        [546, 'AMOUNT'],
        [626, 'STATUS'],
      ].map(([x, lbl]) => (
        <text key={lbl} x={+x} y={356} fontSize="7.5" fontWeight="600"
          fill="#94a3b8" fontFamily="system-ui,sans-serif" letterSpacing="0.4">
          {lbl}
        </text>
      ))}

      {/* Table rows */}
      {[
        { y: 377, guest: 'Leandro Pollard', room: 'Room 875', ci: '7/2/2028',  co: '7/10/2028', amt: 'Rs 771',   status: 'Cancelled',  sc: '#ef4444', sb: '#fee2e2' },
        { y: 397, guest: 'Leandro Pollard', room: 'Room 7',   ci: '7/2/2028',  co: '7/10/2028', amt: 'Rs 1,800', status: 'Checked-out', sc: '#8b5cf6', sb: '#ede9fe' },
        { y: 417, guest: 'Saifullah Khan',  room: 'Room 206', ci: '7/2/2028',  co: '7/9/2028',  amt: 'Rs 722',   status: 'Confirmed',  sc: '#22c55e', sb: '#dcfce7' },
        { y: 437, guest: 'Rhonda Clayton',  room: 'Room 875', ci: '6/20/2028', co: '6/28/2028', amt: 'Rs 771',   status: 'Confirmed',  sc: '#22c55e', sb: '#dcfce7' },
      ].map(({ y, guest, room, ci, co, amt, status, sc, sb }) => (
        <g key={y}>
          <line x1="164" y1={y - 10} x2="708" y2={y - 10} stroke="#f8fafc" strokeWidth="1" />
          <text x="178" y={y} fontSize="9" fill="#374151" fontFamily="system-ui,sans-serif">{guest}</text>
          <text x="304" y={y} fontSize="9" fill="#374151" fontFamily="system-ui,sans-serif">{room}</text>
          <text x="388" y={y} fontSize="9" fill="#6b7280" fontFamily="system-ui,sans-serif">{ci}</text>
          <text x="464" y={y} fontSize="9" fill="#6b7280" fontFamily="system-ui,sans-serif">{co}</text>
          <text x="546" y={y} fontSize="9" fontWeight="600" fill="#374151" fontFamily="system-ui,sans-serif">{amt}</text>
          <rect x="618" y={y - 11} width={status === 'Checked-out' ? 64 : 54} height="14" rx="7" fill={sb} />
          <text x={status === 'Checked-out' ? 650 : 645} y={y} textAnchor="middle"
            fontSize="8" fill={sc} fontFamily="system-ui,sans-serif">{status}</text>
        </g>
      ))}
    </svg>
  )
}
