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
        <linearGradient id="sq-logo" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <path
        d="M 9 15 C 9 6 31 6 31 15 C 31 20 9 20 9 25 C 9 34 31 34 31 25"
        stroke="url(#sq-logo)" strokeWidth="4.5" strokeLinecap="round" fill="none"
      />
      <line x1="27" y1="32" x2="36" y2="39" stroke="url(#sq-logo)" strokeWidth="4.5" strokeLinecap="round"/>
    </svg>
  )
}

function LogoMarkOnDark({ svgSize }: { svgSize: number }) {
  return (
    <svg width={svgSize} height={svgSize} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M 9 15 C 9 6 31 6 31 15 C 31 20 9 20 9 25 C 9 34 31 34 31 25"
        stroke="white" strokeWidth="4.5" strokeLinecap="round" fill="none"
      />
      <line x1="27" y1="32" x2="36" y2="39" stroke="white" strokeWidth="4.5" strokeLinecap="round"/>
    </svg>
  )
}

export default function Logo({ size = 'md', href = '/', className = '' }: LogoProps) {
  const { svg, text } = sizes[size]

  const inner = (
    <span className={`flex items-center gap-2.5 flex-shrink-0 ${className}`}>
      <LogoMark svgSize={svg} />
      <span className={`${text} font-black tracking-tight text-gray-900`}>
        Stay<span className="text-indigo-600">Qayam</span>
      </span>
    </span>
  )

  return href ? <Link href={href}>{inner}</Link> : inner
}

export { LogoMark, LogoMarkOnDark }
