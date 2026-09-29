import { language } from 'src/lang'

// Sub-page of "Чат-бот" (SettingsMenuIndex 1). Module state so the settings frame can
// title the header and step back one level at a time.

export type BotPage =
    | 'root' | 'model' | 'params' | 'separate' | 'prompt' | 'promptItem' | 'promptSettings'
    | 'aux' | 'more' | 'bias' | 'additional' | 'flags' | 'regex' | 'regexEntry' | 'module' | 'fallback'

export const botPage = $state({ current: 'root' as BotPage, promptIndex: 0, regexIndex: 0 })

const PARENT: Record<Exclude<BotPage, 'root'>, BotPage> = {
    model: 'root', params: 'root', separate: 'params', prompt: 'root', promptItem: 'prompt', promptSettings: 'prompt',
    aux: 'root', more: 'root', bias: 'more', additional: 'more', flags: 'more', regex: 'more', regexEntry: 'regex',
    module: 'more', fallback: 'more',
}

/** Steps up one level; false when already on the section root. */
export function botBack(): boolean {
    if (botPage.current === 'root') return false
    botPage.current = PARENT[botPage.current]
    return true
}

export function botPageTitle(page: BotPage): string {
    if (page === 'root') return language.chatBot
    return language.mobileBot[`page_${page}`]
}
