import type { CSSProperties } from 'react'
import type { Gift } from './gifts'
import UniqueArt from './UniqueArt'

// Узор снежинок для обёртки (золото на фиолетовом).
const FLAKE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='-22 -22 44 44'%3E%3Cg stroke='%23f5c76a' stroke-width='1.6' stroke-linecap='round' fill='none'%3E%3Cpath d='M0-9V9M-8-4.5 8 4.5M-8 4.5 8-4.5'/%3E%3Cpath d='M-2.5-7 0-4.5 2.5-7M-2.5 7 0 4.5 2.5 7'/%3E%3C/g%3E%3C/svg%3E\")"

const CSS = `
.sg-root{container-type:inline-size;position:relative;width:100%;aspect-ratio:1;overflow:hidden;border-radius:.75rem;
  background:linear-gradient(180deg,#1c1740 0%,#3a2a6b 45%,#7a3f7e 72%,#e0885a 100%)}
.sg-scene{position:absolute;inset:0;font-size:calc(100cqw / 22)}
.sg-sky{position:absolute;left:50%;top:5%;width:20em;height:12em;transform:translateX(-50%);filter:blur(.05em);animation:sg-breathe 5s ease-in-out infinite}
.sg-sky i{position:absolute;border-radius:50%;background:radial-gradient(circle at 50% 78%,#ffc98f 0%,#e98aa0 38%,#9a5fc4 72%,#5d3d9e 100%);opacity:.95}
.sg-sun{position:absolute;left:50%;top:44%;width:7em;height:7em;transform:translate(-50%,-50%);border-radius:50%;
  background:radial-gradient(circle,#fff3c4 0%,#ffc36b 40%,rgba(255,150,100,0) 72%);animation:sg-breathe 4s ease-in-out infinite}
.sg-stage{position:absolute;left:50%;top:68%;width:0;height:0;perspective:60em}
.sg-spin{position:absolute;left:0;top:0;transform-style:preserve-3d;animation:sg-spin 14s linear infinite}
.sg-float{position:absolute;left:0;top:0;transform-style:preserve-3d;animation:sg-float 4s ease-in-out infinite}
.sg-tilt{transform-style:preserve-3d;transform:rotateX(-20deg)}
.sg-f{position:absolute;backface-visibility:hidden;left:-4em;top:-4em;width:8em;height:8em;
  background:linear-gradient(90deg,transparent 41%,#f3c565 41%,#fbe3a0 50%,#e6aa45 59%,transparent 59%),${FLAKE},linear-gradient(160deg,#7b4fe0,#3d1f95);
  background-size:100% 100%,2.6em 2.6em,100% 100%}
.sg-f.ribbon-h{background:linear-gradient(0deg,transparent 41%,#f3c565 41%,#fbe3a0 50%,#e6aa45 59%,transparent 59%),linear-gradient(90deg,transparent 41%,#f3c565 41%,#fbe3a0 50%,#e6aa45 59%,transparent 59%),${FLAKE},linear-gradient(160deg,#7b4fe0,#3d1f95);background-size:100% 100%,100% 100%,2.6em 2.6em,100% 100%}
.sg-f.front{transform:translateZ(4em)}
.sg-f.back{transform:rotateY(180deg) translateZ(4em);filter:brightness(.7)}
.sg-f.right{transform:rotateY(90deg) translateZ(4em);filter:brightness(.82)}
.sg-f.left{transform:rotateY(-90deg) translateZ(4em);filter:brightness(.62)}
.sg-f.bottom{transform:rotateX(-90deg) translateZ(4em);background:#1b0f4a}
.sg-f.glow{transform:rotateX(90deg) translateZ(3.4em);background:radial-gradient(circle,#fff7cf 0%,#ffcf7a 45%,#ff9a6b 100%);box-shadow:0 0 3em 1em rgba(255,200,120,.8)}
.sg-rim{position:absolute;left:-4.2em;top:-4.2em;width:8.4em;height:8.4em;transform:rotateX(90deg) translateZ(4em);border:.45em solid #7b4fe0;box-sizing:border-box;border-radius:.2em;
  background:transparent;box-shadow:inset 0 0 .6em rgba(0,0,0,.4)}
.sg-lid{position:absolute;left:0;top:0;transform-style:preserve-3d;transform:translate(6.3em,-2.2em) rotateZ(38deg) scale(.95)}
.sg-l{position:absolute;backface-visibility:hidden;left:-4.4em;top:-.9em;width:8.8em;height:1.8em;background:linear-gradient(90deg,transparent 41%,#f3c565 41%,#fbe3a0 50%,#e6aa45 59%,transparent 59%),${FLAKE},linear-gradient(160deg,#8a5cf0,#4a27aa);background-size:100% 100%,1.8em 1.8em,100% 100%}
.sg-l.front{transform:translateZ(4.4em)}
.sg-l.back{transform:rotateY(180deg) translateZ(4.4em);filter:brightness(.7)}
.sg-l.right{width:8.8em;transform:rotateY(90deg) translateZ(4.4em);filter:brightness(.82)}
.sg-l.left{width:8.8em;transform:rotateY(-90deg) translateZ(4.4em);filter:brightness(.62)}
.sg-l.top{height:8.8em;top:-4.4em;transform:rotateX(90deg) translateZ(.9em);background:linear-gradient(0deg,transparent 41%,#f3c565 41%,#fbe3a0 50%,#e6aa45 59%,transparent 59%),linear-gradient(90deg,transparent 41%,#f3c565 41%,#fbe3a0 50%,#e6aa45 59%,transparent 59%),linear-gradient(160deg,#9a6cff,#5a31c4);background-size:100% 100%}
.sg-l.under{height:8.8em;top:-4.4em;transform:rotateX(-90deg) translateZ(.9em);background:#2a1470}
.sg-shadow{position:absolute;left:-6em;top:5.2em;width:12em;height:2.6em;border-radius:50%;background:radial-gradient(ellipse,rgba(0,0,0,.45),transparent 70%);animation:sg-shadow 4s ease-in-out infinite}
.sg-lights{position:absolute;left:50%;top:68%;width:0;height:0}
.sg-lights s{position:absolute;left:0;top:0;width:.7em;height:.7em;border-radius:50%;background:#fff6c8;
  box-shadow:0 0 .7em .3em rgba(255,214,130,1);opacity:0;animation:sg-rise var(--t) linear infinite;animation-delay:var(--d)}
@keyframes sg-rise{0%{transform:translate(0,-3em) scale(.4);opacity:0}12%{opacity:1}55%{transform:translate(var(--x),-8.5em) scale(1)}100%{transform:translate(calc(var(--x)*-.6),-15em) scale(.5);opacity:0}}
@keyframes sg-spin{from{transform:rotateY(0)}to{transform:rotateY(360deg)}}
@keyframes sg-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-.8em)}}
@keyframes sg-shadow{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.86);opacity:.7}}
@keyframes sg-breathe{0%,100%{opacity:.88}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.sg-spin,.sg-float,.sg-sky,.sg-sun,.sg-lights s,.sg-shadow{animation:none}.sg-lights s{opacity:.9}}
`

