interface Props { size?: number; className?: string }

export default function VerifiedBadge({ size = 14, className = '' }: Props) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label="Подтверждённый аккаунт"
      className={'inline-block shrink-0 ' + className}>
      <title>Этот аккаунт подтверждён как официальный представителями Sunset.</title>
      <circle cx="12" cy="12" r="11" fill="#34d399" />
      <path d="M7 12.6l3.2 3.2L17 9" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
