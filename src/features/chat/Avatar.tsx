interface Props { name: string; url?: string | null; size?: number }

export default function Avatar({ name, url, size = 40 }: Props) {
  if (url) {
    return <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <div className="sunset-gradient flex shrink-0 items-center justify-center rounded-full font-semibold text-on-accent"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}
