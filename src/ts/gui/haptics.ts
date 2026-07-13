/**
 * Lightweight haptic feedback for touch interactions (send, sheet open,
 * long-press, tab switch). Uses the Vibration API where available and is a
 * silent no-op elsewhere (iOS Safari does not expose navigator.vibrate).
 */
export function haptic(pattern: number | number[] = 8): void {
    try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(pattern)
        }
    } catch {
        // Vibration can throw in cross-origin iframes or restricted contexts.
    }
}
