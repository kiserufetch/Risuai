import { language } from 'src/lang'
import { getModelInfo } from 'src/ts/model/modellist'
import { LLMFlags, ProviderNames, type LLMModel } from 'src/ts/model/types'

// Names and one-line capability hints for model rows and the picker.

export function modelName(id: string): string {
    if (!id) return language.mobileBot.noModel
    const info = getModelInfo(id)
    return info.fullName || info.name || id
}

export function providerName(model: LLMModel): string {
    return ProviderNames.get(model.provider) ?? ''
}

export function modelHint(model: LLMModel): string {
    const t = language.mobileBot
    const parts: string[] = []
    if (model.flags.includes(LLMFlags.hasImageInput)) parts.push(t.capImages)
    if ([LLMFlags.claudeThinking, LLMFlags.claudeAdaptiveThinking, LLMFlags.geminiThinking, LLMFlags.deepSeekThinkingOutput].some((f) => model.flags.includes(f))) parts.push(t.capThinking)
    if (!model.flags.includes(LLMFlags.hasStreaming)) parts.push(t.capNoStreaming)
    return parts.join(' · ')
}
