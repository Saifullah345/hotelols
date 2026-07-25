import Link from 'next/link'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
}

const sizes = {
  sm: { svg: 28, text: 'text-base', viewBox: '0 0 40 40' },
  md: { svg: 36, text: 'text-xl',  viewBox: '0 0 40 40' },
  lg: { svg: 44, text: 'text-2xl', viewBox: '0 0 40 40' },
}

function LogoMark({ svgSize }: { svgSize: number }) {
  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bq-logo" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      {/* B: vertical stroke + two bumps as one continuous path */}
      <line x1="10" y1="6" x2="10" y2="34" stroke="url(#bq-logo)" strokeWidth="4" strokeLinecap="round"/>
      <path d="M 10 6 C 28 6 28 20 10 20 C 30 20 30 34 10 34" stroke="url(#bq-logo)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      {/* Q tail */}
      <line x1="26" y1="31" x2="33" y2="37" stroke="url(#bq-logo)" strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  )
}

function LogoMarkOnDark({ svgSize }: { svgSize: number }) {
  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="10" y1="6" x2="10" y2="34" stroke="white" strokeWidth="4" strokeLinecap="round"/>
      <path d="M 10 6 C 28 6 28 20 10 20 C 30 20 30 34 10 34" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <line x1="26" y1="31" x2="33" y2="37" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  )
}

export default function Logo({ size = 'md', href = '/', className = '' }: LogoProps) {
  const { svg, text } = sizes[size]

  const inner = (
    <span className={`flex items-center gap-1 flex-shrink-0 ${className}`}>
      <LogoMark svgSize={svg} />
      <span className={`${text} font-black tracking-tight text-gray-900`}>
        Book<span className="text-indigo-600">Qayam</span>
      </span>
    </span>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}

export { LogoMark, LogoMarkOnDark }
