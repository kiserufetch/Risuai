// Design tokens of the mobile chat that CSS cannot compute on its own.
// Everything else is derived from --risu-theme-* in src/lib/MobileChat/mobileChat.css.

export type OnAccent = '#ffffff' | '#111111'
export type SchemeType = 'light' | 'dark'

const HEX_COLOR = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export function parseHexColor(value: string): [number, number, number] | null {
    const match = HEX_COLOR.exec((value ?? '').trim())
    if (!match) {
        return null
    }
    let hex = match[1]
    if (hex.length === 3) {
        hex = hex.split('').map((c) => c + c).join('')
    }
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}

export function relativeLuminance([r, g, b]: [number, number, number]): number {
    const channel = (value: number) => {
        const s = value / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: number, b: number): number {
    const lighter = Math.max(a, b)
    const darker = Math.min(a, b)
    return (lighter + 0.05) / (darker + 0.05)
}

const WHITE_LUMINANCE = 1
const INK_LUMINANCE = relativeLuminance([0x11, 0x11, 0x11])

/** Foreground for icons and text drawn on the scheme accent (borderc). */
export function pickOnAccent(accent: string): OnAccent {
    const rgb = parseHexColor(accent)
    if (!rgb) {
        return '#ffffff'
    }
    const luminance = relativeLuminance(rgb)
    return contrastRatio(INK_LUMINANCE, luminance) > contrastRatio(WHITE_LUMINANCE, luminance) ? '#111111' : '#ffffff'
}

export function applySchemeTokens(element: HTMLElement, scheme: { borderc: string; type: SchemeType }): void {
    element.style.setProperty('--mc-on-accent', pickOnAccent(scheme.borderc))
    element.dataset.scheme = scheme.type
}
