interface LogoProps {
  size?: number
  withWordmark?: boolean
  dark?: boolean
  className?: string
}

export default function Logo({ size = 36, withWordmark = true, dark = false, className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="flex items-center justify-center rounded-[28%] bg-electric-blue shrink-0"
        style={{ width: size, height: size }}
      >
        <span
          className="font-extrabold text-zest-lime leading-none"
          style={{ fontSize: size * 0.58 }}
        >
          F
        </span>
      </div>
      {withWordmark && (
        <span
          className={`font-extrabold tracking-tight ${dark ? 'text-white' : 'text-ink-navy'}`}
          style={{ fontSize: size * 0.62 }}
        >
          Flowest
        </span>
      )}
    </div>
  )
}
