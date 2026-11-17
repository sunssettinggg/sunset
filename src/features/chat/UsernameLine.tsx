import { useColors } from '../premium/colors'

interface Props { username: string; handles: string[]; muted?: boolean; userId?: string | null; onHandleClick?: (handle: string) => void }

export default function UsernameLine({ username, handles, muted = false, userId, onHandleClick }: Props) {
  const color = useColors(userId)?.username ?? undefined
  const chip = 'rounded-full bg-accent/15 px-2 py-0.5 text-[0.85em] text-accent'
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${muted ? 'text-muted' : ''}`}>
      <span style={color ? { color } : undefined}>@{username}</span>
      {handles.map((h) => onHandleClick ? (
        <button key={h} type="button" onClick={() => onHandleClick(h)} title="О юзернейме"
          className={`${chip} transition hover:brightness-125`}>@{h}</button>
      ) : (
        <span key={h} className={chip}>@{h}</span>
      ))}
    </div>
  )
}
