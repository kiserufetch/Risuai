import { language } from 'src/lang'
import type { PromptItem } from 'src/ts/process/prompt'

// Prompt template block kinds: label and accent color for the list and the editor.

export const PROMPT_TYPES = ['plain', 'jailbreak', 'chat', 'persona', 'description', 'authornote', 'lorebook', 'memory', 'postEverything', 'chatML', 'cache', 'cot'] as const

const COLORS: Record<string, string> = {
    plain: '#6366f1', jailbreak: '#ef4444', chat: '#a855f7', persona: '#0ea5e9', description: '#22c55e', authornote: '#ec4899',
    lorebook: '#f59e0b', memory: '#14b8a6', postEverything: '#64748b', chatML: '#94a3b8', cache: '#84cc16', cot: '#f97316',
}

export function promptTypeColor(type: string): string {
    return COLORS[type] ?? '#64748b'
}

export function promptTypeLabel(type: string): string {
    const f = language.formating
    const labels: Record<string, string> = {
        plain: f.plain, jailbreak: f.jailbreak, chat: language.Chat, persona: f.personaPrompt, description: f.description,
        authornote: f.authorNote, lorebook: f.lorebook, memory: f.memory, postEverything: f.postEverything, chatML: 'ChatML',
        cache: language.cachePoint, cot: language.cot,
    }
    return labels[type] ?? type
}

export function promptItemName(item: PromptItem): string {
    return item.name || promptTypeLabel(item.type)
}

export function roleLabel(role: string | undefined): string {
    if (role === 'user') return language.user
    if (role === 'bot' || role === 'assistant') return language.character
    if (role === 'all') return language.all
    return language.systemPrompt
}

/** Short second line for a block row. */
export function promptItemMeta(item: PromptItem): string {
    const t = language.mobileBot
    if (item.type === 'chat') {
        if (item.rangeStart === -1000) return t.chatAll
        return t.chatRange.replace('{0}', String(item.rangeStart)).replace('{1}', item.rangeEnd === 'end' ? t.chatEnd : String(item.rangeEnd))
    }
    if (item.type === 'cache') return `${t.depth} ${item.depth} · ${roleLabel(item.role)}`
    if (item.type === 'plain' || item.type === 'jailbreak' || item.type === 'cot') {
        const special = item.type2 === 'main' ? ` · ${language.mainPrompt}` : item.type2 === 'globalNote' ? ` · ${language.globalNote}` : ''
        return `${roleLabel(item.role)}${special}`
    }
    if ('role2' in item && item.role2) return roleLabel(item.role2)
    return ''
}