const LIGHTS = [
  { x: -5, t: 5.5, d: 0 }, { x: 4, t: 6, d: -1 }, { x: -2, t: 5, d: -2 }, { x: 6, t: 6.5, d: -3 },
  { x: -7, t: 7, d: -4 }, { x: 1, t: 5.8, d: -2.5 }, { x: 8, t: 6.2, d: -0.5 }, { x: -4, t: 6.8, d: -3.5 },
  { x: 3, t: 7.2, d: -5 }, { x: -8, t: 5.6, d: -1.5 },
]

function SunsetGift() {
  return (
    <div className="sg-root" role="img" aria-label="Закатный новогодний подарок">
      <style>{CSS}</style>
      <div className="sg-scene">
        <div className="sg-sky">
          <i style={{ left: '3%', top: '30%', width: '8em', height: '5.5em' }} />
          <i style={{ left: '30%', top: '2%', width: '9em', height: '6em' }} />
          <i style={{ left: '58%', top: '28%', width: '8em', height: '5.5em' }} />
          <i style={{ left: '20%', top: '48%', width: '10em', height: '5.5em' }} />
        </div>
        <div className="sg-sun" />
        <div className="sg-lights">
          {LIGHTS.map((l, i) => (
            <s key={i} style={{ '--x': `${l.x}em`, '--t': `${l.t}s`, '--d': `${l.d}s` } as CSSProperties} />
          ))}
        </div>
        <div className="sg-stage">
          <div className="sg-shadow" />
          <div className="sg-float">
            <div className="sg-tilt">
              <div className="sg-spin">
                <div className="sg-f front ribbon-h" /><div className="sg-f back" /><div className="sg-f right" />
                <div className="sg-f left" /><div className="sg-f bottom" /><div className="sg-f glow" /><div className="sg-rim" />
                <div className="sg-lid">
                  <div className="sg-l front" /><div className="sg-l back" /><div className="sg-l right" /><div className="sg-l left" />
                  <div className="sg-l top" /><div className="sg-l under" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GiftArt({ gift }: { gift: Gift }) {
  if (gift.id === 'sunset_new_year') return <SunsetGift />
  if (gift.id === 'sunset_watch') return <UniqueArt model="classic" backdrop="sunset" symbol="star" label={gift.title} />
  if (gift.id === 'sunset_cigar') return <UniqueArt model="ruby" backdrop="cyber" symbol="flame" label={gift.title} />
  return <img src={gift.image_url} alt={gift.title} className="aspect-square w-full rounded-xl object-cover" />
}
