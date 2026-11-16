import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Pause, Play } from 'lucide-react'

function formatSec(s: number): string {
  if (!Number.isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface Props {
  src: string
  mine: boolean
}

export default function VoiceMessage({ src, mine }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = new Audio(src)
    audio.preload = 'metadata'
    audioRef.current = audio

    const onMeta = () => {
      if (Number.isFinite(audio.duration)) setDuration(audio.duration)
    }
    const onTime = () => setCurrent(audio.currentTime)
    const onEnded = () => { setPlaying(false); setCurrent(0) }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)

    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('durationchange', onMeta)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('durationchange', onMeta)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audioRef.current = null
    }
  }, [src])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play().catch(() => undefined)
    else audio.pause()
  }

  function seek(e: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const t = Number(e.target.value)
    audio.currentTime = t
    setCurrent(t)
  }

  const total = duration > 0 ? duration : 0
  const progress = total > 0 ? current / total : 0
  const btn = mine
    ? 'bg-on-accent/20 text-on-accent hover:bg-on-accent/30'
    : 'bg-accent/20 text-accent hover:bg-accent/30'
  const track = mine ? 'bg-on-accent/25' : 'bg-text/15'
  const fill = mine ? 'bg-on-accent' : 'bg-accent'

  return (
    <div className="mb-1 flex min-w-[200px] max-w-[280px] items-center gap-2 py-0.5" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={toggle} title={playing ? 'Пауза' : 'Слушать'}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${btn}`}>
        {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full">
          <div className={`absolute inset-0 ${track}`} />
          <div className={`absolute inset-y-0 left-0 ${fill}`} style={{ width: `${progress * 100}%` }} />
          <input type="range" min={0} max={total || 1} step={0.01} value={current}
            onChange={seek} disabled={!total}
            className="absolute inset-0 w-full cursor-pointer opacity-0 disabled:cursor-default" />
        </div>
        <div className={`mt-1 flex justify-between text-[10px] tabular-nums ${mine ? 'text-on-accent/70' : 'text-muted'}`}>
          <span>{formatSec(current)}</span>
          <span>{formatSec(total)}</span>
        </div>
      </div>
    </div>
  )
}
