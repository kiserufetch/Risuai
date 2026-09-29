import { DBState } from 'src/ts/stores.svelte'
import type { KeyField } from '../Bot/keys'

// TTS service credentials from the TTS block of OtherBotSettings.svelte.

export function ttsKeys(): KeyField[] {
    const db = DBState.db
    return [
        { id: 'elevenlabs', label: 'ElevenLabs', get: () => db.elevenLabKey, set: (v) => { db.elevenLabKey = v }, secret: true, optional: true },
        { id: 'openai', label: 'OpenAI', get: () => db.openAIKey, set: (v) => { db.openAIKey = v }, secret: true, optional: true, placeholder: 'sk-…' },
        { id: 'novelai', label: 'NovelAI', get: () => db.NAIApiKey, set: (v) => { db.NAIApiKey = v }, secret: true, optional: true, placeholder: 'pst-…' },
        { id: 'huggingface', label: 'Hugging Face', get: () => db.huggingfaceKey, set: (v) => { db.huggingfaceKey = v }, secret: true, optional: true, placeholder: 'hf_…' },
        { id: 'fish', label: 'fish-speech', get: () => db.fishSpeechKey, set: (v) => { db.fishSpeechKey = v }, secret: true, optional: true },
    ]
}
