// Composer drafts kept per chat for the session (spec §10.15): switching chats,
// rerolling or continuing never wipes what the user was typing.

export interface ComposerDraft {
    text: string
    attachments: string[]
}

// A plain map of reactive drafts: creating one lazily from inside a $derived is safe
// because the map itself is not tracked state.
const drafts = new Map<string, ComposerDraft>()

export function getDraft(key: string): ComposerDraft {
    let draft = drafts.get(key)
    if (!draft) {
        const created = $state<ComposerDraft>({ text: '', attachments: [] })
        draft = created
        drafts.set(key, draft)
    }
    return draft
}

export function clearDraft(key: string): void {
    const draft = getDraft(key)
    draft.text = ''
    draft.attachments = []
}
