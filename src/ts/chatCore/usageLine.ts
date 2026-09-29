import { language } from 'src/lang'
import type { MessageGenerationInfo } from '../storage/database.svelte'

// One-line summary of what OpenRouter reported for a reply: cost and token split.

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n))

export function usageLine(usage: MessageGenerationInfo['openrouter'] | undefined): string {
    if (!usage) return ''
    const t = language.mobileChat
    const parts: string[] = []
    if (typeof usage.cost === 'number') parts.push(usage.cost > 0 && usage.cost < 0.0001 ? '<$0.0001' : `$${usage.cost.toFixed(4)}`)
    if (usage.promptTokens) parts.push(`${t.usageIn} ${compact(usage.promptTokens)}`)
    const reasoning = usage.reasoningTokens ?? 0
    if (reasoning) parts.push(`${t.usageThinking} ${compact(reasoning)}`)
    if (usage.completionTokens !== undefined) parts.push(`${t.usageAnswer} ${compact(Math.max(0, usage.completionTokens - reasoning))}`)
    if (usage.finishReason === 'length') parts.push(t.usageCut)
    return parts.join(' · ')
}
