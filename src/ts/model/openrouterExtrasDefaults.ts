// OpenRouter controls added by the mobile rework (reasoning, routing, privacy). Kept
// dependency-free so the database module can seed defaults from it.

export interface OpenRouterExtras {
    reasoningMode: 'auto' | 'off' | 'effort' | 'budget'
    reasoningEffort: 'minimal' | 'low' | 'medium' | 'high' | 'max'
    /** Thinking tokens: the reasoning cap in 'budget' mode, a reserve on top of the answer otherwise. */
    reasoningBudget: number
    hideReasoning: boolean
    allowFallbacks: boolean
    sort: '' | 'price' | 'throughput' | 'latency'
    requireParameters: boolean
    denyDataCollection: boolean
    zdr: boolean
    quantizations: string[]
    /** USD per million tokens; null = no ceiling. */
    maxPricePrompt: number | null
    maxPriceCompletion: number | null
    fallbackModels: string[]
    webSearch: boolean
    webMaxResults: number
}

export function defaultOpenRouterExtras(): OpenRouterExtras {
    return {
        reasoningMode: 'auto',
        reasoningEffort: 'high',
        reasoningBudget: 4000,
        hideReasoning: false,
        allowFallbacks: true,
        sort: '',
        requireParameters: false,
        denyDataCollection: false,
        zdr: false,
        quantizations: [],
        maxPricePrompt: null,
        maxPriceCompletion: null,
        fallbackModels: [],
        webSearch: false,
        webMaxResults: 5,
    }
}
