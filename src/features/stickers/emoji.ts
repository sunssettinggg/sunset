export interface EmojiGroup { id: string; title: string; items: string[] }

const list = (s: string) => s.split(/\s+/).filter(Boolean)

export const EMOJI_GROUPS: EmojiGroup[] = [
  { id: 'smileys', title: 'Смайлы', items: list('😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😙 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🤠 🥳 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👹 👺 👻 👽 👾 🤖') },
  { id: 'people', title: 'Жесты и люди', items: list('👋 🤚 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🧠 👀 👅 👄 👶 🧒 👦 👧 🧑 👨 👩 🧔 👴 👵 🙅 🙆 💁 🙋 🙇 🤦 🤷 💃 🕺 🏃 🚶') },
  { id: 'hearts', title: 'Сердца и символы', items: list('❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 💋 💯 💢 💥 💫 💦 💨 💬 💭 💤 ✨ 🌟 ⭐ 🔥 ⚡ 🌈 ☀️ ☁️ ❄️ 🌙') },
  { id: 'animals', title: 'Животные и природа', items: list('🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐠 🐟 🐬 🐳 🦈 🐊 🐅 🐆 🦓 🐘 🦒 🐪 🐕 🐈 🐇 🌵 🎄 🌲 🌳 🌴 🌱 🌿 🍀 🌸 🌹 🌺 🌻 🌼 🍁 🍂') },
  { id: 'food', title: 'Еда и напитки', items: list('🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥕 🌽 🥔 🍞 🥐 🧀 🍳 🥞 🥓 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🍝 🍜 🍲 🍣 🍱 🍤 🍙 🍚 🍦 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 🍿 ☕ 🍵 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🥤') },
  { id: 'activity', title: 'Активности', items: list('⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉 🎱 🏓 🏸 🥊 🎯 ⛳ 🎣 🎮 🎲 🧩 🎭 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🎻 🏆 🥇 🥈 🥉 🏅 🎉 🎊 🎁 🎈') },
  { id: 'travel', title: 'Путешествия', items: list('🚗 🚕 🚌 🚓 🚑 🚒 🚚 🚜 🏍️ 🚲 ✈️ 🚀 🛸 🚁 ⛵ 🚤 🚢 🚂 🚇 🏠 🏢 🏰 🗼 🗽 ⛪ 🌋 🏝️ 🏖️ 🌅 🌄 🌃 🌉') },
  { id: 'objects', title: 'Предметы', items: list('⌚ 📱 💻 ⌨️ 🖥️ 💽 📷 📹 🎥 📺 📻 ⏰ 🔋 🔌 💡 🔦 💰 💳 💎 🔧 🔨 ⚙️ 💣 🔪 🛡️ 🔮 💊 💉 🔬 🔭 📡 🧲 📦 ✉️ 📧 📝 📎 📌 ✂️ 🔒 🔓 🔑 🚪 🛏️ 🛋️ 🚽 🚿 🛁 🧼 🧻') },
  { id: 'symbols', title: 'Знаки', items: list('✅ ❌ ❓ ❗ ‼️ ⚠️ 🚫 ⛔ 🔞 ♻️ ➕ ➖ ✖️ ➗ 💲 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🔶 🔷 ▶️ ⏸️ ⏹️ ⏩ ⏪ 🔀 🔁 🔄 ➡️ ⬅️ ⬆️ ⬇️ 🔔 🔕 🎵 🎶 ♾️ 🆗 🆒 🆕 🆓 🆘') },
]

const RECENT_KEY = 'sunset.emoji.recent'

export function getRecentEmoji(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 24) : []
  } catch { return [] }
}

export function pushRecentEmoji(e: string): string[] {
  const next = [e, ...getRecentEmoji().filter((x) => x !== e)].slice(0, 24)
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* необязательно */ }
  return next
}
