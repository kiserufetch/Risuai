// System "back" closes the topmost overlay of the mobile chat (spec §4.3): every open
// sheet or editor pushes one history entry. Closing an overlay any other way pops its
// entry again, and the popstate caused by that is ignored.

interface Entry {
    close: () => void
    closedByBack: boolean
}

const stack: Entry[] = []
let ignoredPops = 0
let listening = false

function onPopState() {
    if (ignoredPops > 0) {
        ignoredPops -= 1
        return
    }
    const top = stack.pop()
    if (top) {
        top.closedByBack = true
        top.close()
    }
}

/** Registers an open overlay; the returned function must run when it closes. */
export function pushBackHandler(close: () => void): () => void {
    if (!listening) {
        window.addEventListener('popstate', onPopState)
        listening = true
    }
    const entry: Entry = { close, closedByBack: false }
    stack.push(entry)
    try {
        history.pushState({ risuMobileChatOverlay: true }, '')
    } catch {
        // history unavailable (sandboxed frame): back simply won't close the overlay
    }
    return () => {
        const index = stack.indexOf(entry)
        if (index !== -1) {
            stack.splice(index, 1)
        }
        if (!entry.closedByBack) {
            ignoredPops += 1
            history.back()
        }
    }
}
