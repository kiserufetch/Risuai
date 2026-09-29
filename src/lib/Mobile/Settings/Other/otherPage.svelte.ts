import { language } from 'src/lang'

// Sub-page of "Другие боты" (SettingsMenuIndex 2), stepped back one level by the frame.

export type OtherPage = 'root' | 'memory' | 'hypaV3' | 'hypaPrompts' | 'image' | 'tts'

export const otherPage = $state({ current: 'root' as OtherPage })

const PARENT: Record<Exclude<OtherPage, 'root'>, OtherPage> = {
    memory: 'root', hypaV3: 'memory', hypaPrompts: 'hypaV3', image: 'root', tts: 'root',
}

export function otherBack(): boolean {
    if (otherPage.current === 'root') return false
    otherPage.current = PARENT[otherPage.current]
    return true
}

export function otherPageTitle(page: OtherPage): string {
    if (page === 'root') return language.otherBots
    return language.mobileOther[`page_${page}`]
}
