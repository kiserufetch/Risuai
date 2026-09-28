import { getCharImage } from 'src/ts/characters'
import { DBState } from 'src/ts/stores.svelte'
import { getEmotion } from 'src/ts/util'
import * as session from './session.svelte'

// Portrait for the immersive mode and the floating emotion window (spec §5.9, §5.11).

type EmotionMap = { [key: string]: [string, string, number][] }

/** Session-only switch of the header button "hide portrait"; db.theme is not touched. */
export const portraitState = $state({ hidden: false })

/** getEmotion's [style, ...sources], falling back to the character image; [] when neither exists. */
export async function getPortraitSources(emotions: EmotionMap): Promise<string[]> {
    const fromEmotion = await getEmotion(DBState.db, emotions, 'plain')
    if (fromEmotion.length > 1) {
        return fromEmotion
    }
    const image = session.getCharacter()?.image
    if (!image) {
        return []
    }
    const src = await getCharImage(image, 'plain')
    return src && src.length > 2 ? ['normal', src] : []
}

/** Name of the latest emotion of a single character, for the immersive label. */
export function getCurrentEmotionName(emotions: EmotionMap): string {
    const char = session.getCharacter()
    if (!char || char.type === 'group') {
        return ''
    }
    return emotions[char.chaId]?.at(-1)?.[0] ?? ''
}

const HEIGHT_KEY = 'risu-mc-immersive-height'

export function loadPanelHeight(): number {
    try {
        const stored = Number(localStorage.getItem(HEIGHT_KEY))
        if (stored >= 35 && stored <= 90) {
            return stored
        }
    } catch {
        // storage unavailable (private mode): fall back to the default
    }
    return 60
}

export function savePanelHeight(percent: number): void {
    try {
        localStorage.setItem(HEIGHT_KEY, String(percent))
    } catch {
        // not persisted; the value still applies for this session
    }
}
