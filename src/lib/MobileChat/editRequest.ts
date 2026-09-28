// What the full-screen editor edits (spec §5.5): the message text, or the cached
// LLM translation of a message.
export type EditRequest =
    | { kind: 'message'; idx: number }
    | { kind: 'translation'; idx: number; key: string; text: string; onsaved: () => void }
