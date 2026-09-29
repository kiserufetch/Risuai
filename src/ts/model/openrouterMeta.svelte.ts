import { DBState } from '../stores.svelte'

// OpenRouter catalog facts per model: real context, output cap, accepted parameters and
// input types. Loaded once per session from the public /models list.

export interface OpenRouterModelMeta {
    id: string
    contextLength: number
    maxCompletion: number | null
    supported: string[]
    inputModalities: string[]
}

const state = $state({ byId: {} as Record<string, OpenRouterModelMeta>, loaded: false })
let loading: Promise<void> | null = null

export function loadOpenRouterMeta(): Promise<void> {
    loading ??= fetch('https://openrouter.ai/api/v1/models')
        .then((res) => res.json())
        .then((json: { data?: Array<Record<string, any>> }) => {
            const byId: Record<string, OpenRouterModelMeta> = {}
            for (const m of json.data ?? []) {
                byId[m.id] = {
                    id: m.id,
                    contextLength: Number(m.context_length) || 0,
                    maxCompletion: Number(m.top_provider?.max_completion_tokens) || null,
                    supported: Array.isArray(m.supported_parameters) ? m.supported_parameters : [],
                    inputModalities: Array.isArray(m.architecture?.input_modalities) ? m.architecture.input_modalities : [],
                }
            }
            state.byId = byId
            state.loaded = true
        })
        .catch(() => { loading = null })
    return loading
}

/** Meta of a model id (reactive); undefined until the catalog is loaded or for unknown ids. */
export function getOpenRouterMeta(id: string | undefined = DBState.db.openrouterRequestModel): OpenRouterModelMeta | undefined {
    if (!state.loaded) void loadOpenRouterMeta()
    return id ? state.byId[id] : undefined
}

export function supportsReasoning(meta: OpenRouterModelMeta | undefined): boolean {
    return !!meta && ['reasoning', 'include_reasoning', 'reasoning_effort'].some((p) => meta.supported.includes(p))
}

/** Remaining credits of the API key (GET /api/v1/key). */
export async function getOpenRouterKeyInfo(key: string): Promise<{ limit: number | null; remaining: number | null; usage: number } | null> {
    if (!key) return null
    try {
        const res = await fetch('https://openrouter.ai/api/v1/key', { headers: { Authorization: `Bearer ${key}` } })
        if (!res.ok) return null
        const { data } = await res.json()
        return { limit: data?.limit ?? null, remaining: data?.limit_remaining ?? null, usage: Number(data?.usage) || 0 }
    } catch {
        return null
    }
}
