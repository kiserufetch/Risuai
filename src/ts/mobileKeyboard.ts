/**
 * Phase 1 mobile foundation — on-screen (virtual) keyboard handling.
 *
 * Tracks the software keyboard via the VisualViewport API and publishes how much
 * vertical space it currently occupies as the `--kb-inset` CSS variable on the
 * <html> element. UI such as the chat input bar can then sit above the keyboard
 * with `padding-bottom: calc(var(--kb-inset) + var(--safe-bottom))`.
 *
 * This matters mostly on iOS Safari, where the keyboard does NOT resize the
 * layout viewport and does NOT fire a window `resize` event, and where
 * `position: fixed` is not honoured while the keyboard is open. On Chrome/Firefox
 * the `interactive-widget=resizes-content` viewport hint already reflows layout,
 * but keeping `--kb-inset` correct everywhere makes the input bar logic uniform.
 *
 * Safe to call once at startup; it is a no-op when VisualViewport is unavailable
 * (e.g. during SSR or on very old engines).
 */
let started = false
let boundViewport: VisualViewport | null = null
let boundUpdate: (() => void) | null = null

export function trackKeyboard(): void {
    if (started) return
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!vv) return
    started = true

    const root = document.documentElement
    const update = () => {
        // Portion of the layout viewport hidden by the keyboard (plus any visual
        // viewport offset), never negative.
        const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
        root.style.setProperty('--kb-inset', `${Math.round(inset)}px`)
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()

    boundViewport = vv
    boundUpdate = update
}

// Dev-only: detach the listeners on Vite HMR so they don't accumulate across
// hot reloads of this module (window.visualViewport survives the reload).
// No effect in production, where App is mounted once for the document lifetime.
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        if (boundViewport && boundUpdate) {
            boundViewport.removeEventListener('resize', boundUpdate)
            boundViewport.removeEventListener('scroll', boundUpdate)
        }
        started = false
        boundViewport = null
        boundUpdate = null
    })
}
