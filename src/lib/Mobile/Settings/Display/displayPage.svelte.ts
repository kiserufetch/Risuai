import { language } from 'src/lang'

// Sub-page of "Экран и звук" (SettingsMenuIndex 3). Module state so the settings
// frame can title the header and step back to the section root.

export type DisplayPage = 'root' | 'look' | 'chat' | 'text' | 'sound' | 'interface' | 'css'

export const displayPage = $state({ current: 'root' as DisplayPage })

export function displayPageTitle(page: DisplayPage): string {
    if (page === 'root') return language.display
    return language.mobileDisplay[page]
}
