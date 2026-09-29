import { DBState } from 'src/ts/stores.svelte'

// Memory type as one value over the flags OtherBotSettings.svelte switches together.

export type MemoryType = 'none' | 'supaMemory' | 'hypaV2' | 'hanuraiMemory' | 'hypaV3'

export function memoryType(): MemoryType {
    const db = DBState.db
    if (db.hypaV3) return 'hypaV3'
    if (db.hypav2) return 'hypaV2'
    if (db.supaModelType !== 'none') return 'supaMemory'
    if (db.hanuraiEnable) return 'hanuraiMemory'
    return 'none'
}

export function setMemoryType(value: MemoryType) {
    const db = DBState.db
    db.hypav2 = value === 'hypaV2'
    db.hanuraiEnable = value === 'hanuraiMemory'
    db.hypaV3 = value === 'hypaV3'
    if (value === 'supaMemory') {
        db.supaModelType = 'distilbart'
        db.memoryAlgorithmType = 'supaMemory'
    } else if (value === 'hypaV2') {
        db.supaModelType = 'distilbart'
        db.memoryAlgorithmType = 'hypaMemoryV2'
    } else if (value === 'hanuraiMemory') {
        db.supaModelType = 'none'
        db.memoryAlgorithmType = 'hanuraiMemory'
    } else if (value === 'hypaV3') {
        db.supaModelType = 'none'
        db.memoryAlgorithmType = 'hypaMemoryV3'
    } else {
        db.supaModelType = 'none'
        db.memoryAlgorithmType = 'none'
    }
}

export const IMAGE_PROVIDERS = ['', 'novelai', 'webui', 'comfyui', 'dalle', 'Imagen', 'stability', 'fal', 'openai-compat', 'wavespeed'] as const

export function imageProviderName(id: string): string {
    const names: Record<string, string> = {
        novelai: 'NovelAI', webui: 'SD WebUI', comfyui: 'ComfyUI', comfy: 'ComfyUI (Legacy)', dalle: 'Dall-E', Imagen: 'Imagen',
        stability: 'Stability', fal: 'Fal.ai', 'openai-compat': 'OpenAI Compatible', wavespeed: 'WaveSpeedAI',
    }
    return names[id] ?? id
}
