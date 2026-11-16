interface Props { username: string; handles: string[]; muted?: boolean }

export default function UsernameLine({ username, handles, muted = false }: Props) {
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${muted ? 'text-muted' : ''}`}>
      <span>@{username}</span>
      {handles.map((h) => (
        <span key={h} className="rounded-full bg-accent/15 px-2 py-0.5 text-[0.85em] text-accent">@{h}</span>
      ))}
    </div>
  )
}
