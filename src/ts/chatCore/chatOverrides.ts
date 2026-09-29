import type { Chat } from '../storage/database.svelte'
import { DBState } from '../stores.svelte'

// Per-chat generation overrides (mockup "Настройки этого чата"): values that replace the
// preset for one dialog. They are swapped into the settings for the duration of a
// generation and put back afterwards, so every provider and code path sees them.

export interface ChatGenOverrides {
    enabled: boolean
    /** Answer length in tokens. */
    maxResponse?: number
    /** Settings scale: 0..200 for 0.00..2.00. */
    temperature?: number
    topP?: number
    /** OpenRouter reasoning: off, or effort low / high. */
    reasoning?: 'off' | 'low' | 'high'
    /** Model id: the OpenRouter model when the main model is OpenRouter, the main model otherwise. */
    model?: string
}

type ChatWithOverrides = Chat & { genOverrides?: ChatGenOverrides }

export function getOverrides(chat: Chat | undefined): ChatGenOverrides | undefined {
    return (chat as ChatWithOverrides | undefined)?.genOverrides
}

export function ensureOverrides(chat: Chat): ChatGenOverrides {
    const c = chat as ChatWithOverrides
    c.genOverrides ??= { enabled: false }
    return c.genOverrides
}

/** Temperature the next reply will use, on the 0..2 scale. */
export function effectiveTemperature(chat: Chat | undefined): number {
    const o = getOverrides(chat)
    const raw = o?.enabled && o.temperature !== undefined ? o.temperature : DBState.db.temperature
    return raw === -1000 ? NaN : raw / 100
}

/** Applies the chat's overrides to the settings; returns the function that undoes them. */
export function applyChatOverrides(chat: Chat | undefined): () => void {
    const o = getOverrides(chat)
    if (!o?.enabled) return () => {}
    const db = DBState.db
    const undo: (() => void)[] = []
    const swap = <T>(get: () => T, set: (v: T) => void, value: T | undefined) => {
        if (value === undefined) return
        const before = get()
        set(value)
        // Put back only if nobody changed the setting while the reply was generating.
        undo.push(() => { if (get() === value) set(before) })
    }
    swap(() => db.maxResponse, (v) => { db.maxResponse = v }, o.maxResponse)
    swap(() => db.temperature, (v) => { db.temperature = v }, o.temperature)
    swap(() => db.top_p, (v) => { db.top_p = v }, o.topP)
    if (o.model) {
        if (db.aiModel === 'openrouter') swap(() => db.openrouterRequestModel, (v) => { db.openrouterRequestModel = v }, o.model)
        else swap(() => db.aiModel, (v) => { db.aiModel = v }, o.model)
    }
    if (o.reasoning && db.openrouterExtras) {
        const x = db.openrouterExtras
        swap(() => x.reasoningMode, (v) => { x.reasoningMode = v }, o.reasoning === 'off' ? 'off' : 'effort')
        if (o.reasoning !== 'off') swap(() => x.reasoningEffort, (v) => { x.reasoningEffort = v }, o.reasoning)
    }
    return () => { for (const step of undo.reverse()) step() }
}
