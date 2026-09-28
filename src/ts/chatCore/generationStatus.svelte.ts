import type { Unsubscriber } from 'svelte/store'
import { chatProcessStage } from 'src/ts/process/index.svelte'
import { alertStore, DBState } from 'src/ts/stores.svelte'

// UI-facing state of the running generation (spec §5.2, §6.6). While a generation
// started from the new chat runs, error alerts are captured and shown inline.

export interface CapturedError {
    msg: string
    submsg?: string
    stackTrace?: string
}

class GenerationStatus {
    running = $state(false)
    /** chatProcessStage: 1 prompt, 2 memory, 3 request/stream, 4 post-processing. */
    stage = $state(0)
    startedAt = $state(0)
    /** Character index the running generation belongs to; -1 when idle. */
    charIndex = $state(-1)
    error = $state<CapturedError | null>(null)
    autoMode = $state(false)
    autoReplyPending = $state(false)
}

export const generationStatus = new GenerationStatus()

let retryAction: (() => Promise<void>) | null = null
let unsubscribers: Unsubscriber[] = []

function stopListening(): void {
    for (const unsubscribe of unsubscribers) {
        unsubscribe()
    }
    unsubscribers = []
}

export function beginGeneration(options: { charIndex: number; retry: () => Promise<void> }): void {
    stopListening()
    retryAction = options.retry
    generationStatus.error = null
    generationStatus.running = true
    generationStatus.charIndex = options.charIndex
    generationStatus.startedAt = Date.now()
    unsubscribers.push(chatProcessStage.subscribe((stage) => {
        generationStatus.stage = stage
    }))
    if (DBState.db.inlayErrorResponse) {
        return
    }
    let initial = true
    unsubscribers.push(alertStore.subscribe((alert) => {
        if (initial || alert?.type !== 'error') {
            return
        }
        generationStatus.error = { msg: alert.msg, submsg: alert.submsg, stackTrace: alert.stackTrace }
        alertStore.set({ type: 'none', msg: '' })
    }))
    initial = false
}

export function endGeneration(): void {
    stopListening()
    generationStatus.running = false
    generationStatus.charIndex = -1
    generationStatus.stage = 0
}

export function showErrorDetails(): void {
    const error = generationStatus.error
    if (!error) {
        return
    }
    alertStore.set({ type: 'error', msg: error.msg, submsg: error.submsg, stackTrace: error.stackTrace })
}

export function dismissError(): void {
    generationStatus.error = null
}

export async function retryGeneration(): Promise<void> {
    const action = retryAction
    generationStatus.error = null
    if (action) {
        await action()
    }
}
