import { language } from 'src/lang'
import { getModelInfo } from 'src/ts/model/modellist'
import { LLMProvider } from 'src/ts/model/types'
import { DBState } from 'src/ts/stores.svelte'

// Credential fields the chosen main and sub models need, with the same conditions as
// the Model tab of BotSettings.svelte. Used by the model page and the section summary.

export interface KeyField {
    id: string
    label: string
    get: () => string
    set: (value: string) => void
    secret: boolean
    optional?: boolean
    placeholder?: string
}

function clearVertexToken() {
    DBState.db.vertexAccessToken = ''
    DBState.db.vertexAccessTokenExpires = 0
}

export function keyFields(): KeyField[] {
    const db = DBState.db
    const main = getModelInfo(db.aiModel)
    const sub = getModelInfo(db.subModel)
    const uses = (provider: number) => main.provider === provider || sub.provider === provider
    const usesId = (test: (id: string) => boolean) => test(db.aiModel) || test(db.subModel)
    const apiKey = language.apiKey
    const out: KeyField[] = []

    if (uses(LLMProvider.GoogleCloud)) {
        out.push({ id: 'google', label: 'Google AI', get: () => db.google.accessToken, set: (v) => { db.google.accessToken = v }, secret: true })
    }
    if (uses(LLMProvider.VertexAI)) {
        out.push({ id: 'vertexProject', label: 'Vertex Project ID', get: () => db.google.projectId, set: (v) => { db.google.projectId = v; clearVertexToken() }, secret: false })
        out.push({ id: 'vertexEmail', label: 'Vertex Client Email', get: () => db.vertexClientEmail, set: (v) => { db.vertexClientEmail = v; clearVertexToken() }, secret: false })
        out.push({ id: 'vertexKey', label: 'Vertex Private Key', get: () => db.vertexPrivateKey, set: (v) => { db.vertexPrivateKey = v; clearVertexToken() }, secret: true })
    }
    if (uses(LLMProvider.NovelList)) {
        out.push({ id: 'novellist', label: `NovelList ${apiKey}`, get: () => db.novellistAPI, set: (v) => { db.novellistAPI = v }, secret: true })
    }
    if (usesId((id) => id.startsWith('mancer'))) {
        out.push({ id: 'mancer', label: `Mancer ${apiKey}`, get: () => db.mancerHeader, set: (v) => { db.mancerHeader = v }, secret: true })
    }
    if (uses(LLMProvider.Anthropic) || uses(LLMProvider.AWS)) {
        out.push({ id: 'claude', label: 'Anthropic', get: () => db.claudeAPIKey, set: (v) => { db.claudeAPIKey = v }, secret: true })
    }
    if (uses(LLMProvider.Mistral)) {
        out.push({ id: 'mistral', label: 'Mistral', get: () => db.mistralKey, set: (v) => { db.mistralKey = v }, secret: true })
    }
    if (uses(LLMProvider.NovelAI)) {
        out.push({ id: 'novelai', label: 'NovelAI Bearer Token', get: () => db.novelai.token, set: (v) => { db.novelai.token = v }, secret: true })
    }
    if (usesId((id) => id === 'reverse_proxy')) {
        out.push({ id: 'proxy', label: language.proxyAPIKey, get: () => db.proxyKey, set: (v) => { db.proxyKey = v }, secret: true, optional: true })
    }
    if (uses(LLMProvider.Cohere)) {
        out.push({ id: 'cohere', label: 'Cohere', get: () => db.cohereAPIKey, set: (v) => { db.cohereAPIKey = v }, secret: true })
    }
    if (usesId((id) => id === 'ollama-cloud')) {
        out.push({ id: 'ollama', label: `Ollama ${apiKey}`, get: () => db.ollamaApiKey, set: (v) => { db.ollamaApiKey = v }, secret: true })
    }
    if (usesId((id) => id === 'nanogpt')) {
        out.push({ id: 'nanogpt', label: 'NanoGPT', get: () => db.nanogptKey, set: (v) => { db.nanogptKey = v }, secret: true })
    }
    if (usesId((id) => id === 'openrouter')) {
        out.push({ id: 'openrouter', label: 'OpenRouter', get: () => db.openrouterKey, set: (v) => { db.openrouterKey = v }, secret: true })
    }
    if (uses(LLMProvider.OpenAI)) {
        out.push({ id: 'openai', label: 'OpenAI', get: () => db.openAIKey, set: (v) => { db.openAIKey = v }, secret: true, placeholder: 'sk-…' })
    }
    for (const info of [main, sub]) {
        const key = info.keyIdentifier
        if (key && !out.some((f) => f.id === `oaic:${key}`)) {
            out.push({ id: `oaic:${key}`, label: info.name, get: () => db.OaiCompAPIKeys[key] ?? '', set: (v) => { db.OaiCompAPIKeys[key] = v }, secret: true })
        }
    }
    if (usesId((id) => id.startsWith('horde'))) {
        out.push({ id: 'horde', label: `Horde ${apiKey}`, get: () => db.hordeConfig.apiKey, set: (v) => { db.hordeConfig.apiKey = v }, secret: true, optional: true })
    }
    return out
}
