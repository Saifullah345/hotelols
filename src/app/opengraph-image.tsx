import { readFile } from 'fs/promises'
import path from 'path'
import { ImageResponse } from 'next/og'

export const alt = 'BookQayam — Every trip deserves a great stay.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const font = (file: string) => readFile(path.join(process.cwd(), 'public', 'fonts', file))

export default async function OpengraphImage() {
  const [interRegular, interBlack] = await Promise.all([
    font('Inter-Regular.ttf'),
    font('Inter-Black.ttf'),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '68px 80px',
          fontFamily: 'Inter',
          // Matches the landing hero: indigo-950 → indigo-900 → indigo-800
          backgroundColor: '#1e1b4b',
          backgroundImage:
            'radial-gradient(circle at 82% 8%, rgba(99,102,241,0.45) 0%, rgba(99,102,241,0) 55%),' +
            'radial-gradient(circle at 6% 96%, rgba(168,85,247,0.38) 0%, rgba(168,85,247,0) 52%),' +
            'linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #3730a3 100%)',
        }}
      >
        {/* Logo lockup */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <svg width="56" height="56" viewBox="0 0 40 40" fill="none">
            <line x1="10" y1="6" x2="10" y2="34" stroke="white" strokeWidth="4" strokeLinecap="round" />
            <path
              d="M 10 6 C 28 6 28 20 10 20 C 30 20 30 34 10 34"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <line x1="26" y1="31" x2="33" y2="37" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
          </svg>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 900, letterSpacing: '-0.02em', marginLeft: 6 }}>
            <span style={{ color: '#ffffff' }}>Book</span>
            <span style={{ color: '#a5b4fc' }}>Qayam</span>
          </div>
        </div>

        {/* Headline block */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(255,255,255,0.10)',
              color: '#c7d2fe',
              fontSize: 22,
              fontWeight: 900,
              padding: '10px 20px',
              borderRadius: 999,
              marginBottom: 26,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#fbbf24" style={{ marginRight: 10 }}>
              <path d="M12 2l2.9 6.26 6.85.72-5.1 4.6 1.44 6.72L12 16.9 5.91 20.3l1.44-6.72-5.1-4.6 6.85-.72L12 2z" />
            </svg>
            Trusted by guests across Pakistan
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 78,
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              color: '#ffffff',
            }}
          >
            <span>Every trip deserves</span>
            <span style={{ color: '#fbbf24' }}>a great stay.</span>
          </div>

          <div style={{ display: 'flex', fontSize: 30, color: '#c7d2fe', marginTop: 24, maxWidth: 880 }}>
            Browse verified hotels, pick your datesand book in minutes.
          </div>
        </div>

        {/* Footer strip */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, color: '#a5b4fc' }}>
            <span>Verified hotels</span>
            <span style={{ margin: '0 14px', color: 'rgba(165,180,252,0.45)' }}>•</span>
            <span>Instant booking</span>
            <span style={{ margin: '0 14px', color: 'rgba(165,180,252,0.45)' }}>•</span>
            <span>No sign-up to explore</span>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 24,
              fontWeight: 900,
              color: '#1e1b4b',
              backgroundColor: '#ffffff',
              padding: '12px 26px',
              borderRadius: 14,
            }}
          >
            bookqayam.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Inter', data: interRegular, weight: 400, style: 'normal' },
        { name: 'Inter', data: interBlack, weight: 900, style: 'normal' },
      ],
    }
  )
}
