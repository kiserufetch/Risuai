import { get } from 'svelte/store'
import { defaultOpenRouterExtras, type OpenRouterExtras } from '../../model/openrouterExtrasDefaults'
import { getOpenRouterMeta, supportsReasoning } from '../../model/openrouterMeta.svelte'
import type { MessageGenerationInfo } from '../../storage/database.svelte'
import { DBState, selectedCharID } from '../../stores.svelte'

// Request-side OpenRouter extras: reasoning control with a thinking budget kept apart from
// the answer length, provider routing and privacy, model fallbacks, web search, dropping
// samplers the model does not take. Plus per-reply usage recorded on the message.

export function openRouterExtras(): OpenRouterExtras {
    return { ...defaultOpenRouterExtras(), ...(DBState.db.openrouterExtras ?? {}) }
}

/** Whether a thinking reserve applies to the main chat request right now. */
function reasoningActive(x: OpenRouterExtras): boolean {
    if (DBState.db.aiModel !== 'openrouter' || x.reasoningMode === 'off') return false
    const meta = getOpenRouterMeta()
    return meta ? supportsReasoning(meta) : x.reasoningMode !== 'auto'
}

/** Tokens reserved for thinking on top of the answer (also kept out of the prompt budget). */
export function openRouterReasoningReserve(): number {
    const x = openRouterExtras()
    return reasoningActive(x) ? Math.max(0, x.reasoningBudget) : 0
}

const SAMPLERS = ['temperature', 'top_p', 'top_k', 'min_p', 'top_a', 'repetition_penalty', 'frequency_penalty', 'presence_penalty', 'seed', 'logit_bias']

export function applyOpenRouterExtras(body: any, mode: string | undefined): any {
    const x = openRouterExtras()
    const main = !mode || mode === 'model'
    const meta = getOpenRouterMeta(body.model)

    // Samplers the model does not accept: with "require parameters" they would rule out
    // every provider, so they are never sent.
    if (meta?.supported.length) {
        for (const key of SAMPLERS) {
            if (key in body && !meta.supported.includes(key)) delete body[key]
        }
    }

    if (main) {
        const reasoning: Record<string, unknown> = {}
        if (x.reasoningMode === 'off') reasoning.enabled = false
        else if (x.reasoningMode === 'effort') reasoning.effort = x.reasoningEffort
        else if (x.reasoningMode === 'budget') reasoning.max_tokens = x.reasoningBudget
        if (x.hideReasoning && x.reasoningMode !== 'off') reasoning.exclude = true
        if (Object.keys(reasoning).length && (!meta || supportsReasoning(meta))) body.reasoning = reasoning

        const reserve = openRouterReasoningReserve()
        if (reserve && typeof body.max_tokens === 'number') body.max_tokens += reserve

        const fallbacks = x.fallbackModels.filter(Boolean)
        if (fallbacks.length) {
            body.models = [body.model, ...fallbacks]
            delete body.route
        }
        if (x.webSearch) body.plugins = [...(body.plugins ?? []), { id: 'web', max_results: x.webMaxResults }]
    }

    const provider: Record<string, unknown> = { ...(body.provider ?? {}) }
    if (!x.allowFallbacks) provider.allow_fallbacks = false
    if (x.sort) provider.sort = x.sort
    if (x.requireParameters) provider.require_parameters = true
    if (x.denyDataCollection) provider.data_collection = 'deny'
    if (x.zdr) provider.zdr = true
    if (x.quantizations.length) provider.quantizations = x.quantizations
    if (x.maxPricePrompt !== null || x.maxPriceCompletion !== null) {
        provider.max_price = {
            ...(x.maxPricePrompt !== null ? { prompt: x.maxPricePrompt } : {}),
            ...(x.maxPriceCompletion !== null ? { completion: x.maxPriceCompletion } : {}),
        }
    }
    if (Object.keys(provider).length) body.provider = provider
    return body
}

type Usage = NonNullable<MessageGenerationInfo['openrouter']>

export function parseOpenRouterUsage(raw: any, finishReason?: string): Usage | null {
    if (!raw && !finishReason) return null
    return {
        cost: typeof raw?.cost === 'number' ? raw.cost : undefined,
        promptTokens: raw?.prompt_tokens,
        completionTokens: raw?.completion_tokens,
        reasoningTokens: raw?.completion_tokens_details?.reasoning_tokens ?? raw?.reasoning_tokens,
        cachedTokens: raw?.prompt_tokens_details?.cached_tokens ?? raw?.cached_tokens,
        finishReason,
    }
}

/**
 * Attaches usage to the reply with this generation id. The message may not exist yet
 * (non-streaming requests), so a few late attempts follow.
 */
export function recordOpenRouterUsage(chatId: string | undefined, usage: Usage | null, attempt = 0) {
    if (!chatId || !usage) return
    const char = DBState.db.characters[get(selectedCharID)]
    const messages = char?.chats?.[char.chatPage]?.message ?? []
    for (let i = messages.length - 1; i >= 0 && i >= messages.length - 5; i--) {
        const message = messages[i]
        if (message.chatId === chatId) {
            message.generationInfo = { ...(message.generationInfo ?? {}), openrouter: usage }
            // The send flow may still replace the message object once; re-apply after it.
            if (attempt >= 0) setTimeout(() => {
                const again = (DBState.db.characters[get(selectedCharID)]?.chats?.[char.chatPage]?.message ?? []).find((m) => m.chatId === chatId)
                if (again && !again.generationInfo?.openrouter) again.generationInfo = { ...(again.generationInfo ?? {}), openrouter: usage }
            }, 2500)
            return
        }
    }
    if (attempt < 4) setTimeout(() => recordOpenRouterUsage(chatId, usage, attempt + 1), 400 * (attempt + 1))
}
