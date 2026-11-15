export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <div className="sunset-gradient flex shrink-0 items-center justify-center rounded-full font-semibold text-bg"
      style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}
