// Тёмный или светлый текст для фона заданного цвета (#rrggbb).
export function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 }
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return l > 0.4 ? '#17171c' : '#ffffff'
}
