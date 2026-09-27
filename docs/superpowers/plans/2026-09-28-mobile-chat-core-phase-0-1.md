# Мобильный чат v2 — этапы 0–1 (примитивы и ядро): план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Цель:** подготовить фундамент нового мобильного чата. Это токены дизайна, примитивы UI (нижняя шторка, иконочная кнопка) и ядро `src/ts/chatCore`: рендер сообщений, клики скриптов, отправка, варианты ответа, действия над сообщениями, статус генерации, окно сообщений. Ядро повторяет поведение старого чата и покрыто модульными и паритетными тестами.

**Архитектура:** логика, которая сейчас зашита в `Chat.svelte`, `ChatBody.svelte`, `Chats.svelte` и `DefaultChatScreen.svelte`, переносится в небольшие модули без UI. Они вызывают те же функции движка с теми же аргументами. Старые компоненты не меняются. Паритетный тест монтирует настоящий `ChatBody.svelte` и сравнивает его HTML с результатом нового ядра. UI нового чата (этап 2 и дальше) будет строиться поверх этих модулей.

**Стек:** Svelte 5 (руны), TypeScript, Tailwind CSS 4, Vitest 4 + happy-dom, pnpm.

**Спецификация:** [docs/superpowers/specs/2026-09-28-mobile-chat-rework-design.md](../specs/2026-09-28-mobile-chat-rework-design.md): §4.1 токены, §6.2–6.6 архитектура и ядро, §7 контракт совместимости, §11 тестирование, §12 этапы 0–1.

## Global Constraints

- Ветка `feat/mobile-chat-v2`. Код, комментарии и сообщения коммитов — на английском.
- Каждое сообщение коммита заканчивается строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Файлы, где используются руны (`$state`, `$state.snapshot`), называются `*.svelte.ts`.
- `tsconfig`: `strict: false`, `verbatimModuleSyntax: true`, поэтому импорты только ради типа пишутся как `import type` или `type X` внутри фигурных скобок. Алиас `src` указывает на `/src`.
- **Не менять:** `src/lib/ChatScreens/Chat.svelte`, `ChatBody.svelte`, `Chats.svelte`, `DefaultChatScreen.svelte`, `ChatScreen.svelte`.
- **Разрешённые правки существующих файлов:**
  - `src/ts/process/prereroll.ts` — только добавить функцию `getPrerollState` в конец;
  - `src/lang/en.ts` и `src/lang/ru.ts` — ключ `mobileChat.removeFromHereConfirm`;
  - спецификация.
- **Вызовы движка — ровно как в старых компонентах:**
  - `risuChatParser(text, { chara: name, chatID: idx, rmVar: true, visualize: true, cbsConditions })`, где `cbsConditions.chatRole` — роль сохранённого сообщения;
  - `ParseMarkdown(text, character, 'notrim', idx, { firstmsg, chatRole: role })`, где `role` — роль, переданная в компонент;
  - `addMetadataToElement(trimMarkdown(md), modelShortName)`.
- Индекс приветствия — `-1`. В групповом чате `character = null`. Имя, которое получает CBS, — это имя персоны для сообщений пользователя и имя персонажа или группы для остальных.
- Новых зависимостей не добавлять.
- Тесты мокают модули движка через `vi.mock('<путь>', factory)`. Общая фейковая БД и фабрики моков лежат только в `src/ts/chatCore/tests/harness.ts`.
- **Гейт этапа:**
  - `pnpm check` — ошибок не больше, чем в базовой линии (Задача 1, шаг 0);
  - `pnpm test` проходит;
  - `pnpm build` проходит.

## Review Focus

1. **Пользователь переключил чат, пока шла генерация.** История вариантов должна записаться в тот чат, где генерация началась. Тест в Задаче 11: «keeps the history with the chat that started the generation».
2. **Старые данные: чат без `id`, сообщение без `chatId`.** Ключ чата строится от позиции, а закладке назначается uuid. Тесты в Задаче 1 («builds a chat key…») и Задаче 12 («gives legacy messages an id…»).
3. **Действие над приветствием (индекс −1).** Любое действие, которое ждёт реальный индекс, ничего не делает и не падает. Тест в Задаче 12: «ignores every index-based action on the greeting».
4. **Акцент пользовательской схемы не в hex** (`rgb(...)`, `var(...)`, пустая строка). Цвет на акценте должен откатываться на белый. Тест в Задаче 2: «falls back to white…».
5. **Реролл в чате без сообщений пользователя.** Не должно быть ни падения, ни генерации, ни изменений. Тест в Задаче 10: «does not crash or generate when the chat has no user message».

---

## Структура файлов

```
src/ts/chatCore/
  session.svelte.ts          текущий персонаж, чат, сообщения, персона; имя для CBS; автор сообщения
  schemeTokens.ts            --mc-on-accent по контрасту, data-scheme
  messageRender.ts           CBS-условия, текст для отображения, markdown, перевод, повторы, <img> ассетов
  scriptedClicks.ts          клики risu-trigger / risu-btn / risu-id
  generationStatus.svelte.ts идёт ли генерация, этап, таймер, перехват ошибки, авто-режим, автоответ
  alternatives.svelte.ts     реролл и варианты ответа, история по id чата
  sendPipeline.ts            отправка, генерация, стоп, продолжить, автоответ, авто-режим группы
  messageActions.svelte.ts   удалить, правка, закладка, ветвь, скрыть, сведения, TTS, приветствия, правка перевода
  copyMessage.ts             копирование сообщения карточкой (rich) или текстом
  messageWindow.svelte.ts    окно сообщений, подгрузка, свёрнутый вид, cold storage
  tests/harness.ts           фейковая БД и фабрики моков (не тест)
  tests/*.test.ts            модульные и паритетные тесты
src/lib/MobileChat/
  mobileChat.css             токены --mc-* (подключит MobileChatScreen на этапе 2)
  Sheet.svelte               нижняя шторка: диалог, фон, Escape, удержание фокуса
  McIconButton.svelte        иконочная кнопка 44×44 с aria-label
  tests/primitives.test.ts
Изменяются:
  src/ts/process/prereroll.ts                                    + getPrerollState (в конец файла)
  src/lang/en.ts, src/lang/ru.ts                                 + mobileChat.removeFromHereConfirm
  docs/superpowers/specs/2026-09-28-mobile-chat-rework-design.md  §6.2 и §6.7: имена файлов
```

Команда для одного теста: `pnpm vitest run <путь-к-тесту>`.

---

### Задача 1: Тестовая обвязка и модуль `session`

**Файлы:**
- Create: `src/ts/chatCore/tests/harness.ts`
- Create: `src/ts/chatCore/session.svelte.ts`
- Test: `src/ts/chatCore/tests/session.test.ts`

**Интерфейсы:**
- Consumes: `DBState`, `selIdState` из `src/ts/stores.svelte`; типы `Chat`, `Message`, `character`, `groupChat` из `src/ts/storage/database.svelte`.
- Produces (`session.svelte.ts`, импорт `import * as session from './session.svelte'`):
  - `getCharacterIndex(): number`
  - `getCharacter(): character | groupChat | undefined`
  - `getChat(): Chat | undefined`
  - `getMessages(): Message[]`
  - `getMessage(idx: number): Message | undefined` — возвращает `undefined` для `idx < 0`
  - `isGroup(): boolean`
  - `getChatKey(): string` — `chat.id` или `` `${selId}:${chatPage}` ``
  - `getPersona(): PersonaView` — `{ name, icon, largePortrait }`
  - `getRenderName(message): string`
  - `getSpeaker(message): SpeakerView` — `{ name, image, largePortrait, chaId }`
- Produces (`tests/harness.ts`):
  - фабрики `makeMessage(role, data, extra?)`, `makeChat(extra?)`, `makeCharacter(extra?)`, `makeGroup(extra?)`, `makeDb(extra?)`;
  - общие объекты `DBState`, `selIdState`, сторы `selectedCharID`, `ReloadChatPointer`, `ReloadGUIPointer`, `CurrentTriggerIdStore`, `alertStore`, `CharEmotion`, `HideIconStore`, `doingChat`, `chatProcessStage`, объект `ScrollToMessageStore`;
  - функции `selectCharacter(i)`, `resetHarness(dbExtra?)`, `currentCharacter()`, `currentChat()`;
  - фабрики моков `storesMock()` и `databaseMock()`.

- [ ] **Шаг 0: Зафиксировать базовую линию**

Run: `pnpm check` — запишите число ошибок и предупреждений.
Run: `pnpm test` — запишите, что все существующие тесты проходят.
Если `node_modules` нет, сначала выполните `pnpm install`.

- [ ] **Шаг 1: Создать тестовую обвязку**

`src/ts/chatCore/tests/harness.ts`:

```ts
import { writable } from 'svelte/store'

// Test-only fake of the RisuAI database and stores used by chatCore tests.
// Wire it with: vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())

let messageCounter = 0

export function makeMessage(role: 'user' | 'char', data: string, extra: Record<string, any> = {}): any {
    messageCounter += 1
    return { role, data, chatId: `msg-${messageCounter}`, ...extra }
}

export function makeChat(extra: Record<string, any> = {}): any {
    return {
        message: [],
        note: '',
        name: 'Chat 1',
        localLore: [],
        id: 'chat-1',
        fmIndex: -1,
        ...extra,
    }
}

export function makeCharacter(extra: Record<string, any> = {}): any {
    return {
        type: 'character',
        name: 'Lira',
        chaId: 'cha-lira',
        image: '',
        firstMessage: 'Welcome, traveller. I am {{char}}.',
        alternateGreetings: [],
        chats: [makeChat()],
        chatPage: 0,
        chatFolders: [],
        customscript: [],
        triggerscript: [],
        additionalAssets: [],
        emotionImages: [],
        virtualscript: '',
        ttsMode: '',
        creatorNotes: '',
        removedQuotes: false,
        largePortrait: false,
        prebuiltAssetStyle: '',
        ...extra,
    }
}

export function makeGroup(extra: Record<string, any> = {}): any {
    return {
        type: 'group',
        name: 'Lame Raven',
        chaId: 'grp-raven',
        image: '',
        firstMessage: '',
        alternateGreetings: [],
        chats: [makeChat({ id: 'chat-group' })],
        chatPage: 0,
        chatFolders: [],
        characters: ['cha-lira', 'cha-born'],
        characterTalks: [1, 1],
        characterActive: [true, true],
        ...extra,
    }
}

export function makeDb(extra: Record<string, any> = {}): any {
    return {
        characters: [makeCharacter()],
        personas: [{ id: 'persona-1', name: 'Traveller', icon: '', largePortrait: false, personaPrompt: '' }],
        selectedPersona: 0,
        username: 'Traveller',
        userIcon: '',
        askRemoval: true,
        instantRemove: false,
        enableBookmark: true,
        createFolderOnBranch: true,
        useSayNothing: true,
        translator: '',
        translatorType: '',
        autoTranslate: false,
        autoTranslateCachedOnly: false,
        translateBeforeHTMLFormatting: false,
        legacyTranslation: false,
        showTranslationLoading: false,
        newImageHandlingBeta: false,
        inlayErrorResponse: false,
        playMessage: false,
        zoomsize: 100,
        lineHeight: 1.25,
        mobileContentZoom: 80,
        chatLoadInitialPages: 30,
        chatLoadAdditionalPages: 15,
        globalChatVariables: {},
        templateDefaultVariables: '',
        enabledModules: [],
        modules: [],
        presetRegex: [],
        ...extra,
    }
}

export const DBState: { db: any } = { db: makeDb() }
export const selIdState = { selId: 0 }
export const selectedCharID = writable(0)
export const ReloadChatPointer = writable<Record<number, number>>({})
export const ReloadGUIPointer = writable(0)
export const CurrentTriggerIdStore = writable<string | null>(null)
export const alertStore = writable<any>({ type: 'none', msg: '' })
export const CharEmotion = writable<any>({})
export const HideIconStore = writable(false)
export const ScrollToMessageStore = { value: -1 }
export const doingChat = writable(false)
export const chatProcessStage = writable(0)

export function selectCharacter(index: number): void {
    selIdState.selId = index
    selectedCharID.set(index)
}

export function resetHarness(dbExtra: Record<string, any> = {}): void {
    DBState.db = makeDb(dbExtra)
    selectCharacter(0)
    ReloadChatPointer.set({})
    ReloadGUIPointer.set(0)
    CurrentTriggerIdStore.set(null)
    alertStore.set({ type: 'none', msg: '' })
    doingChat.set(false)
    chatProcessStage.set(0)
}

export function currentCharacter(): any {
    return DBState.db.characters[selIdState.selId]
}

export function currentChat(): any {
    const char = currentCharacter()
    return char.chats[char.chatPage]
}

export function storesMock(): any {
    return {
        DBState,
        selIdState,
        selectedCharID,
        ReloadChatPointer,
        ReloadGUIPointer,
        CurrentTriggerIdStore,
        alertStore,
        CharEmotion,
        HideIconStore,
        ScrollToMessageStore,
        createSimpleCharacter: (char: any) => {
            if (!char || char.type === 'group') {
                return null
            }
            return {
                type: 'simple',
                customscript: char.customscript,
                chaId: char.chaId,
                additionalAssets: char.additionalAssets,
                virtualscript: char.virtualscript,
                emotionImages: char.emotionImages,
                triggerscript: char.triggerscript,
            }
        },
    }
}

export function databaseMock(): any {
    return {
        appVer: '0.0.0-test',
        getDatabase: () => DBState.db,
        getCurrentCharacter: () => currentCharacter(),
        getCurrentChat: () => currentChat(),
        setCurrentChat: (chat: any) => {
            const char = currentCharacter()
            char.chats[char.chatPage] = chat
        },
    }
}
```

- [ ] **Шаг 2: Написать падающий тест**

`src/ts/chatCore/tests/session.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())

import * as session from '../session.svelte'
import { DBState, currentChat, makeCharacter, makeChat, makeGroup, makeMessage, resetHarness, selectCharacter } from './harness'

beforeEach(() => {
    resetHarness()
})

describe('session', () => {
    it('reads the selected character, chat and messages', () => {
        const first = makeMessage('user', 'Hello')
        currentChat().message.push(first)
        expect(session.getCharacterIndex()).toBe(0)
        expect(session.getCharacter()?.name).toBe('Lira')
        expect(session.getChat()?.id).toBe('chat-1')
        expect(session.getMessages()).toHaveLength(1)
        expect(session.getMessage(0)).toBe(first)
        expect(session.getMessage(-1)).toBeUndefined()
        expect(session.isGroup()).toBe(false)
    })

    it('follows the selected character and chat page', () => {
        DBState.db.characters.push(makeCharacter({ name: 'Born', chaId: 'cha-born', chatPage: 1, chats: [makeChat({ id: 'a' }), makeChat({ id: 'b' })] }))
        selectCharacter(1)
        expect(session.getCharacter()?.name).toBe('Born')
        expect(session.getChat()?.id).toBe('b')
    })

    it('builds a chat key from the chat id, or from the position for legacy chats', () => {
        expect(session.getChatKey()).toBe('chat-1')
        delete currentChat().id
        expect(session.getChatKey()).toBe('0:0')
    })

    it('prefers the persona bound to the chat', () => {
        DBState.db.personas.push({ id: 'persona-2', name: 'Knight', icon: 'knight.png', largePortrait: true, personaPrompt: '' })
        expect(session.getPersona()).toEqual({ name: 'Traveller', icon: '', largePortrait: false })
        currentChat().bindedPersona = 'persona-2'
        expect(session.getPersona()).toEqual({ name: 'Knight', icon: 'knight.png', largePortrait: true })
    })

    it('uses the group name as render name while showing the real speaker', () => {
        DBState.db.characters.push(makeCharacter({ name: 'Born', chaId: 'cha-born', image: 'born.png' }))
        DBState.db.characters.push(makeGroup())
        selectCharacter(2)
        const reply = makeMessage('char', 'Twenty winters!', { saying: 'cha-born' })
        expect(session.isGroup()).toBe(true)
        expect(session.getRenderName(reply)).toBe('Lame Raven')
        expect(session.getSpeaker(reply)).toEqual({ name: 'Born', image: 'born.png', largePortrait: false, chaId: 'cha-born' })
        expect(session.getSpeaker(makeMessage('char', '?', { saying: 'unknown' })).name).toBe('Lame Raven')
    })

    it('renders user messages with the persona name but shows multiuser senders', () => {
        expect(session.getRenderName(makeMessage('user', 'hi', { name: 'Guest' }))).toBe('Traveller')
        expect(session.getSpeaker(makeMessage('user', 'hi', { name: 'Guest' })).name).toBe('Guest')
        expect(session.getSpeaker(makeMessage('user', 'hi')).name).toBe('Traveller')
    })
})
```

- [ ] **Шаг 3: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/ts/chatCore/tests/session.test.ts`
Expected: FAIL — `Failed to resolve import "../session.svelte"`.

- [ ] **Шаг 4: Реализовать `session.svelte.ts`**

`src/ts/chatCore/session.svelte.ts`:

```ts
import type { Chat, Message, character, groupChat } from 'src/ts/storage/database.svelte'
import { DBState, selIdState } from 'src/ts/stores.svelte'

// Read access to the chat the mobile chat screen shows. Reads go through the
// reactive DBState proxy, so callers inside $derived/$effect stay reactive.

export interface PersonaView {
    name: string
    icon: string
    largePortrait: boolean
}

export interface SpeakerView {
    name: string
    image: string
    largePortrait: boolean
    chaId: string | null
}

export function getCharacterIndex(): number {
    return selIdState.selId
}

export function getCharacter(): character | groupChat | undefined {
    return DBState.db.characters?.[selIdState.selId]
}

export function getChat(): Chat | undefined {
    const char = getCharacter()
    return char?.chats?.[char.chatPage]
}

export function getMessages(): Message[] {
    return getChat()?.message ?? []
}

export function getMessage(idx: number): Message | undefined {
    if (idx < 0) {
        return undefined
    }
    return getMessages()[idx]
}

export function isGroup(): boolean {
    return getCharacter()?.type === 'group'
}

/** Stable key for per-chat state; legacy chats without an id fall back to their position. */
export function getChatKey(): string {
    const chat = getChat()
    if (chat?.id) {
        return chat.id
    }
    return `${selIdState.selId}:${getCharacter()?.chatPage ?? 0}`
}

/** DefaultChatScreen.svelte: the persona bound to the chat, else the selected persona. */
export function getPersona(): PersonaView {
    const db = DBState.db
    const bound = getChat()?.bindedPersona
    if (bound) {
        const persona = db.personas?.find((p) => p.id === bound)
        if (persona) {
            return { name: persona.name, icon: persona.icon, largePortrait: persona.largePortrait ?? false }
        }
    }
    const selected = db.personas?.[db.selectedPersona]
    return { name: db.username, icon: selected?.icon ?? '', largePortrait: selected?.largePortrait ?? false }
}

/**
 * Name handed to the CBS parser as `chara` (Chats.svelte): the persona name for user
 * messages, otherwise the character's own name, which is the group's name in group chats.
 * Scripts depend on this exact value, so it must not follow the speaker.
 */
export function getRenderName(message: Message | undefined): string {
    if (message?.role === 'user') {
        return getPersona().name
    }
    return getCharacter()?.name ?? ''
}

/** Who the UI shows as the author of a message. */
export function getSpeaker(message: Message | undefined): SpeakerView {
    const char = getCharacter()
    if (message?.role === 'user') {
        const persona = getPersona()
        return { name: message.name || persona.name, image: persona.icon, largePortrait: persona.largePortrait, chaId: null }
    }
    if (char?.type === 'group' && message?.saying) {
        const speaker = DBState.db.characters.find((c) => c.chaId === message.saying)
        if (speaker) {
            return {
                name: speaker.name,
                image: speaker.image ?? '',
                largePortrait: (speaker as character).largePortrait ?? false,
                chaId: speaker.chaId,
            }
        }
    }
    return {
        name: char?.name ?? '',
        image: char?.image ?? '',
        largePortrait: (char as character | undefined)?.largePortrait ?? false,
        chaId: char?.chaId ?? null,
    }
}
```

- [ ] **Шаг 5: Запустить тест и убедиться, что он проходит**

Run: `pnpm vitest run src/ts/chatCore/tests/session.test.ts`
Expected: PASS, 6 тестов.

- [ ] **Шаг 6: Коммит**

```bash
git add src/ts/chatCore/session.svelte.ts src/ts/chatCore/tests/harness.ts src/ts/chatCore/tests/session.test.ts
git commit -m "feat(chat-core): add session accessors and chatCore test harness" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 2: Токены дизайна

**Файлы:**
- Create: `src/ts/chatCore/schemeTokens.ts`
- Create: `src/lib/MobileChat/mobileChat.css`
- Test: `src/ts/chatCore/tests/schemeTokens.test.ts`

**Интерфейсы:**
- Produces:
  - `parseHexColor(value: string): [number, number, number] | null`
  - `relativeLuminance(rgb): number`
  - `contrastRatio(a, b): number`
  - `pickOnAccent(accent: string): '#ffffff' | '#111111'`
  - `applySchemeTokens(element: HTMLElement, scheme: { borderc: string; type: 'light' | 'dark' }): void` — выставляет `--mc-on-accent` и `data-scheme`.
  - CSS-класс `.risu-mc-screen` с токенами `--mc-*` (спецификация §4.1).

- [ ] **Шаг 1: Написать падающий тест**

`src/ts/chatCore/tests/schemeTokens.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { applySchemeTokens, contrastRatio, parseHexColor, pickOnAccent, relativeLuminance } from '../schemeTokens'

describe('schemeTokens', () => {
    it('parses 3, 6 and 8 digit hex colors', () => {
        expect(parseHexColor('#fff')).toEqual([255, 255, 255])
        expect(parseHexColor('#6366f1')).toEqual([99, 102, 241])
        expect(parseHexColor('#6366f1cc')).toEqual([99, 102, 241])
        expect(parseHexColor('rgb(1, 2, 3)')).toBeNull()
    })

    it('computes WCAG contrast ratios', () => {
        expect(contrastRatio(relativeLuminance([255, 255, 255]), relativeLuminance([0, 0, 0]))).toBeCloseTo(21, 1)
    })

    it('picks the more readable foreground for accents of built-in schemes', () => {
        expect(pickOnAccent('#6366f1')).toBe('#ffffff') // default
        expect(pickOnAccent('#0f172a')).toBe('#ffffff') // light scheme: near-black accent
        expect(pickOnAccent('#525252')).toBe('#ffffff') // dark
        expect(pickOnAccent('#8be9fd')).toBe('#111111') // galaxy
        expect(pickOnAccent('#a8dadc')).toBe('#111111') // nature
    })

    it('falls back to white for colors it cannot parse', () => {
        expect(pickOnAccent('var(--x)')).toBe('#ffffff')
        expect(pickOnAccent('rgb(255, 255, 255)')).toBe('#ffffff')
        expect(pickOnAccent('')).toBe('#ffffff')
    })

    it('writes the on-accent token and the scheme type onto an element', () => {
        const element = document.createElement('div')
        applySchemeTokens(element, { borderc: '#8be9fd', type: 'light' })
        expect(element.style.getPropertyValue('--mc-on-accent')).toBe('#111111')
        expect(element.dataset.scheme).toBe('light')
    })
})
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/ts/chatCore/tests/schemeTokens.test.ts`
Expected: FAIL — `Failed to resolve import "../schemeTokens"`.

- [ ] **Шаг 3: Реализовать `schemeTokens.ts` и `mobileChat.css`**

`src/ts/chatCore/schemeTokens.ts`:

```ts
// Design tokens of the mobile chat that CSS cannot compute on its own.
// Everything else is derived from --risu-theme-* in src/lib/MobileChat/mobileChat.css.

export type OnAccent = '#ffffff' | '#111111'
export type SchemeType = 'light' | 'dark'

const HEX_COLOR = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i

export function parseHexColor(value: string): [number, number, number] | null {
    const match = HEX_COLOR.exec((value ?? '').trim())
    if (!match) {
        return null
    }
    let hex = match[1]
    if (hex.length === 3) {
        hex = hex.split('').map((c) => c + c).join('')
    }
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
}

export function relativeLuminance([r, g, b]: [number, number, number]): number {
    const channel = (value: number) => {
        const s = value / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: number, b: number): number {
    const lighter = Math.max(a, b)
    const darker = Math.min(a, b)
    return (lighter + 0.05) / (darker + 0.05)
}

const WHITE_LUMINANCE = 1
const INK_LUMINANCE = relativeLuminance([0x11, 0x11, 0x11])

/** Foreground for icons and text drawn on the scheme accent (borderc). */
export function pickOnAccent(accent: string): OnAccent {
    const rgb = parseHexColor(accent)
    if (!rgb) {
        return '#ffffff'
    }
    const luminance = relativeLuminance(rgb)
    return contrastRatio(INK_LUMINANCE, luminance) > contrastRatio(WHITE_LUMINANCE, luminance) ? '#111111' : '#ffffff'
}

export function applySchemeTokens(element: HTMLElement, scheme: { borderc: string; type: SchemeType }): void {
    element.style.setProperty('--mc-on-accent', pickOnAccent(scheme.borderc))
    element.dataset.scheme = scheme.type
}
```

`src/lib/MobileChat/mobileChat.css`:

```css
/*
 * Mobile chat v2 design tokens (spec §4.1). Everything is derived from the user's
 * color scheme, so built-in and custom schemes keep working. The rules live in
 * Tailwind's `components` layer: utilities can still override them, and the
 * unlayered user customCSS always wins.
 */
@layer components {
    .risu-mc-screen {
        --mc-bg: var(--risu-theme-bgcolor);
        --mc-surface: var(--risu-theme-darkbutton);
        --mc-bubble: var(--risu-theme-selected);
        --mc-group: color-mix(in oklab, var(--risu-theme-darkbutton), var(--risu-theme-textcolor) 5%);
        --mc-line: var(--risu-theme-darkborderc);
        --mc-text: var(--risu-theme-textcolor);
        --mc-text2: var(--risu-theme-textcolor2);
        --mc-accent: var(--risu-theme-borderc);
        --mc-accent-soft: color-mix(in oklab, var(--risu-theme-borderc) 18%, transparent);
        --mc-on-accent: #ffffff;
        --mc-danger: var(--risu-theme-draculared);
        --mc-glass: color-mix(in oklab, var(--risu-theme-bgcolor) 80%, transparent);
        --mc-scrim: rgb(0 0 0 / 0.55);
        background-color: var(--mc-bg);
        color: var(--mc-text);
    }

    .risu-mc-screen[data-scheme='light'] {
        --mc-scrim: rgb(20 20 35 / 0.35);
    }
}
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Run: `pnpm vitest run src/ts/chatCore/tests/schemeTokens.test.ts`
Expected: PASS, 5 тестов.

- [ ] **Шаг 5: Коммит**

```bash
git add src/ts/chatCore/schemeTokens.ts src/ts/chatCore/tests/schemeTokens.test.ts src/lib/MobileChat/mobileChat.css
git commit -m "feat(mobile-chat): add scheme-derived design tokens" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 3: Примитивы UI — `Sheet` и `McIconButton`

**Файлы:**
- Create: `src/lib/MobileChat/Sheet.svelte`
- Create: `src/lib/MobileChat/McIconButton.svelte`
- Test: `src/lib/MobileChat/tests/primitives.test.ts`

**Интерфейсы:**
- Produces:
  - `Sheet` — props `{ open: boolean; label: string; onclose: () => void; children: Snippet; class?: string }`. При `open` рендерит фон `.risu-mc-sheet-scrim` и `section.risu-mc-sheet[role=dialog][aria-modal=true][aria-label]` с ручкой и содержимым. Закрывается по тапу на фон и по Escape, удерживает Tab внутри, при открытии ставит фокус в шторку, при закрытии возвращает его обратно.
  - `McIconButton` — props `{ label: string; onclick?: (e: MouseEvent) => void; disabled?: boolean; pressed?: boolean; class?: string; children: Snippet }`. Рендерит `<button type="button" aria-label title aria-pressed class="risu-mc-icon-button … h-11 w-11 …">`.

- [ ] **Шаг 1: Написать падающий тест**

`src/lib/MobileChat/tests/primitives.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRawSnippet, mount, tick, unmount } from 'svelte'
import McIconButton from '../McIconButton.svelte'
import Sheet from '../Sheet.svelte'

const mounted: unknown[] = []

function snippet(html: string) {
    return createRawSnippet(() => ({ render: () => html }))
}

function render(component: Parameters<typeof mount>[0], props: Record<string, unknown>) {
    const target = document.createElement('div')
    document.body.appendChild(target)
    mounted.push(mount(component, { target, props }))
    return target
}

afterEach(async () => {
    await Promise.all(mounted.splice(0).map((component) => unmount(component as never)))
    document.body.replaceChildren()
})

describe('Sheet', () => {
    it('renders nothing while closed', () => {
        const target = render(Sheet, { open: false, label: 'Actions', onclose: vi.fn(), children: snippet('<div><button>One</button></div>') })
        expect(target.querySelector('[role="dialog"]')).toBeNull()
    })

    it('renders an accessible modal dialog with its content', () => {
        const target = render(Sheet, { open: true, label: 'Actions', onclose: vi.fn(), children: snippet('<div><button>One</button></div>') })
        const dialog = target.querySelector('[role="dialog"]')
        expect(dialog?.getAttribute('aria-modal')).toBe('true')
        expect(dialog?.getAttribute('aria-label')).toBe('Actions')
        expect(dialog?.classList.contains('risu-mc-sheet')).toBe(true)
        expect(dialog?.textContent).toContain('One')
    })

    it('closes on scrim tap and on Escape', () => {
        const onclose = vi.fn()
        const target = render(Sheet, { open: true, label: 'Actions', onclose, children: snippet('<div><button>One</button></div>') })
        ;(target.querySelector('.risu-mc-sheet-scrim') as HTMLElement).click()
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
        expect(onclose).toHaveBeenCalledTimes(2)
    })

    it('moves focus into the dialog and keeps Tab inside it', async () => {
        const target = render(Sheet, {
            open: true,
            label: 'Actions',
            onclose: vi.fn(),
            children: snippet('<div><button id="first">One</button><button id="last">Two</button></div>'),
        })
        await tick()
        await tick()
        const dialog = target.querySelector('[role="dialog"]') as HTMLElement
        expect(dialog.contains(document.activeElement)).toBe(true)
        ;(target.querySelector('#last') as HTMLElement).focus()
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
        expect(document.activeElement?.id).toBe('first')
    })
})

describe('McIconButton', () => {
    it('renders a labelled 44px button that forwards clicks', () => {
        const onclick = vi.fn()
        const target = render(McIconButton, { label: 'Copy', onclick, children: snippet('<svg></svg>') })
        const button = target.querySelector('button') as HTMLButtonElement
        expect(button.getAttribute('aria-label')).toBe('Copy')
        expect(button.getAttribute('type')).toBe('button')
        expect(button.className).toContain('h-11')
        expect(button.className).toContain('w-11')
        button.click()
        expect(onclick).toHaveBeenCalledTimes(1)
    })

    it('respects disabled and pressed states', () => {
        const onclick = vi.fn()
        const target = render(McIconButton, { label: 'Translate', onclick, disabled: true, pressed: true, children: snippet('<svg></svg>') })
        const button = target.querySelector('button') as HTMLButtonElement
        expect(button.disabled).toBe(true)
        expect(button.getAttribute('aria-pressed')).toBe('true')
        button.click()
        expect(onclick).not.toHaveBeenCalled()
    })
})
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/lib/MobileChat/tests/primitives.test.ts`
Expected: FAIL — `Failed to resolve import "../McIconButton.svelte"`.

- [ ] **Шаг 3: Реализовать компоненты**

`src/lib/MobileChat/Sheet.svelte`:

```svelte
<script lang="ts">
    import { tick, type Snippet } from 'svelte'

    interface Props {
        open: boolean
        label: string
        onclose: () => void
        children: Snippet
        class?: string
    }

    let { open, label, onclose, children, class: className = '' }: Props = $props()

    let panel: HTMLElement | null = $state(null)

    const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

    $effect(() => {
        if (!open || !panel) {
            return
        }
        const previous = document.activeElement as HTMLElement | null
        tick().then(() => panel?.focus())
        return () => previous?.focus?.()
    })

    function onkeydown(event: KeyboardEvent) {
        if (!open) {
            return
        }
        if (event.key === 'Escape') {
            event.preventDefault()
            onclose()
            return
        }
        if (event.key !== 'Tab' || !panel) {
            return
        }
        const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
        if (items.length === 0) {
            event.preventDefault()
            return
        }
        const first = items[0]
        const last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first.focus()
        }
    }
</script>

<svelte:window {onkeydown} />

{#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="risu-mc-sheet-scrim fixed inset-0 z-50" style="background: var(--mc-scrim, rgb(0 0 0 / 0.55));" onclick={onclose}></div>
    <section
        bind:this={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabindex="-1"
        class="risu-mc-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col gap-3 overflow-y-auto overscroll-contain rounded-t-[24px] px-3 pt-2 outline-none {className}"
        style="background: var(--mc-surface, var(--risu-theme-darkbutton)); color: var(--mc-text, var(--risu-theme-textcolor)); padding-bottom: calc(1rem + var(--safe-bottom, 0px));"
    >
        <span aria-hidden="true" class="mx-auto h-[5px] w-9 shrink-0 rounded-full" style="background: var(--mc-line, var(--risu-theme-darkborderc));"></span>
        {@render children()}
    </section>
{/if}
```

`src/lib/MobileChat/McIconButton.svelte`:

```svelte
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        label: string
        onclick?: (event: MouseEvent) => void
        disabled?: boolean
        pressed?: boolean
        class?: string
        children: Snippet
    }

    let { label, onclick, disabled = false, pressed = undefined, class: className = '', children }: Props = $props()
</script>

<button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={pressed}
    {disabled}
    {onclick}
    class="risu-mc-icon-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-(--mc-text2) transition-transform active:scale-95 disabled:opacity-40 {className}"
>
    {@render children()}
</button>
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Run: `pnpm vitest run src/lib/MobileChat/tests/primitives.test.ts`
Expected: PASS, 6 тестов.

- [ ] **Шаг 5: Коммит**

```bash
git add src/lib/MobileChat/Sheet.svelte src/lib/MobileChat/McIconButton.svelte src/lib/MobileChat/tests/primitives.test.ts
git commit -m "feat(mobile-chat): add bottom sheet and icon button primitives" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 4: Рендер сообщения — базовый путь

**Файлы:**
- Create: `src/ts/chatCore/messageRender.ts`
- Test: `src/ts/chatCore/tests/messageRender.test.ts`

**Интерфейсы:**
- Consumes: `session.getMessage` (Задача 1); `ParseMarkdown`, `trimMarkdown`, `addMetadataToElement`, типы `CbsConditions` и `simpleCharacterArgument` из `src/ts/parser/parser.svelte`; `risuChatParser` из `src/ts/process/scripts`.
- Produces:
  - `type RenderCharacter = simpleCharacterArgument | string | null`
  - `interface BodyContext { character: RenderCharacter; idx: number; role: string | null; firstMessage: boolean }`
  - `getDisplayCbsConditions(idx, firstMessage): CbsConditions` — роль из БД, как в `Chat.svelte`.
  - `getBodyCbsConditions(role, firstMessage): CbsConditions` — роль из аргумента, как в `ChatBody.svelte`.
  - `prepareDisplayText(text, { name, idx, firstMessage }): string`
  - `renderMarkdown(displayText, context: BodyContext): Promise<string>`
  - `finalizeHtml(markdownHtml, modelShortName): string`
  - `hasCustomUi(displayText): boolean`
  - `isBlankMessage(text, idx, isComment): boolean`

- [ ] **Шаг 1: Написать падающий тест**

`src/ts/chatCore/tests/messageRender.test.ts`. Мокаются все модули, которые `messageRender.ts` импортирует к Задаче 6, чтобы этот тест не ломался после следующих задач.

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/storage/database.svelte', async () => (await import('./harness')).databaseMock())
vi.mock('src/ts/parser/parser.svelte', () => ({
    ParseMarkdown: vi.fn(),
    trimMarkdown: vi.fn(),
    addMetadataToElement: vi.fn(),
    postTranslationParse: vi.fn(),
    getDistance: vi.fn(() => 0),
}))
vi.mock('src/ts/process/scripts', () => ({ risuChatParser: vi.fn() }))
vi.mock('src/ts/translator/translator', () => ({ getLLMCache: vi.fn(), translateHTML: vi.fn() }))
vi.mock('src/ts/process/modules', () => ({ getModuleAssets: vi.fn(() => []) }))
vi.mock('src/ts/globalApi.svelte', () => ({ getFileSrc: vi.fn(async () => '') }))
vi.mock('src/ts/alert', () => ({ alertError: vi.fn() }))

import { addMetadataToElement, ParseMarkdown, trimMarkdown } from 'src/ts/parser/parser.svelte'
import { risuChatParser } from 'src/ts/process/scripts'
import {
    finalizeHtml,
    getBodyCbsConditions,
    getDisplayCbsConditions,
    hasCustomUi,
    isBlankMessage,
    prepareDisplayText,
    renderMarkdown,
} from '../messageRender'
import { currentChat, makeMessage, resetHarness } from './harness'

const character = { type: 'simple', chaId: 'cha-lira', customscript: [] } as any

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    vi.mocked(ParseMarkdown).mockImplementation(async (text: string) => `<md>${text}</md>`)
    vi.mocked(trimMarkdown).mockImplementation((html: string) => `<trim>${html}</trim>`)
    vi.mocked(addMetadataToElement).mockImplementation((html: string, model: string) => `${html}<meta:${model}>`)
    vi.mocked(risuChatParser).mockImplementation((text: string) => `cbs(${text})`)
    currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'Hello'))
})

describe('messageRender', () => {
    it('reads the CBS role of the stored message for display text (Chat.svelte)', () => {
        expect(getDisplayCbsConditions(1, false)).toEqual({ firstmsg: false, chatRole: 'char' })
        expect(getDisplayCbsConditions(0, false)).toEqual({ firstmsg: false, chatRole: 'user' })
        expect(getDisplayCbsConditions(-1, true)).toEqual({ firstmsg: true, chatRole: null })
    })

    it('uses the role it is given for the markdown pass (ChatBody.svelte)', () => {
        expect(getBodyCbsConditions('char', true)).toEqual({ firstmsg: true, chatRole: 'char' })
        expect(getBodyCbsConditions(null, false)).toEqual({ firstmsg: false, chatRole: null })
    })

    it('prepares display text with the exact parser options of Chat.svelte displaya', () => {
        expect(prepareDisplayText('Hello', { name: 'Lira', idx: 1, firstMessage: false })).toBe('cbs(Hello)')
        expect(risuChatParser).toHaveBeenCalledWith('Hello', {
            chara: 'Lira',
            chatID: 1,
            rmVar: true,
            visualize: true,
            cbsConditions: { firstmsg: false, chatRole: 'char' },
        })
    })

    it('renders markdown in notrim mode with the message index', async () => {
        await expect(renderMarkdown('text', { character, idx: 1, role: 'char', firstMessage: false })).resolves.toBe('<md>text</md>')
        expect(ParseMarkdown).toHaveBeenCalledWith('text', character, 'notrim', 1, { firstmsg: false, chatRole: 'char' })
    })

    it('passes a null character in group chats', async () => {
        await renderMarkdown('text', { character: null, idx: 0, role: 'user', firstMessage: false })
        expect(ParseMarkdown).toHaveBeenCalledWith('text', null, 'notrim', 0, { firstmsg: false, chatRole: 'user' })
    })

    it('finalizes html like ChatBody: trimMarkdown, then addMetadataToElement', () => {
        expect(finalizeHtml('<p>x</p>', 'Opus')).toBe('<trim><p>x</p></trim><meta:Opus>')
        expect(trimMarkdown).toHaveBeenCalledWith('<p>x</p>')
        expect(addMetadataToElement).toHaveBeenCalledWith('<trim><p>x</p></trim>', 'Opus')
    })

    it('detects custom card UI and blank messages like Chat.svelte', () => {
        expect(hasCustomUi('<style>.a{}</style>')).toBe(true)
        expect(hasCustomUi('<risu-style>00</risu-style>')).toBe(true)
        expect(hasCustomUi('plain')).toBe(false)
        expect(isBlankMessage('{{none}}', -1, false)).toBe(true)
        expect(isBlankMessage('{{blank}}', -1, false)).toBe(true)
        expect(isBlankMessage('', -1, false)).toBe(true)
        expect(isBlankMessage('', 3, false)).toBe(false)
        expect(isBlankMessage('text', 3, true)).toBe(true)
    })
})
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/ts/chatCore/tests/messageRender.test.ts`
Expected: FAIL — `Failed to resolve import "../messageRender"`.

- [ ] **Шаг 3: Реализовать базовый `messageRender.ts`**

`src/ts/chatCore/messageRender.ts`:

```ts
import { addMetadataToElement, ParseMarkdown, trimMarkdown, type CbsConditions, type simpleCharacterArgument } from 'src/ts/parser/parser.svelte'
import { risuChatParser } from 'src/ts/process/scripts'
import * as session from './session.svelte'

// Message rendering exactly as Chat.svelte + ChatBody.svelte do it, so card scripts
// (CBS, display regex, Lua editDisplay, display triggers, plugin handlers) see the
// same inputs in the new mobile chat.

export type RenderCharacter = simpleCharacterArgument | string | null

export interface BodyContext {
    /** createSimpleCharacter(current character); null in group chats. */
    character: RenderCharacter
    /** Real message index; -1 for the greeting. */
    idx: number
    /** Role handed down as a prop (ChatBody.svelte); 'char' for the greeting. */
    role: string | null
    firstMessage: boolean
}

/** Chat.svelte getCbsCondition: the role comes from the stored message. */
export function getDisplayCbsConditions(idx: number, firstMessage: boolean): CbsConditions {
    try {
        return { firstmsg: firstMessage ?? false, chatRole: session.getMessage(idx)?.role ?? null }
    } catch {
        return { firstmsg: firstMessage ?? false, chatRole: null }
    }
}

/** ChatBody.svelte getCbsCondition: the role comes from the component prop. */
export function getBodyCbsConditions(role: string | null, firstMessage: boolean): CbsConditions {
    return { firstmsg: firstMessage ?? false, chatRole: role }
}

/** Chat.svelte displaya. */
export function prepareDisplayText(text: string, options: { name: string; idx: number; firstMessage: boolean }): string {
    return risuChatParser(text, {
        chara: options.name,
        chatID: options.idx,
        rmVar: true,
        visualize: true,
        cbsConditions: getDisplayCbsConditions(options.idx, options.firstMessage),
    })
}

/** ChatBody.svelte markParsing, untranslated branch. */
export function renderMarkdown(displayText: string, context: BodyContext): Promise<string> {
    return ParseMarkdown(displayText, context.character, 'notrim', context.idx, getBodyCbsConditions(context.role, context.firstMessage))
}

/** ChatBody.svelte: {@html addMetadataToElement(trimMarkdown(md), modelShortName)}. */
export function finalizeHtml(markdownHtml: string, modelShortName: string): string {
    return addMetadataToElement(trimMarkdown(markdownHtml), modelShortName)
}

/** Chat.svelte hasCustomUi: messages carrying card UI (<style> becomes <risu-style>). */
export function hasCustomUi(displayText: string): boolean {
    return displayText.includes('<style') || displayText.includes('risu-style')
}

/** Chat.svelte blankMessage. */
export function isBlankMessage(text: string, idx: number, isComment: boolean): boolean {
    return ((text === '{{none}}' || text === '{{blank}}' || text === '') && idx === -1) || isComment
}
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Run: `pnpm vitest run src/ts/chatCore/tests/messageRender.test.ts`
Expected: PASS, 7 тестов.

- [ ] **Шаг 5: Коммит**

```bash
git add src/ts/chatCore/messageRender.ts src/ts/chatCore/tests/messageRender.test.ts
git commit -m "feat(chat-core): port message display pipeline from Chat/ChatBody" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 5: Рендер сообщения — перевод и повторы

**Файлы:**
- Modify: `src/ts/chatCore/messageRender.ts`
- Test: `src/ts/chatCore/tests/messageRenderTranslation.test.ts`

**Интерфейсы:**
- Consumes: `getLLMCache` и `translateHTML` из `src/ts/translator/translator`; `postTranslationParse` из парсера; `alertError` из `src/ts/alert`; `DBState`.
- Produces:
  - `TRANSLATION_LOADING_HTML: string` — спиннер из `ChatBody` для `showTranslationLoading`.
  - `shouldAutoTranslate(displayText, context): Promise<boolean>`
  - `renderTranslatedMarkdown(displayText, context, { regenerate, onTranslating? }): Promise<string>`
  - `getTranslationCacheKey(displayText, { character, idx, firstMessage }): Promise<string>`
  - `renderBody(displayText, context, { translate, regenerate, onTranslating? }): Promise<string>` — до 4 попыток, затем `alertError` и исходный текст.

- [ ] **Шаг 1: Написать падающий тест**

`src/ts/chatCore/tests/messageRenderTranslation.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/storage/database.svelte', async () => (await import('./harness')).databaseMock())
vi.mock('src/ts/parser/parser.svelte', () => ({
    ParseMarkdown: vi.fn(),
    trimMarkdown: vi.fn(),
    addMetadataToElement: vi.fn(),
    postTranslationParse: vi.fn(),
    getDistance: vi.fn(() => 0),
}))
vi.mock('src/ts/process/scripts', () => ({ risuChatParser: vi.fn() }))
vi.mock('src/ts/translator/translator', () => ({ getLLMCache: vi.fn(), translateHTML: vi.fn() }))
vi.mock('src/ts/process/modules', () => ({ getModuleAssets: vi.fn(() => []) }))
vi.mock('src/ts/globalApi.svelte', () => ({ getFileSrc: vi.fn(async () => '') }))
vi.mock('src/ts/alert', () => ({ alertError: vi.fn() }))

import { alertError } from 'src/ts/alert'
import { ParseMarkdown, postTranslationParse } from 'src/ts/parser/parser.svelte'
import { getLLMCache, translateHTML } from 'src/ts/translator/translator'
import { getTranslationCacheKey, renderBody, renderTranslatedMarkdown, shouldAutoTranslate, type BodyContext } from '../messageRender'
import { DBState, currentChat, makeMessage, resetHarness } from './harness'

const character = { type: 'simple', chaId: 'cha-lira', customscript: [] } as any
const context: BodyContext = { character, idx: 1, role: 'char', firstMessage: false }

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    vi.mocked(ParseMarkdown).mockImplementation(async (text: string, _char: unknown, mode: string) => `<${mode}>${text}</${mode}>`)
    vi.mocked(postTranslationParse).mockImplementation(async (html: string) => `<post>${html}</post>`)
    vi.mocked(translateHTML).mockImplementation(async (html: string) => `tr(${html})`)
    vi.mocked(getLLMCache).mockResolvedValue(null)
    currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'Hello'))
})

describe('shouldAutoTranslate', () => {
    it('is off unless auto translation is enabled', async () => {
        await expect(shouldAutoTranslate('x', context)).resolves.toBe(false)
        DBState.db.autoTranslate = true
        await expect(shouldAutoTranslate('x', context)).resolves.toBe(true)
    })

    it('only translates cached messages in cached-only LLM mode', async () => {
        DBState.db.autoTranslate = true
        DBState.db.autoTranslateCachedOnly = true
        DBState.db.translatorType = 'llm'
        await expect(shouldAutoTranslate('x', context)).resolves.toBe(false)
        expect(getLLMCache).toHaveBeenCalledWith('<pretranslate>x</pretranslate>')
        vi.mocked(getLLMCache).mockResolvedValueOnce('cached')
        await expect(shouldAutoTranslate('x', context)).resolves.toBe(true)
        DBState.db.translateBeforeHTMLFormatting = true
        await shouldAutoTranslate('raw', context)
        expect(getLLMCache).toHaveBeenLastCalledWith('raw')
    })
})

describe('renderTranslatedMarkdown', () => {
    it('translates pre-rendered HTML and re-parses it by default', async () => {
        const flags: boolean[] = []
        const html = await renderTranslatedMarkdown('x', context, { regenerate: false, onTranslating: (active) => flags.push(active) })
        expect(ParseMarkdown).toHaveBeenCalledWith('x', character, 'pretranslate', 1, { firstmsg: false, chatRole: 'char' })
        expect(translateHTML).toHaveBeenCalledWith('<pretranslate>x</pretranslate>', false, character, 1, false)
        expect(html).toBe('<post>tr(<pretranslate>x</pretranslate>)</post>')
        expect(flags).toEqual([true, false])
    })

    it('translates the raw text first for LLM translation before HTML formatting', async () => {
        DBState.db.translatorType = 'llm'
        DBState.db.translateBeforeHTMLFormatting = true
        const html = await renderTranslatedMarkdown('x', context, { regenerate: true })
        expect(translateHTML).toHaveBeenCalledWith('x', false, character, 1, true)
        expect(html).toBe('<notrim>tr(x)</notrim>')
    })

    it('translates notrim HTML in legacy mode', async () => {
        DBState.db.legacyTranslation = true
        await expect(renderTranslatedMarkdown('x', context, { regenerate: false })).resolves.toBe('tr(<notrim>x</notrim>)')
    })
})

describe('getTranslationCacheKey', () => {
    it('uses the stored message role like Chat.svelte', async () => {
        await expect(getTranslationCacheKey('x', { character, idx: 0, firstMessage: false })).resolves.toBe('<pretranslate>x</pretranslate>')
        expect(ParseMarkdown).toHaveBeenCalledWith('x', character, 'pretranslate', 0, { firstmsg: false, chatRole: 'user' })
        DBState.db.translateBeforeHTMLFormatting = true
        await expect(getTranslationCacheKey('x', { character, idx: 0, firstMessage: false })).resolves.toBe('x')
    })
})

describe('renderBody', () => {
    it('renders without translation by default', async () => {
        await expect(renderBody('x', context, { translate: false, regenerate: false })).resolves.toBe('<notrim>x</notrim>')
        expect(translateHTML).not.toHaveBeenCalled()
    })

    it('renders the translated view when asked to', async () => {
        await expect(renderBody('x', context, { translate: true, regenerate: false })).resolves.toContain('tr(')
    })

    it('retries three times, then reports and falls back to the raw text', async () => {
        vi.mocked(ParseMarkdown).mockRejectedValue(new Error('parse failed'))
        await expect(renderBody('raw text', context, { translate: false, regenerate: false })).resolves.toBe('raw text')
        expect(ParseMarkdown).toHaveBeenCalledTimes(4)
        expect(alertError).toHaveBeenCalledTimes(1)
        expect(String(vi.mocked(alertError).mock.calls[0][0])).toContain('Error while parsing chat message')
    })

    it('recovers when a retry succeeds', async () => {
        vi.mocked(ParseMarkdown).mockRejectedValueOnce(new Error('flaky')).mockResolvedValueOnce('<p>ok</p>')
        await expect(renderBody('x', context, { translate: false, regenerate: false })).resolves.toBe('<p>ok</p>')
        expect(alertError).not.toHaveBeenCalled()
    })
})
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/ts/chatCore/tests/messageRenderTranslation.test.ts`
Expected: FAIL — `shouldAutoTranslate is not a function` (или ошибка импорта неизвестного экспорта).

- [ ] **Шаг 3: Дописать перевод в `messageRender.ts`**

Замените первую строку файла (импорт из парсера) этим блоком импортов:

```ts
import { addMetadataToElement, ParseMarkdown, postTranslationParse, trimMarkdown, type CbsConditions, type simpleCharacterArgument } from 'src/ts/parser/parser.svelte'
import { alertError } from 'src/ts/alert'
import { DBState } from 'src/ts/stores.svelte'
import { getLLMCache, translateHTML } from 'src/ts/translator/translator'
```

Строки `import { risuChatParser } …` и `import * as session …` остаются. Затем добавьте в конец файла:

```ts
/** ChatBody.svelte placeholder shown while a translation loads (showTranslationLoading). */
export const TRANSLATION_LOADING_HTML = '<div style="display:flex;justify-content:center;align-items:center;height:48px;"><div style="animation: spin 1s linear infinite; border-radius: 50%; height: 32px; width: 32px; border: 2px solid #3b82f6; border-top: 2px solid transparent;"></div></div><style>@keyframes spin { to { transform: rotate(360deg); } }</style>'

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/** ChatBody.svelte: decides the initial translated state of a message. */
export async function shouldAutoTranslate(displayText: string, context: BodyContext): Promise<boolean> {
    if (!DBState.db.autoTranslate) {
        return false
    }
    if (!(DBState.db.autoTranslateCachedOnly && DBState.db.translatorType === 'llm')) {
        return true
    }
    const cbs = getBodyCbsConditions(context.role, context.firstMessage)
    const cache = DBState.db.translateBeforeHTMLFormatting
        ? await getLLMCache(displayText)
        : !DBState.db.legacyTranslation
            ? await getLLMCache(await ParseMarkdown(displayText, context.character, 'pretranslate', context.idx, cbs))
            : await getLLMCache(await ParseMarkdown(displayText, context.character, 'notrim', context.idx, cbs))
    return cache !== null
}

/** ChatBody.svelte markParsing, translated branches. */
export async function renderTranslatedMarkdown(
    displayText: string,
    context: BodyContext,
    options: { regenerate: boolean; onTranslating?: (active: boolean) => void },
): Promise<string> {
    const cbs = getBodyCbsConditions(context.role, context.firstMessage)
    const setTranslating = options.onTranslating ?? (() => {})
    if (DBState.db.translatorType === 'llm' && DBState.db.translateBeforeHTMLFormatting) {
        await wait(100)
        setTranslating(true)
        let translated: string
        try {
            translated = await translateHTML(displayText, false, context.character, context.idx, options.regenerate)
        } finally {
            setTranslating(false)
        }
        return ParseMarkdown(translated, context.character, 'notrim', context.idx, cbs)
    }
    const mode = DBState.db.legacyTranslation ? 'notrim' : 'pretranslate'
    const marked = await ParseMarkdown(displayText, context.character, mode, context.idx, cbs)
    setTranslating(true)
    try {
        const translated = await translateHTML(marked, false, context.character, context.idx, options.regenerate)
        return mode === 'pretranslate' ? await postTranslationParse(translated) : translated
    } finally {
        setTranslating(false)
    }
}

/** Chat.svelte getTranslationCacheKey: uses the stored-message role, like the original. */
export async function getTranslationCacheKey(
    displayText: string,
    options: { character: RenderCharacter; idx: number; firstMessage: boolean },
): Promise<string> {
    if (DBState.db.translateBeforeHTMLFormatting) {
        return displayText
    }
    const cbs = getDisplayCbsConditions(options.idx, options.firstMessage)
    const mode = DBState.db.legacyTranslation ? 'notrim' : 'pretranslate'
    return ParseMarkdown(displayText, options.character, mode, options.idx, cbs)
}

/**
 * ChatBody.svelte markParsing error handling: the first attempt plus three retries,
 * then an error alert and the unrendered text.
 */
export async function renderBody(
    displayText: string,
    context: BodyContext,
    options: { translate: boolean; regenerate: boolean; onTranslating?: (active: boolean) => void },
): Promise<string> {
    let lastError: unknown = null
    for (let attempt = 0; attempt < 4; attempt++) {
        try {
            if (options.translate || options.regenerate) {
                return await renderTranslatedMarkdown(displayText, context, { regenerate: options.regenerate, onTranslating: options.onTranslating })
            }
            return await renderMarkdown(displayText, context)
        } catch (error) {
            lastError = error
        }
    }
    const error = lastError as Error
    alertError(`Error while parsing chat message: ${options.translate}, ${error?.message}, ${error?.stack}`)
    return displayText
}
```

- [ ] **Шаг 4: Запустить оба теста рендера и убедиться, что они проходят**

Run: `pnpm vitest run src/ts/chatCore/tests/messageRenderTranslation.test.ts src/ts/chatCore/tests/messageRender.test.ts`
Expected: PASS, 17 тестов.

- [ ] **Шаг 5: Коммит**

```bash
git add src/ts/chatCore/messageRender.ts src/ts/chatCore/tests/messageRenderTranslation.test.ts
git commit -m "feat(chat-core): port message translation and render retries" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 6: Рендер сообщения — изображения ассетов (`newImageHandlingBeta`)

**Файлы:**
- Modify: `src/ts/chatCore/messageRender.ts`
- Test: `src/ts/chatCore/tests/assetImages.test.ts`

**Интерфейсы:**
- Consumes: `getDistance` из парсера; `getModuleAssets` из `src/ts/process/modules`; `getCurrentCharacter` и тип `character` из `src/ts/storage/database.svelte`; `getFileSrc` из `src/ts/globalApi.svelte`.
- Produces: `fixAssetImages(root: HTMLElement | null): Promise<void>` — перенос `ChatBody.svelte` `checkImg`.

- [ ] **Шаг 1: Написать падающий тест**

`src/ts/chatCore/tests/assetImages.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/storage/database.svelte', async () => (await import('./harness')).databaseMock())
vi.mock('src/ts/parser/parser.svelte', () => ({
    ParseMarkdown: vi.fn(),
    trimMarkdown: vi.fn(),
    addMetadataToElement: vi.fn(),
    postTranslationParse: vi.fn(),
    getDistance: vi.fn((a: string, b: string) => Math.abs(a.length - b.length)),
}))
vi.mock('src/ts/process/scripts', () => ({ risuChatParser: vi.fn() }))
vi.mock('src/ts/translator/translator', () => ({ getLLMCache: vi.fn(), translateHTML: vi.fn() }))
vi.mock('src/ts/process/modules', () => ({ getModuleAssets: vi.fn(() => [['Module Map.png', 'assets/map.png', 'png']]) }))
vi.mock('src/ts/globalApi.svelte', () => ({ getFileSrc: vi.fn(async (path: string) => `blob:${path}`) }))
vi.mock('src/ts/alert', () => ({ alertError: vi.fn() }))

import { fixAssetImages } from '../messageRender'
import { DBState, currentCharacter, resetHarness } from './harness'

function imagesIn(html: string): { root: HTMLElement; images: HTMLImageElement[] } {
    const root = document.createElement('div')
    root.innerHTML = html
    return { root, images: Array.from(root.querySelectorAll('img')) }
}

beforeEach(() => {
    resetHarness({ newImageHandlingBeta: true })
    const character = currentCharacter()
    character.prebuiltAssetStyle = 'rounded'
    character.additionalAssets = [
        ['Portrait.png', 'assets/portrait.png', 'png'],
        ['smile_big.png', 'assets/smile.png', 'png'],
    ]
})

describe('fixAssetImages', () => {
    it('does nothing when the new image handling is off', async () => {
        DBState.db.newImageHandlingBeta = false
        const { root, images } = imagesIn('<img src="portrait.png">')
        await fixAssetImages(root)
        expect(images[0].getAttribute('src')).toBe('portrait.png')
    })

    it('resolves exact asset names case-insensitively, including module assets', async () => {
        const { root, images } = imagesIn('<img src="PORTRAIT.png"><img src="module map.png">')
        await fixAssetImages(root)
        expect(images[0].getAttribute('src')).toBe('blob:assets/portrait.png')
        expect(images[0].classList.contains('root-loaded-image')).toBe(true)
        expect(images[0].classList.contains('root-loaded-image-rounded')).toBe(true)
        expect(images[1].getAttribute('src')).toBe('blob:assets/map.png')
    })

    it('falls back to the closest asset sharing the name prefix', async () => {
        const { root, images } = imagesIn('<img src="smile.jpg">')
        await fixAssetImages(root)
        expect(images[0].getAttribute('src')).toBe('blob:assets/smile.png')
        expect(images[0].classList.contains('root-loaded-image')).toBe(true)
        expect(images[0].hasAttribute('noimage')).toBe(false)
    })

    it('marks names it cannot or should not resolve', async () => {
        const { root, images } = imagesIn('<img src="c:weird.png"><img src="ab"><img src="nothing.png">')
        await fixAssetImages(root)
        expect(images.map((img) => img.hasAttribute('noimage'))).toEqual([true, true, true])
    })

    it('leaves remote and inline images alone', async () => {
        const { root, images } = imagesIn('<img src="https://example.com/a.png"><img src="data:image/png;base64,AA">')
        await fixAssetImages(root)
        expect(images[0].getAttribute('src')).toBe('https://example.com/a.png')
        expect(images[1].hasAttribute('noimage')).toBe(false)
    })
})
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/ts/chatCore/tests/assetImages.test.ts`
Expected: FAIL — `fixAssetImages is not a function`.

- [ ] **Шаг 3: Дописать `fixAssetImages` в `messageRender.ts`**

Замените первую строку файла (импорт из парсера) этим блоком импортов:

```ts
import { addMetadataToElement, getDistance, ParseMarkdown, postTranslationParse, trimMarkdown, type CbsConditions, type simpleCharacterArgument } from 'src/ts/parser/parser.svelte'
import { getFileSrc } from 'src/ts/globalApi.svelte'
import { getModuleAssets } from 'src/ts/process/modules'
import { getCurrentCharacter, type character } from 'src/ts/storage/database.svelte'
```

Остальные импорты (`alertError`, `DBState`, `getLLMCache`/`translateHTML`, `risuChatParser`, `session`) остаются. Добавьте в конец файла:

```ts
const LOCAL_IMAGE_SELECTOR = 'img:not([src^="data:"]):not([src^="http:"]):not([src^="https:"]):not([src^="blob:"]):not([src^="file:"]):not([src^="tauri:"]):not([noimage])'

/** ChatBody.svelte checkImg: resolve bare asset names in <img src> (newImageHandlingBeta). */
export async function fixAssetImages(root: HTMLElement | null): Promise<void> {
    if (!DBState.db.newImageHandlingBeta || !root) {
        return
    }
    const images = Array.from(root.querySelectorAll<HTMLImageElement>(LOCAL_IMAGE_SELECTOR))
    if (images.length === 0) {
        return
    }
    const currentCharacter = getCurrentCharacter() as character
    const style = currentCharacter.prebuiltAssetStyle
    const assets = getModuleAssets().concat(currentCharacter.additionalAssets ?? [])
    const normalizedAssets = assets.map((asset) => ({ name: asset[0].toLocaleLowerCase(), path: asset[1] }))
    const exactAssets = new Map(normalizedAssets.map((asset) => [asset.name, asset.path]))

    await Promise.all(images.map(async (img) => {
        const name = img.getAttribute('src')?.toLocaleLowerCase() || ''
        if (name.length > 200 || name.includes(':')) {
            img.setAttribute('noimage', 'true')
            return
        }
        const exact = exactAssets.get(name)
        if (exact) {
            img.classList.add('root-loaded-image')
            img.classList.add('root-loaded-image-' + style)
            img.src = await getFileSrc(exact)
            return
        }
        if (name.length < 3) {
            img.setAttribute('noimage', 'true')
            return
        }
        const prefixEnd = name.lastIndexOf('.')
        const prefix = prefixEnd > 0 ? name.substring(0, prefixEnd) : ''
        let bestDistance = 1000
        let bestPath = ''
        for (const asset of normalizedAssets) {
            if (!asset.name.startsWith(prefix)) {
                continue
            }
            const distance = getDistance(name, asset.name)
            if (distance < bestDistance) {
                bestDistance = distance
                bestPath = asset.path
            }
        }
        if (!bestPath) {
            img.setAttribute('noimage', 'true')
            return
        }
        const resolved = await getFileSrc(bestPath)
        if (name === (img.getAttribute('src')?.toLocaleLowerCase() || '')) {
            img.setAttribute('src', resolved)
        }
        if (img.classList.length === 0) {
            img.classList.add('root-loaded-image')
            img.classList.add('root-loaded-image-' + style)
        }
        img.removeAttribute('noimage')
    }))
}
```

- [ ] **Шаг 4: Запустить все тесты рендера и убедиться, что они проходят**

Run: `pnpm vitest run src/ts/chatCore/tests/assetImages.test.ts src/ts/chatCore/tests/messageRender.test.ts src/ts/chatCore/tests/messageRenderTranslation.test.ts`
Expected: PASS, 22 теста.

- [ ] **Шаг 5: Коммит**

```bash
git add src/ts/chatCore/messageRender.ts src/ts/chatCore/tests/assetImages.test.ts
git commit -m "feat(chat-core): port asset image resolution for rendered messages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 7: Паритетный тест рендера (старый `ChatBody` против ядра)

**Файлы:**
- Test: `src/ts/chatCore/tests/renderParity.test.ts`

**Интерфейсы:**
- Consumes: настоящий `src/lib/ChatScreens/ChatBody.svelte`; настоящие `risuChatParser` и `ParseMarkdown` (регулярки, CBS, markdown, DOMPurify); `prepareDisplayText`, `renderBody`, `finalizeHtml` и тип `RenderCharacter` (Задачи 4–5).
- Produces: гарантию, что ядро выдаёт внутри `.chattext` тот же HTML, что и старый чат, для набора эталонных сообщений.

Этот тест должен пройти сразу: реализация уже есть. Если он падает, значит перенос в Задачах 4–5 расходится со старым кодом. Чинить нужно ядро, а не тест и не `ChatBody`.

Inlay-изображения из набора спецификации (§11.2) сюда не входят. Они хранятся в IndexedDB, которой нет в happy-dom, а их разбор (`parseInlayAssets` внутри `ParseMarkdown`) — общий код для старого и нового пути. Он уже покрыт тестом `src/ts/process/files/tests/inlays.test.ts`.

- [ ] **Шаг 1: Написать тест**

`src/ts/chatCore/tests/renderParity.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, unmount } from 'svelte'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/storage/database.svelte', async () => (await import('./harness')).databaseMock())
vi.mock('src/ts/globalApi.svelte', () => ({
    aiWatermarkingLawApplies: () => false,
    getFileSrc: () => Promise.resolve(''),
}))
vi.mock('src/ts/process/modules', async (importOriginal) => ({
    ...(await importOriginal<typeof import('src/ts/process/modules')>()),
    getModules: () => [],
    getModuleAssets: () => [],
    getModuleLorebooks: () => [],
    getModuleRegexScripts: () => [],
    getModuleTriggers: () => [],
}))
vi.mock('src/ts/process/triggers', async (importOriginal) => ({
    ...(await importOriginal<typeof import('src/ts/process/triggers')>()),
    runTrigger: vi.fn(async () => null),
}))
vi.mock('src/ts/translator/translator', () => ({
    getLLMCache: vi.fn(async () => null),
    setLLMCache: vi.fn(async () => undefined),
    translateHTML: vi.fn(async (html: string) => html),
}))
vi.mock('src/ts/alert', () => ({ alertError: vi.fn() }))

import ChatBody from 'src/lib/ChatScreens/ChatBody.svelte'
import { alertError } from 'src/ts/alert'
import { risuChatParser } from 'src/ts/process/scripts'
import { finalizeHtml, prepareDisplayText, renderBody, type RenderCharacter } from '../messageRender'
import { DBState, currentChat, makeGroup, makeMessage, resetHarness, selectCharacter, storesMock } from './harness'

interface RenderCase {
    idx: number
    role: 'user' | 'char'
    firstMessage: boolean
    name: string
    character: RenderCharacter
}

const mounted: unknown[] = []

function normalize(html: string): string {
    const container = document.createElement('div')
    container.innerHTML = html.replace(/<!--[\s\S]*?-->/g, '')
    return container.innerHTML.trim()
}

function lira(): RenderCharacter {
    return storesMock().createSimpleCharacter(DBState.db.characters[0])
}

/** The old path: Chat.svelte displaya + getCbsCondition (verbatim), then the real ChatBody. */
async function renderOld(message: string, c: RenderCase): Promise<string> {
    const msgDisplay = risuChatParser(message, {
        chara: c.name,
        chatID: c.idx,
        rmVar: true,
        visualize: true,
        cbsConditions: { firstmsg: c.firstMessage ?? false, chatRole: currentChat().message?.[c.idx]?.role ?? null },
    })
    const target = document.createElement('div')
    document.body.appendChild(target)
    mounted.push(mount(ChatBody, {
        target,
        props: {
            character: c.character,
            idx: c.idx,
            firstMessage: c.firstMessage,
            msgDisplay,
            role: c.role,
            translated: false,
            translating: false,
            retranslate: false,
            modelShortName: '',
            bodyRoot: null,
        },
    }))
    await vi.waitFor(() => {
        if (normalize(target.innerHTML) === '') {
            throw new Error('ChatBody has not rendered yet')
        }
    })
    return normalize(target.innerHTML)
}

/** The new path: chatCore. */
async function renderNew(message: string, c: RenderCase): Promise<string> {
    const displayText = prepareDisplayText(message, { name: c.name, idx: c.idx, firstMessage: c.firstMessage })
    const markdown = await renderBody(displayText, { character: c.character, idx: c.idx, role: c.role, firstMessage: c.firstMessage }, { translate: false, regenerate: false })
    return normalize(finalizeHtml(markdown, ''))
}

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    DBState.db.characters[0].customscript = [
        { comment: 'status', in: '\\[STATUS:(\\d+)\\]', out: '<div class="status">$1</div>', type: 'editdisplay', flag: 'g', ableFlag: true },
    ]
    currentChat().message.push(
        makeMessage('user', 'u0'),
        makeMessage('char', 'c1'),
        makeMessage('char', 'c2'),
        makeMessage('char', 'c3'),
        makeMessage('char', 'c4'),
        makeMessage('char', 'c5'),
        makeMessage('char', 'c6'),
    )
})

afterEach(async () => {
    await Promise.all(mounted.splice(0).map((component) => unmount(component as never)))
    document.body.replaceChildren()
})

const cases: Array<{ title: string; message: string; idx: number; role: 'user' | 'char'; expectContains: string }> = [
    { title: 'roleplay text with italics, bold and quotes', message: '*Лира поднимает взгляд.* «Для путника — найдётся.»\n\n**Жирный** и "кавычки"', idx: 1, role: 'char', expectContains: '<em>' },
    { title: 'a user message', message: 'Толкаю дверь. "Есть комната?"', idx: 0, role: 'user', expectContains: '<p>' },
    { title: 'markdown blocks', message: '# Заголовок\n\n- один\n- два\n\n```js\nconst a = 1\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |', idx: 2, role: 'char', expectContains: '<table' },
    { title: 'CBS macros that depend on the message index', message: 'Я {{char}}, ты {{user}}. Индекс: {{chatindex}}', idx: 3, role: 'char', expectContains: 'Индекс: 3' },
    { title: 'card CSS scoped to .chattext', message: '<style>.status{color:red}</style><div class="status">ok</div>', idx: 4, role: 'char', expectContains: 'x-risu-status' },
    { title: 'a trigger button', message: '{{button::Открыть::openDoor}}', idx: 5, role: 'char', expectContains: 'risu-trigger="openDoor"' },
    { title: 'a display regex from the character', message: 'Статус: [STATUS:42]', idx: 6, role: 'char', expectContains: 'x-risu-status' },
]

describe('render parity with the old ChatBody', () => {
    for (const testCase of cases) {
        it(`renders ${testCase.title} identically`, async () => {
            const c: RenderCase = {
                idx: testCase.idx,
                role: testCase.role,
                firstMessage: false,
                name: testCase.role === 'user' ? 'Traveller' : 'Lira',
                character: lira(),
            }
            const oldHtml = await renderOld(testCase.message, c)
            const newHtml = await renderNew(testCase.message, c)
            expect(newHtml).toBe(oldHtml)
            expect(newHtml).toContain(testCase.expectContains)
            expect(alertError).not.toHaveBeenCalled()
        })
    }

    it('renders the greeting (index -1) identically', async () => {
        const c: RenderCase = { idx: -1, role: 'char', firstMessage: true, name: 'Lira', character: lira() }
        const greeting = DBState.db.characters[0].firstMessage
        const oldHtml = await renderOld(greeting, c)
        const newHtml = await renderNew(greeting, c)
        expect(newHtml).toBe(oldHtml)
        expect(newHtml).toContain('Lira')
    })

    it('renders group messages without display scripts, identically', async () => {
        DBState.db.characters.push(makeGroup())
        selectCharacter(1)
        currentChat().message.push(makeMessage('char', 'x', { saying: 'cha-lira' }))
        const c: RenderCase = { idx: 0, role: 'char', firstMessage: false, name: 'Lame Raven', character: null }
        const message = 'Мы — {{char}}. [STATUS:7]'
        const oldHtml = await renderOld(message, c)
        const newHtml = await renderNew(message, c)
        expect(newHtml).toBe(oldHtml)
        expect(newHtml).toContain('Lame Raven')
        expect(newHtml).toContain('[STATUS:7]')
    })
})
```

- [ ] **Шаг 2: Запустить тест**

Run: `pnpm vitest run src/ts/chatCore/tests/renderParity.test.ts`
Expected: PASS, 9 тестов.

Если падает на импорте (не хватает экспорта в моке): добавьте недостающую функцию в соответствующий `vi.mock`. Образец — полностью замоканные модули в `src/ts/parser/tests/assetSrcSanitize.test.ts`. Если падает `expect(newHtml).toBe(oldHtml)`: найдите расхождение в аргументах ядра (Задачи 4–5) и исправьте ядро.

- [ ] **Шаг 3: Коммит**

```bash
git add src/ts/chatCore/tests/renderParity.test.ts
git commit -m "test(chat-core): pin render parity with the legacy ChatBody" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 8: Клики скриптов в сообщениях

**Файлы:**
- Create: `src/ts/chatCore/scriptedClicks.ts`
- Test: `src/ts/chatCore/tests/scriptedClicks.test.ts`

**Интерфейсы:**
- Consumes: `runTrigger` из `src/ts/process/triggers`; `runLuaButtonTrigger` из `src/ts/process/scriptings`; `getCurrentCharacter`, `getCurrentChat`, `setCurrentChat` из `src/ts/storage/database.svelte`; `ReloadChatPointer`, `CurrentTriggerIdStore` из `src/ts/stores.svelte`.
- Produces:
  - `SCRIPTED_SELECTOR = '[risu-trigger], [risu-btn]'`
  - `findScriptedOrigin(target: EventTarget | null): Element | null` — синхронная проверка, чтобы UI не открывал редактор по тапу на скриптовый элемент.
  - `handleScriptedClick(event: Event, idx: number): Promise<void>` — перенос `Chat.svelte` `handleButtonTriggerWithin`.

- [ ] **Шаг 1: Написать падающий тест**

`src/ts/chatCore/tests/scriptedClicks.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/storage/database.svelte', async () => (await import('./harness')).databaseMock())
vi.mock('src/ts/process/triggers', () => ({ runTrigger: vi.fn(async () => null) }))
vi.mock('src/ts/process/scriptings', () => ({ runLuaButtonTrigger: vi.fn(async () => null) }))

import { runLuaButtonTrigger } from 'src/ts/process/scriptings'
import { runTrigger } from 'src/ts/process/triggers'
import { findScriptedOrigin, handleScriptedClick } from '../scriptedClicks'
import { CurrentTriggerIdStore, DBState, ReloadChatPointer, currentChat, makeChat, makeGroup, makeMessage, resetHarness, selectCharacter } from './harness'

function clickInside(html: string, selector: string, idx: number): Promise<void> {
    const root = document.createElement('div')
    root.innerHTML = html
    let pending: Promise<void> = Promise.resolve()
    root.addEventListener('click', (event) => {
        pending = handleScriptedClick(event, idx)
    }, { capture: true })
    ;(root.querySelector(selector) as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    return pending
}

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    currentChat().message.push(makeMessage('user', 'hi'), makeMessage('char', 'hello'))
})

afterEach(() => {
    vi.useRealTimers()
})

describe('scriptedClicks', () => {
    it('finds the nearest scripted element', () => {
        const root = document.createElement('div')
        root.innerHTML = '<div risu-btn="x"><span id="inner">a</span></div><p id="plain">b</p>'
        expect(findScriptedOrigin(root.querySelector('#inner'))?.getAttribute('risu-btn')).toBe('x')
        expect(findScriptedOrigin(root.querySelector('#plain'))).toBeNull()
        expect(findScriptedOrigin(null)).toBeNull()
    })

    it('runs a manual trigger and writes the returned chat back', async () => {
        const updated = makeChat({ message: [makeMessage('char', 'changed by trigger')] })
        vi.mocked(runTrigger).mockResolvedValueOnce({ chat: updated } as never)
        await clickInside('<button risu-trigger="openDoor"><span>Open</span></button>', 'span', 1)
        expect(runTrigger).toHaveBeenCalledWith(DBState.db.characters[0], 'manual', {
            chat: expect.objectContaining({ id: 'chat-1' }),
            manualName: 'openDoor',
            triggerId: undefined,
        })
        expect(currentChat()).toBe(updated)
        expect(get(ReloadChatPointer)).toEqual({ 1: 1 })
    })

    it('passes risu-id and clears the trigger id shortly after', async () => {
        vi.useFakeTimers()
        CurrentTriggerIdStore.set('abc')
        await clickInside('<button risu-trigger="use" risu-id="abc">Use</button>', 'button', 1)
        expect(vi.mocked(runTrigger).mock.calls[0][2]).toMatchObject({ manualName: 'use', triggerId: 'abc' })
        expect(get(CurrentTriggerIdStore)).toBe('abc')
        vi.advanceTimersByTime(100)
        expect(get(CurrentTriggerIdStore)).toBeNull()
    })

    it('sends risu-btn clicks to Lua onButtonClick', async () => {
        await clickInside('<div risu-btn="choice-2"><b>Go</b></div>', 'b', 1)
        expect(runLuaButtonTrigger).toHaveBeenCalledWith(DBState.db.characters[0], 'choice-2')
        expect(runTrigger).not.toHaveBeenCalled()
        expect(get(ReloadChatPointer)).toEqual({})
    })

    it('prefers risu-trigger when both attributes are present', async () => {
        await clickInside('<button risu-trigger="t" risu-btn="b">x</button>', 'button', 1)
        expect(runTrigger).toHaveBeenCalledTimes(1)
        expect(runLuaButtonTrigger).not.toHaveBeenCalled()
    })

    it('does nothing in group chats', async () => {
        DBState.db.characters.push(makeGroup())
        selectCharacter(1)
        await clickInside('<button risu-trigger="t">x</button>', 'button', 0)
        expect(runTrigger).not.toHaveBeenCalled()
    })

    it('ignores clicks outside scripted elements', async () => {
        await clickInside('<p>plain</p>', 'p', 1)
        expect(runTrigger).not.toHaveBeenCalled()
        expect(runLuaButtonTrigger).not.toHaveBeenCalled()
    })
})
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/ts/chatCore/tests/scriptedClicks.test.ts`
Expected: FAIL — `Failed to resolve import "../scriptedClicks"`.

- [ ] **Шаг 3: Реализовать `scriptedClicks.ts`**

`src/ts/chatCore/scriptedClicks.ts`:

```ts
import { runLuaButtonTrigger } from 'src/ts/process/scriptings'
import { runTrigger } from 'src/ts/process/triggers'
import { getCurrentCharacter, getCurrentChat, setCurrentChat } from 'src/ts/storage/database.svelte'
import { CurrentTriggerIdStore, ReloadChatPointer } from 'src/ts/stores.svelte'

// Chat.svelte handleButtonTriggerWithin: capture-phase clicks on a message root run
// the card's manual triggers (risu-trigger) and Lua onButtonClick (risu-btn).

export const SCRIPTED_SELECTOR = '[risu-trigger], [risu-btn]'

export function findScriptedOrigin(target: EventTarget | null): Element | null {
    const element = target as Element | null
    if (!element || typeof element.closest !== 'function') {
        return null
    }
    return element.closest(SCRIPTED_SELECTOR)
}

export async function handleScriptedClick(event: Event, idx: number): Promise<void> {
    const currentChar = getCurrentCharacter()
    if (!currentChar || currentChar.type === 'group') {
        return
    }
    const origin = findScriptedOrigin(event.target)
    if (!origin) {
        return
    }
    const triggerName = origin.getAttribute('risu-trigger')
    const triggerId = origin.getAttribute('risu-id')
    const btnEvent = origin.getAttribute('risu-btn')

    const triggerResult = triggerName
        ? await runTrigger(currentChar, 'manual', {
            chat: getCurrentChat(),
            manualName: triggerName,
            triggerId: triggerId || undefined,
        })
        : btnEvent
            ? await runLuaButtonTrigger(currentChar, btnEvent)
            : null

    if (triggerResult) {
        setCurrentChat(triggerResult.chat)
        ReloadChatPointer.update((pointers) => {
            pointers[idx] = (pointers[idx] ?? 0) + 1
            return pointers
        })
    }

    if (triggerName && triggerId) {
        setTimeout(() => {
            CurrentTriggerIdStore.set(null)
        }, 100)
    }
}
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Run: `pnpm vitest run src/ts/chatCore/tests/scriptedClicks.test.ts`
Expected: PASS, 7 тестов.

- [ ] **Шаг 5: Коммит**

```bash
git add src/ts/chatCore/scriptedClicks.ts src/ts/chatCore/tests/scriptedClicks.test.ts
git commit -m "feat(chat-core): port risu-trigger and risu-btn click handling" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 9: Статус генерации и перехват ошибок

**Файлы:**
- Create: `src/ts/chatCore/generationStatus.svelte.ts`
- Test: `src/ts/chatCore/tests/generationStatus.test.ts`

**Интерфейсы:**
- Consumes: `chatProcessStage` из `src/ts/process/index.svelte`; `alertStore`, `DBState` из `src/ts/stores.svelte`.
- Produces:
  - `interface CapturedError { msg: string; submsg?: string; stackTrace?: string }`
  - `generationStatus` — реактивные поля `running`, `stage`, `startedAt`, `charIndex`, `error`, `autoMode`, `autoReplyPending`.
  - `beginGeneration({ charIndex, retry }): void`
  - `endGeneration(): void`
  - `showErrorDetails(): void`
  - `dismissError(): void`
  - `retryGeneration(): Promise<void>`

- [ ] **Шаг 1: Написать падающий тест**

`src/ts/chatCore/tests/generationStatus.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/process/index.svelte', async () => {
    const harness = await import('./harness')
    return { chatProcessStage: harness.chatProcessStage, doingChat: harness.doingChat }
})

import { beginGeneration, dismissError, endGeneration, generationStatus, retryGeneration, showErrorDetails } from '../generationStatus.svelte'
import { DBState, alertStore, chatProcessStage, resetHarness } from './harness'

beforeEach(() => {
    endGeneration()
    dismissError()
    resetHarness()
})

describe('generationStatus', () => {
    it('tracks running state, owner and stage', () => {
        beginGeneration({ charIndex: 2, retry: vi.fn(async () => {}) })
        expect(generationStatus.running).toBe(true)
        expect(generationStatus.charIndex).toBe(2)
        expect(generationStatus.startedAt).toBeGreaterThan(0)
        chatProcessStage.set(3)
        expect(generationStatus.stage).toBe(3)
        endGeneration()
        expect(generationStatus.running).toBe(false)
        expect(generationStatus.charIndex).toBe(-1)
        chatProcessStage.set(4)
        expect(generationStatus.stage).toBe(0)
    })

    it('turns error alerts raised during generation into an inline error', () => {
        beginGeneration({ charIndex: 0, retry: vi.fn(async () => {}) })
        alertStore.set({ type: 'error', msg: '429 Too Many Requests', submsg: '', stackTrace: 'trace' })
        expect(generationStatus.error).toEqual({ msg: '429 Too Many Requests', submsg: '', stackTrace: 'trace' })
        expect(get(alertStore).type).toBe('none')
    })

    it('ignores an error that was already on screen and lets other alerts through', () => {
        alertStore.set({ type: 'error', msg: 'old' })
        beginGeneration({ charIndex: 0, retry: vi.fn(async () => {}) })
        expect(generationStatus.error).toBeNull()
        expect(get(alertStore).msg).toBe('old')
        alertStore.set({ type: 'normal', msg: 'Lua says hi' })
        expect(get(alertStore).type).toBe('normal')
        expect(generationStatus.error).toBeNull()
    })

    it('does not capture when errors are inlaid into the chat, or after the generation ended', () => {
        DBState.db.inlayErrorResponse = true
        beginGeneration({ charIndex: 0, retry: vi.fn(async () => {}) })
        alertStore.set({ type: 'error', msg: 'x' })
        expect(generationStatus.error).toBeNull()
        endGeneration()
        DBState.db.inlayErrorResponse = false
        alertStore.set({ type: 'error', msg: 'y' })
        expect(get(alertStore).msg).toBe('y')
    })

    it('re-opens the original alert for details and retries the last action', async () => {
        const retry = vi.fn(async () => {})
        beginGeneration({ charIndex: 0, retry })
        alertStore.set({ type: 'error', msg: 'boom', stackTrace: 'st' })
        endGeneration()
        showErrorDetails()
        expect(get(alertStore)).toMatchObject({ type: 'error', msg: 'boom', stackTrace: 'st' })
        await retryGeneration()
        expect(retry).toHaveBeenCalledTimes(1)
        expect(generationStatus.error).toBeNull()
    })
})
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/ts/chatCore/tests/generationStatus.test.ts`
Expected: FAIL — `Failed to resolve import "../generationStatus.svelte"`.

- [ ] **Шаг 3: Реализовать `generationStatus.svelte.ts`**

`src/ts/chatCore/generationStatus.svelte.ts`:

```ts
import type { Unsubscriber } from 'svelte/store'
import { chatProcessStage } from 'src/ts/process/index.svelte'
import { alertStore, DBState } from 'src/ts/stores.svelte'

// UI-facing state of the running generation (spec §5.2, §6.6). While a generation
// started from the new chat runs, error alerts are captured and shown inline.

export interface CapturedError {
    msg: string
    submsg?: string
    stackTrace?: string
}

class GenerationStatus {
    running = $state(false)
    /** chatProcessStage: 1 prompt, 2 memory, 3 request/stream, 4 post-processing. */
    stage = $state(0)
    startedAt = $state(0)
    /** Character index the running generation belongs to; -1 when idle. */
    charIndex = $state(-1)
    error = $state<CapturedError | null>(null)
    autoMode = $state(false)
    autoReplyPending = $state(false)
}

export const generationStatus = new GenerationStatus()

let retryAction: (() => Promise<void>) | null = null
let unsubscribers: Unsubscriber[] = []

function stopListening(): void {
    for (const unsubscribe of unsubscribers) {
        unsubscribe()
    }
    unsubscribers = []
}

export function beginGeneration(options: { charIndex: number; retry: () => Promise<void> }): void {
    stopListening()
    retryAction = options.retry
    generationStatus.error = null
    generationStatus.running = true
    generationStatus.charIndex = options.charIndex
    generationStatus.startedAt = Date.now()
    unsubscribers.push(chatProcessStage.subscribe((stage) => {
        generationStatus.stage = stage
    }))
    if (DBState.db.inlayErrorResponse) {
        return
    }
    let initial = true
    unsubscribers.push(alertStore.subscribe((alert) => {
        if (initial || alert?.type !== 'error') {
            return
        }
        generationStatus.error = { msg: alert.msg, submsg: alert.submsg, stackTrace: alert.stackTrace }
        alertStore.set({ type: 'none', msg: '' })
    }))
    initial = false
}

export function endGeneration(): void {
    stopListening()
    generationStatus.running = false
    generationStatus.charIndex = -1
    generationStatus.stage = 0
}

export function showErrorDetails(): void {
    const error = generationStatus.error
    if (!error) {
        return
    }
    alertStore.set({ type: 'error', msg: error.msg, submsg: error.submsg, stackTrace: error.stackTrace })
}

export function dismissError(): void {
    generationStatus.error = null
}

export async function retryGeneration(): Promise<void> {
    const action = retryAction
    generationStatus.error = null
    if (action) {
        await action()
    }
}
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Run: `pnpm vitest run src/ts/chatCore/tests/generationStatus.test.ts`
Expected: PASS, 5 тестов.

- [ ] **Шаг 5: Коммит**

```bash
git add src/ts/chatCore/generationStatus.svelte.ts src/ts/chatCore/tests/generationStatus.test.ts
git commit -m "feat(chat-core): add generation status with inline error capture" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 10: Варианты ответа и реролл

**Файлы:**
- Modify: `src/ts/process/prereroll.ts` (только добавление в конец)
- Create: `src/ts/chatCore/alternatives.svelte.ts`
- Test: `src/ts/chatCore/tests/prereroll.test.ts`
- Test: `src/ts/chatCore/tests/alternatives.test.ts`

**Интерфейсы:**
- Consumes: `Prereroll`, `PreUnreroll` из `src/ts/process/prereroll`; `doingChat` из `src/ts/process/index.svelte`; `session.getChat`, `getMessages`, `getChatKey` (Задача 1).
- Produces:
  - `getPrerollState(genId: string): { index: number; total: number } | null` в `prereroll.ts`.
  - `resetAlternatives(key?: string): void`
  - `recordGeneration(key: string, messages: Message[], previousLength: number): void`
  - `reroll(generate: () => Promise<void>): Promise<void>`
  - `previousAlternative(): void`
  - `getAlternativesCounter(): { index: number; total: number } | null` — `null`, если вариант один.

- [ ] **Шаг 1: Написать падающие тесты**

`src/ts/chatCore/tests/prereroll.test.ts` (настоящий модуль, без моков):

```ts
import { describe, expect, it } from 'vitest'
import { addRerolls, getPrerollState, PreUnreroll, Prereroll } from 'src/ts/process/prereroll'

describe('getPrerollState', () => {
    it('reports the visible candidate among pre-generated rerolls', () => {
        expect(getPrerollState('unknown')).toBeNull()
        addRerolls('gen-a', ['one', 'two', 'three'])
        expect(getPrerollState('gen-a')).toEqual({ index: 0, total: 3 })
        expect(Prereroll('gen-a')).toBe('two')
        expect(getPrerollState('gen-a')).toEqual({ index: 1, total: 3 })
        expect(PreUnreroll('gen-a')).toBe('one')
        expect(getPrerollState('gen-a')).toEqual({ index: 0, total: 3 })
    })

    it('clamps past the last candidate', () => {
        addRerolls('gen-b', ['one', 'two'])
        Prereroll('gen-b')
        expect(Prereroll('gen-b')).toBeNull()
        expect(getPrerollState('gen-b')).toEqual({ index: 1, total: 2 })
    })
})
```

`src/ts/chatCore/tests/alternatives.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/process/index.svelte', async () => {
    const harness = await import('./harness')
    return { doingChat: harness.doingChat, chatProcessStage: harness.chatProcessStage }
})
vi.mock('src/ts/process/prereroll', () => ({
    Prereroll: vi.fn(() => null),
    PreUnreroll: vi.fn(() => null),
    getPrerollState: vi.fn(() => null),
}))

import { getPrerollState, PreUnreroll, Prereroll } from 'src/ts/process/prereroll'
import { getAlternativesCounter, previousAlternative, recordGeneration, reroll, resetAlternatives } from '../alternatives.svelte'
import { DBState, currentChat, doingChat, makeChat, makeMessage, resetHarness } from './harness'

function generationPushing(text: string) {
    return vi.fn(async () => {
        const chat = currentChat()
        const before = chat.message.length
        chat.message.push(makeMessage('char', text))
        recordGeneration(chat.id, chat.message, before)
    })
}

const texts = () => currentChat().message.map((m: any) => m.data)

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    vi.mocked(getPrerollState).mockReturnValue(null)
    resetAlternatives('chat-1')
    resetAlternatives('chat-2')
})

describe('alternatives', () => {
    it('has no counter until a reply has more than one variant', () => {
        const chat = currentChat()
        chat.message.push(makeMessage('user', 'Hi'), makeMessage('char', 'v1'))
        recordGeneration('chat-1', chat.message, 1)
        expect(getAlternativesCounter()).toBeNull()
    })

    it('rerolls, steps back and forward through variants', async () => {
        currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'v1'))
        const generate = generationPushing('v2')
        await reroll(generate)
        expect(generate).toHaveBeenCalledTimes(1)
        expect(texts()).toEqual(['Hi', 'v2'])
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })
        previousAlternative()
        expect(texts()).toEqual(['Hi', 'v1'])
        expect(getAlternativesCounter()).toEqual({ index: 1, total: 2 })
        previousAlternative()
        expect(texts()).toEqual(['Hi', 'v1'])
        await reroll(generate)
        expect(generate).toHaveBeenCalledTimes(1)
        expect(texts()).toEqual(['Hi', 'v2'])
    })

    it('uses pre-generated candidates before generating', async () => {
        currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'v1', { generationInfo: { generationId: 'gen-1' } }))
        vi.mocked(Prereroll).mockReturnValueOnce('cached v2')
        const generate = generationPushing('never')
        await reroll(generate)
        expect(Prereroll).toHaveBeenCalledWith('gen-1')
        expect(texts()).toEqual(['Hi', 'cached v2'])
        expect(generate).not.toHaveBeenCalled()
        vi.mocked(PreUnreroll).mockReturnValueOnce('v1')
        previousAlternative()
        expect(texts()).toEqual(['Hi', 'v1'])
        vi.mocked(getPrerollState).mockReturnValue({ index: 1, total: 3 })
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 3 })
    })

    it('keeps a separate history for every chat', async () => {
        const character = DBState.db.characters[0]
        character.chats.push(makeChat({ id: 'chat-2', message: [makeMessage('user', 'Yo'), makeMessage('char', 'a1')] }))
        currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'v1'))
        await reroll(generationPushing('v2'))
        character.chatPage = 1
        expect(getAlternativesCounter()).toBeNull()
        previousAlternative()
        expect(texts()).toEqual(['Yo', 'a1'])
        character.chatPage = 0
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })
    })

    it('rerolls the whole latest round of a group chat', async () => {
        currentChat().message.push(
            makeMessage('user', 'Q'),
            makeMessage('char', 'A1', { saying: 'a' }),
            makeMessage('char', 'B1', { saying: 'b' }),
            makeMessage('char', 'A2', { saying: 'a' }),
        )
        let seen: string[] = []
        await reroll(vi.fn(async () => {
            seen = texts()
        }))
        expect(seen).toEqual(['Q', 'A1'])
    })

    it('does nothing while a generation is running', async () => {
        currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'v1'))
        doingChat.set(true)
        const generate = generationPushing('v2')
        await reroll(generate)
        previousAlternative()
        expect(generate).not.toHaveBeenCalled()
        expect(texts()).toEqual(['Hi', 'v1'])
    })

    it('does not crash or generate when the chat has no user message', async () => {
        currentChat().message.push(makeMessage('char', 'narration only'))
        const generate = generationPushing('v2')
        await expect(reroll(generate)).resolves.toBeUndefined()
        expect(generate).not.toHaveBeenCalled()
        expect(texts()).toEqual(['narration only'])
    })
})
```

- [ ] **Шаг 2: Запустить тесты и убедиться, что они падают**

Run: `pnpm vitest run src/ts/chatCore/tests/prereroll.test.ts src/ts/chatCore/tests/alternatives.test.ts`
Expected: FAIL — нет экспорта `getPrerollState` и не резолвится `../alternatives.svelte`.

- [ ] **Шаг 3: Дописать `getPrerollState` в конец `src/ts/process/prereroll.ts`**

Существующие строки не меняйте. Добавьте в конец файла:

```ts

export function getPrerollState(genId:string):{index:number,total:number}|null{
    const values = rerolls[genId]
    if(!values || values.length === 0){
        return null
    }
    const index = Math.min(Math.max(rerollIndex[genId] ?? 0, 0), values.length - 1)
    return { index, total: values.length }
}
```

- [ ] **Шаг 4: Реализовать `alternatives.svelte.ts`**

`src/ts/chatCore/alternatives.svelte.ts`:

```ts
import { get } from 'svelte/store'
import { doingChat } from 'src/ts/process/index.svelte'
import { getPrerollState, PreUnreroll, Prereroll } from 'src/ts/process/prereroll'
import type { Message } from 'src/ts/storage/database.svelte'
import * as session from './session.svelte'

// Reroll history of DefaultChatScreen.svelte (`rerolls` / `rerollid`), kept per chat
// instead of per component: it survives leaving the chat screen and never leaks
// between chats of the same character.

interface AlternativesEntry {
    snapshots: Message[][]
    index: number
}

export interface AlternativesCounter {
    index: number
    total: number
}

const entries = new Map<string, AlternativesEntry>()
let version = $state(0)

function touch(): void {
    version += 1
}

function getEntry(key: string): AlternativesEntry {
    let entry = entries.get(key)
    if (!entry) {
        entry = { snapshots: [], index: -1 }
        entries.set(key, entry)
    }
    return entry
}

export function resetAlternatives(key: string = session.getChatKey()): void {
    entries.set(key, { snapshots: [], index: -1 })
    touch()
}

/** sendChatMain: remember the messages a generation appended. */
export function recordGeneration(key: string, messages: Message[], previousLength: number): void {
    if (previousLength >= messages.length) {
        return
    }
    const entry = getEntry(key)
    entry.snapshots.push(safeStructuredClone(messages.slice(previousLength)))
    entry.index = entry.snapshots.length - 1
    touch()
}

function applySnapshot(snapshot: Message[]): void {
    const chat = session.getChat()
    if (!chat) {
        return
    }
    const data = safeStructuredClone(snapshot)
    const messages = chat.message
    for (let i = 0; i < data.length; i++) {
        messages[messages.length - data.length + i] = data[i]
    }
    chat.message = messages
}

function lastGenerationId(): string | undefined {
    return session.getMessages().at(-1)?.generationInfo?.generationId
}

/** DefaultChatScreen.reroll: cached candidate, then history, then a new generation. */
export async function reroll(generate: () => Promise<void>): Promise<void> {
    if (get(doingChat)) {
        return
    }
    const chat = session.getChat()
    if (!chat) {
        return
    }
    const genId = lastGenerationId()
    if (genId) {
        const cached = Prereroll(genId)
        if (cached) {
            chat.message[chat.message.length - 1].data = cached
            touch()
            return
        }
    }
    const entry = getEntry(session.getChatKey())
    if (entry.index < entry.snapshots.length - 1) {
        if (Array.isArray(entry.snapshots[entry.index + 1])) {
            entry.index += 1
            applySnapshot(entry.snapshots[entry.index])
            touch()
        }
        return
    }
    if (entry.snapshots.length === 0 && chat.message.length > 0) {
        entry.snapshots.push(safeStructuredClone([chat.message[chat.message.length - 1]]))
        entry.index = entry.snapshots.length - 1
    }
    const messages = safeStructuredClone(chat.message)
    if (messages.length === 0) {
        return
    }
    // Drop the trailing replies back to the user turn; in group chats stop before
    // the previous reply of the same speaker, like the original.
    const saying = messages[messages.length - 1].saying
    let sayingQuota = 2
    while (messages.length > 0 && messages[messages.length - 1].role !== 'user') {
        if (messages[messages.length - 1].saying === saying) {
            sayingQuota -= 1
            if (sayingQuota === 0) {
                break
            }
        }
        messages.pop()
    }
    if (messages.length === 0) {
        return
    }
    chat.message = messages
    await generate()
}

/** DefaultChatScreen.unReroll. */
export function previousAlternative(): void {
    if (get(doingChat)) {
        return
    }
    const chat = session.getChat()
    if (!chat) {
        return
    }
    const genId = lastGenerationId()
    if (genId) {
        const cached = PreUnreroll(genId)
        if (cached) {
            chat.message[chat.message.length - 1].data = cached
            touch()
            return
        }
    }
    const entry = getEntry(session.getChatKey())
    if (entry.index <= 0) {
        return
    }
    if (Array.isArray(entry.snapshots[entry.index - 1])) {
        entry.index -= 1
        applySnapshot(entry.snapshots[entry.index])
        touch()
    }
}

/** 1-based position among known variants of the last reply; null when there is only one. */
export function getAlternativesCounter(): AlternativesCounter | null {
    void version
    const genId = lastGenerationId()
    if (genId) {
        const preroll = getPrerollState(genId)
        if (preroll && preroll.total > 1) {
            return { index: preroll.index + 1, total: preroll.total }
        }
    }
    const entry = entries.get(session.getChatKey())
    if (!entry || entry.snapshots.length < 2) {
        return null
    }
    return { index: entry.index + 1, total: entry.snapshots.length }
}
```

- [ ] **Шаг 5: Запустить тесты и убедиться, что они проходят**

Run: `pnpm vitest run src/ts/chatCore/tests/prereroll.test.ts src/ts/chatCore/tests/alternatives.test.ts`
Expected: PASS, 9 тестов.

- [ ] **Шаг 6: Коммит**

```bash
git add src/ts/process/prereroll.ts src/ts/chatCore/alternatives.svelte.ts src/ts/chatCore/tests/prereroll.test.ts src/ts/chatCore/tests/alternatives.test.ts
git commit -m "feat(chat-core): keep reroll alternatives per chat" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 11: Конвейер отправки

**Файлы:**
- Create: `src/ts/chatCore/sendPipeline.ts`
- Test: `src/ts/chatCore/tests/sendPipeline.test.ts`

**Интерфейсы:**
- Consumes:
  - `sendChat`, `doingChat` из `src/ts/process/index.svelte`;
  - `processMultiCommand` из `src/ts/process/command`;
  - `runTrigger` из `src/ts/process/triggers`;
  - `processScript` из `src/ts/process/scripts`;
  - `ConnectionOpenStore` из `src/ts/sync/multiuser`;
  - `generateAutoReply` из `src/ts/process/autoReply`;
  - `alertError`; `DBState`, `selectedCharID`;
  - звук `src/etc/send.mp3`;
  - `recordGeneration`, `resetAlternatives` (Задача 10);
  - `beginGeneration`, `endGeneration`, `generationStatus` (Задача 9);
  - `session.getChatKey`, `session.getMessages`.
- Produces:
  - `type SendOutcome = 'busy' | 'command' | 'sent'` — при `'command'` и `'sent'` UI очищает черновик и вложения.
  - `sendMessage(input: string, attachments?: string[], options?: { continueResponse?: boolean }): Promise<SendOutcome>`
  - `generate(options?: { continueResponse?: boolean }): Promise<void>`
  - `abortGeneration(): void`
  - `canContinue(): boolean`
  - `continueResponse(input: string, attachments?: string[]): Promise<SendOutcome>`
  - `toggleGroupAutoMode(): Promise<void>`
  - `requestAutoReply(): Promise<string | null>`
  - `playSendSound(): void`

- [ ] **Шаг 1: Написать падающий тест**

`src/ts/chatCore/tests/sendPipeline.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/process/index.svelte', async () => {
    const harness = await import('./harness')
    return { doingChat: harness.doingChat, chatProcessStage: harness.chatProcessStage, sendChat: vi.fn(async () => true) }
})
vi.mock('src/ts/process/command', () => ({ processMultiCommand: vi.fn(async () => false) }))
vi.mock('src/ts/process/triggers', () => ({ runTrigger: vi.fn(async () => null) }))
vi.mock('src/ts/process/scripts', () => ({ processScript: vi.fn(async (_char: unknown, text: string) => `edited:${text}`) }))
vi.mock('src/ts/sync/multiuser', async () => {
    const { writable } = await import('svelte/store')
    return { ConnectionOpenStore: writable(false) }
})
vi.mock('src/ts/process/autoReply', () => ({ generateAutoReply: vi.fn(async () => 'auto reply') }))
vi.mock('src/ts/alert', () => ({ alertError: vi.fn() }))
vi.mock('src/ts/process/prereroll', () => ({ Prereroll: vi.fn(() => null), PreUnreroll: vi.fn(() => null), getPrerollState: vi.fn(() => null) }))
vi.mock('src/etc/send.mp3', () => ({ default: 'send.mp3' }))

import { alertError } from 'src/ts/alert'
import { generateAutoReply } from 'src/ts/process/autoReply'
import { processMultiCommand } from 'src/ts/process/command'
import { sendChat } from 'src/ts/process/index.svelte'
import { processScript } from 'src/ts/process/scripts'
import { runTrigger } from 'src/ts/process/triggers'
import { ConnectionOpenStore } from 'src/ts/sync/multiuser'
import { getAlternativesCounter, reroll, resetAlternatives } from '../alternatives.svelte'
import { generationStatus } from '../generationStatus.svelte'
import { abortGeneration, canContinue, continueResponse, generate, requestAutoReply, sendMessage, toggleGroupAutoMode } from '../sendPipeline'
import { DBState, currentChat, doingChat, makeCharacter, makeChat, makeGroup, makeMessage, resetHarness, selectCharacter } from './harness'

let replyCount = 0

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    replyCount = 0
    resetAlternatives('chat-1')
    generationStatus.autoMode = false
    ConnectionOpenStore.set(false)
    vi.mocked(sendChat).mockImplementation(async () => {
        replyCount += 1
        currentChat().message.push(makeMessage('char', `reply ${replyCount}`))
        return true
    })
})

const texts = () => currentChat().message.map((m: any) => m.data)

describe('sendMessage', () => {
    it('refuses to send while a generation is running', async () => {
        doingChat.set(true)
        await expect(sendMessage('Hello')).resolves.toBe('busy')
        expect(sendChat).not.toHaveBeenCalled()
        expect(currentChat().message).toHaveLength(0)
    })

    it('treats slash commands as commands', async () => {
        vi.mocked(processMultiCommand).mockResolvedValueOnce('done' as never)
        await expect(sendMessage('/echo hi')).resolves.toBe('command')
        expect(processMultiCommand).toHaveBeenCalledWith('/echo hi')
        expect(sendChat).not.toHaveBeenCalled()
        expect(currentChat().message).toHaveLength(0)
    })

    it('runs the input trigger and editinput before pushing the user message', async () => {
        await expect(sendMessage('Hello')).resolves.toBe('sent')
        const character = DBState.db.characters[0]
        expect(runTrigger).toHaveBeenCalledWith(character, 'input', { chat: currentChat() })
        expect(processScript).toHaveBeenCalledWith(character, 'Hello', 'editinput')
        const [userMessage, reply] = currentChat().message
        expect(userMessage).toMatchObject({ role: 'user', data: 'edited:Hello', name: null })
        expect(typeof userMessage.time).toBe('number')
        expect(reply.data).toBe('reply 1')
        expect(sendChat).toHaveBeenCalledWith(-1, { signal: expect.any(AbortSignal), continue: false })
        expect(get(doingChat)).toBe(false)
        expect(generationStatus.running).toBe(false)
    })

    it('lets the input trigger replace the chat history', async () => {
        vi.mocked(runTrigger).mockResolvedValueOnce({ chat: makeChat({ message: [makeMessage('user', 'from trigger')] }) } as never)
        await sendMessage('Hello')
        expect(texts()).toEqual(['from trigger', 'edited:Hello', 'reply 1'])
    })

    it('appends attachments as inlay tokens', async () => {
        await sendMessage('Look', ['img-1', 'img-2'])
        expect(processScript).toHaveBeenCalledWith(DBState.db.characters[0], 'Look{{inlayed::img-1}}{{inlayed::img-2}}', 'editinput')
    })

    it('sends "says nothing" for an empty message when enabled', async () => {
        currentChat().message.push(makeMessage('char', 'Well?'))
        await sendMessage('')
        expect(currentChat().message[1]).toMatchObject({ role: 'user', data: '*says nothing*' })
        expect(runTrigger).not.toHaveBeenCalled()
    })

    it('adds nothing for an empty message when "says nothing" is off', async () => {
        DBState.db.useSayNothing = false
        currentChat().message.push(makeMessage('char', 'Well?'))
        await sendMessage('')
        expect(texts()).toEqual(['Well?', 'reply 1'])
    })

    it('pushes raw text in group chats without input scripts', async () => {
        DBState.db.characters.push(makeGroup())
        selectCharacter(1)
        await sendMessage('Hello all')
        expect(currentChat().message[0]).toMatchObject({ role: 'user', data: 'Hello all' })
        expect(runTrigger).not.toHaveBeenCalled()
        expect(processScript).not.toHaveBeenCalled()
    })

    it('names the sender in multiuser rooms', async () => {
        ConnectionOpenStore.set(true)
        await sendMessage('Hello')
        expect(currentChat().message[0].name).toBe('Traveller')
    })

    it('continues the last reply', async () => {
        currentChat().message.push(makeMessage('user', 'Q'), makeMessage('char', 'A'))
        await continueResponse('')
        expect(sendChat).toHaveBeenCalledWith(-1, { signal: expect.any(AbortSignal), continue: true })
    })
})

describe('canContinue', () => {
    it('allows continuing only right after a character reply', () => {
        expect(canContinue()).toBe(false)
        currentChat().message.push(makeMessage('char', 'A'))
        expect(canContinue()).toBe(false)
        currentChat().message.unshift(makeMessage('user', 'Q'))
        expect(canContinue()).toBe(true)
        currentChat().message.push(makeMessage('user', 'more'))
        expect(canContinue()).toBe(false)
    })
})

describe('generate', () => {
    it('records each generation as a reroll alternative', async () => {
        await sendMessage('Hello')
        await reroll(() => generate())
        expect(texts()).toEqual(['edited:Hello', 'reply 2'])
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })
    })

    it('keeps the history with the chat that started the generation', async () => {
        DBState.db.characters.push(makeCharacter({ name: 'Born', chaId: 'cha-born', chats: [makeChat({ id: 'chat-born' })] }))
        currentChat().message.push(makeMessage('user', 'Hi'))
        let count = 0
        vi.mocked(sendChat).mockImplementation(async () => {
            count += 1
            DBState.db.characters[0].chats[0].message.push(makeMessage('char', `r${count}`))
            selectCharacter(1)
            return true
        })
        await generate()
        selectCharacter(0)
        await generate()
        selectCharacter(0)
        expect(getAlternativesCounter()).toEqual({ index: 2, total: 2 })
    })

    it('reports failures and always releases the chat', async () => {
        const failure = new Error('boom')
        vi.mocked(sendChat).mockRejectedValueOnce(failure)
        await generate()
        expect(alertError).toHaveBeenCalledWith(failure)
        expect(get(doingChat)).toBe(false)
        expect(generationStatus.running).toBe(false)
    })

    it('aborts the running generation', async () => {
        let receivedSignal: AbortSignal | undefined
        vi.mocked(sendChat).mockImplementationOnce(async (_index, arg) => {
            receivedSignal = arg.signal
            await new Promise<void>((resolve) => arg.signal.addEventListener('abort', () => resolve()))
            return false
        })
        const running = generate()
        abortGeneration()
        await running
        expect(receivedSignal?.aborted).toBe(true)
    })
})

describe('requestAutoReply', () => {
    it('returns the generated reply', async () => {
        await expect(requestAutoReply()).resolves.toBe('auto reply')
        expect(generationStatus.autoReplyPending).toBe(false)
    })

    it('does nothing while a generation runs', async () => {
        doingChat.set(true)
        await expect(requestAutoReply()).resolves.toBeNull()
        expect(generateAutoReply).not.toHaveBeenCalled()
    })

    it('reports errors', async () => {
        vi.mocked(generateAutoReply).mockRejectedValueOnce(new Error('no model'))
        await expect(requestAutoReply()).resolves.toBeNull()
        expect(alertError).toHaveBeenCalledWith('Error: no model')
    })
})

describe('toggleGroupAutoMode', () => {
    it('keeps generating until toggled off', async () => {
        DBState.db.characters.push(makeGroup())
        selectCharacter(1)
        let calls = 0
        vi.mocked(sendChat).mockImplementation(async () => {
            calls += 1
            if (calls === 2) {
                await toggleGroupAutoMode()
            }
            return true
        })
        await toggleGroupAutoMode()
        expect(calls).toBe(2)
        expect(generationStatus.autoMode).toBe(false)
    })
})
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/ts/chatCore/tests/sendPipeline.test.ts`
Expected: FAIL — `Failed to resolve import "../sendPipeline"`.

- [ ] **Шаг 3: Реализовать `sendPipeline.ts`**

`src/ts/chatCore/sendPipeline.ts`:

```ts
import { get } from 'svelte/store'
import sendSound from 'src/etc/send.mp3'
import { alertError } from 'src/ts/alert'
import { generateAutoReply } from 'src/ts/process/autoReply'
import { processMultiCommand } from 'src/ts/process/command'
import { doingChat, sendChat } from 'src/ts/process/index.svelte'
import { processScript } from 'src/ts/process/scripts'
import { runTrigger } from 'src/ts/process/triggers'
import { DBState, selectedCharID } from 'src/ts/stores.svelte'
import { ConnectionOpenStore } from 'src/ts/sync/multiuser'
import { recordGeneration, resetAlternatives } from './alternatives.svelte'
import { beginGeneration, endGeneration, generationStatus } from './generationStatus.svelte'
import * as session from './session.svelte'

// Sending and generating exactly like DefaultChatScreen.svelte (sendMain, sendChatMain,
// abortChat, runAutoMode, runAutoReply), without the component state.

export type SendOutcome = 'busy' | 'command' | 'sent'

let abortController: AbortController | null = null

function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function chatOf(charIndex: number) {
    const character = DBState.db.characters[charIndex]
    return character.chats[character.chatPage]
}

export function playSendSound(): void {
    if (!DBState.db.playMessage) {
        return
    }
    const audio = new Audio(sendSound)
    audio.play().catch(() => {})
}

/** DefaultChatScreen.sendChatMain. */
export async function generate(options: { continueResponse?: boolean } = {}): Promise<void> {
    const charIndex = get(selectedCharID)
    const chatKey = session.getChatKey()
    const previousLength = chatOf(charIndex).message.length
    abortController = new AbortController()
    beginGeneration({ charIndex, retry: () => generate(options) })
    try {
        await sendChat(-1, { signal: abortController.signal, continue: options.continueResponse ?? false })
        recordGeneration(chatKey, chatOf(charIndex).message, previousLength)
    } catch (error) {
        console.error(error)
        alertError(error)
    }
    endGeneration()
    doingChat.set(false)
    playSendSound()
}

/** DefaultChatScreen.abortChat. */
export function abortGeneration(): void {
    abortController?.abort()
}

/** "Continue" is offered only right after a character reply (DefaultChatScreen menu). */
export function canContinue(): boolean {
    const messages = session.getMessages()
    return messages.length >= 2 && messages[messages.length - 1].role === 'char'
}

/** DefaultChatScreen.sendMain. */
export async function sendMessage(input: string, attachments: string[] = [], options: { continueResponse?: boolean } = {}): Promise<SendOutcome> {
    const charIndex = get(selectedCharID)
    if (get(doingChat)) {
        return 'busy'
    }
    const character = DBState.db.characters[charIndex]
    let messages = character.chats[character.chatPage].message
    let text = input

    if (text.startsWith('/')) {
        const commandProcessed = await processMultiCommand(text)
        if (commandProcessed !== false) {
            return 'command'
        }
    }

    for (const file of attachments) {
        text += `{{inlayed::${file}}}`
    }

    const multiuserName = get(ConnectionOpenStore) ? DBState.db.username : null
    if (text === '') {
        if (character.type !== 'group') {
            if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
                if (DBState.db.useSayNothing) {
                    messages.push({ role: 'user', data: '*says nothing*', name: multiuserName })
                }
            }
        }
    } else if (character.type === 'character') {
        const triggerResult = await runTrigger(character, 'input', { chat: character.chats[character.chatPage] })
        if (triggerResult) {
            messages = triggerResult.chat.message
        }
        messages.push({ role: 'user', data: await processScript(character, text, 'editinput'), time: Date.now(), name: multiuserName })
    } else {
        messages.push({ role: 'user', data: text, time: Date.now(), name: multiuserName })
    }

    const target = DBState.db.characters[charIndex]
    target.chats[target.chatPage].message = messages
    resetAlternatives()
    await wait(10)
    await generate({ continueResponse: options.continueResponse })
    return 'sent'
}

/** DefaultChatScreen.sendContinue: sends the draft (if any), then continues the reply. */
export function continueResponse(input: string, attachments: string[] = []): Promise<SendOutcome> {
    return sendMessage(input, attachments, { continueResponse: true })
}

/** DefaultChatScreen.runAutoMode: group chats keep generating until toggled off. */
export async function toggleGroupAutoMode(): Promise<void> {
    if (generationStatus.autoMode) {
        generationStatus.autoMode = false
        return
    }
    const charIndex = get(selectedCharID)
    generationStatus.autoMode = true
    while (generationStatus.autoMode) {
        await generate()
        if (charIndex !== get(selectedCharID)) {
            generationStatus.autoMode = false
        }
    }
}

/** DefaultChatScreen.runAutoReply: returns the suggested user reply, or null. */
export async function requestAutoReply(): Promise<string | null> {
    if (generationStatus.autoReplyPending || get(doingChat)) {
        return null
    }
    generationStatus.autoReplyPending = true
    try {
        return await generateAutoReply()
    } catch (error) {
        alertError(`${error}`)
        return null
    } finally {
        generationStatus.autoReplyPending = false
    }
}
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Run: `pnpm vitest run src/ts/chatCore/tests/sendPipeline.test.ts`
Expected: PASS, 19 тестов.

- [ ] **Шаг 5: Коммит**

```bash
git add src/ts/chatCore/sendPipeline.ts src/ts/chatCore/tests/sendPipeline.test.ts
git commit -m "feat(chat-core): port the send and generate pipeline" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 12: Действия над сообщением

**Файлы:**
- Create: `src/ts/chatCore/messageActions.svelte.ts`
- Modify: `src/lang/en.ts` (перед `} satisfies I18nTranslation;`)
- Modify: `src/lang/ru.ts` (перед `} satisfies Record<string, any>;`)
- Test: `src/ts/chatCore/tests/messageActions.test.ts`

**Интерфейсы:**
- Consumes:
  - `alertConfirm`, `alertInput`, `alertRequestData` из `src/ts/alert`;
  - `changeChatTo`, `createChatCopyName` из `src/ts/globalApi.svelte`;
  - `sayTTS` из `src/ts/process/tts`;
  - `setLLMCache` из `src/ts/translator/translator`;
  - `getUserName` из `src/ts/util`;
  - `language` из `src/lang`; `DBState`; `session` (Задача 1).
- Produces:
  - `removeMessage(idx): Promise<boolean>`
  - `removeMessagesFrom(idx): Promise<boolean>`
  - `saveMessageEdit(idx, text): boolean`
  - `isBookmarked(idx): boolean`
  - `defaultBookmarkName(content): string`
  - `toggleBookmark(idx): Promise<void>`
  - `branchFromMessage(idx): boolean`
  - `toggleHidden(idx): void`
  - `toggleHiddenBefore(idx): void`
  - `showGenerationInfo(idx, fallback?): void`
  - `speakMessage(text)`
  - `getGreetingText(): string`
  - `getGreetingCounter(): { index: number; total: number } | null`
  - `nextGreeting(): void`
  - `previousGreeting(): void`
  - `saveTranslationEdit(key, text): Promise<void>`
  - Строка `language.mobileChat.removeFromHereConfirm`.

- [ ] **Шаг 1: Добавить строки локализации**

В `src/lang/en.ts` сразу после строки `    localToggles: "Local Toggles",` (перед `} satisfies I18nTranslation;`) вставьте:

```ts
    mobileChat: {
        removeFromHereConfirm: "Remove this message and every message below it?",
    },
```

В `src/lang/ru.ts` сразу после строки `    applyAdditionalParamsToAll: "Применять дополнительные параметры ко всем моделям",` (перед `} satisfies Record<string, any>;`) вставьте:

```ts
    mobileChat: {
        removeFromHereConfirm: "Удалить это сообщение и все сообщения ниже?",
    },
```

- [ ] **Шаг 2: Написать падающий тест**

`src/ts/chatCore/tests/messageActions.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/alert', () => ({ alertConfirm: vi.fn(async () => true), alertInput: vi.fn(async () => ''), alertRequestData: vi.fn() }))
vi.mock('src/ts/globalApi.svelte', () => ({ changeChatTo: vi.fn(), createChatCopyName: vi.fn((name: string, type: string) => `${name} (${type})`) }))
vi.mock('src/ts/process/tts', () => ({ sayTTS: vi.fn(async () => {}) }))
vi.mock('src/ts/translator/translator', () => ({ setLLMCache: vi.fn(async () => {}) }))
vi.mock('src/ts/util', () => ({ getUserName: vi.fn(() => 'Traveller') }))

import { language } from 'src/lang'
import { alertConfirm, alertInput, alertRequestData } from 'src/ts/alert'
import { changeChatTo } from 'src/ts/globalApi.svelte'
import { sayTTS } from 'src/ts/process/tts'
import { setLLMCache } from 'src/ts/translator/translator'
import {
    branchFromMessage,
    defaultBookmarkName,
    getGreetingCounter,
    getGreetingText,
    isBookmarked,
    nextGreeting,
    previousGreeting,
    removeMessage,
    removeMessagesFrom,
    saveMessageEdit,
    saveTranslationEdit,
    showGenerationInfo,
    speakMessage,
    toggleBookmark,
    toggleHidden,
    toggleHiddenBefore,
} from '../messageActions.svelte'
import { DBState, currentCharacter, currentChat, makeMessage, resetHarness } from './harness'

const texts = () => currentChat().message.map((m: any) => m.data)

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    vi.mocked(alertConfirm).mockResolvedValue(true)
    vi.mocked(alertInput).mockResolvedValue('')
    currentChat().message.push(
        makeMessage('user', 'Hi', { chatId: 'm0' }),
        makeMessage('char', 'Hello there', { chatId: 'm1', generationInfo: { model: 'opus', generationId: 'g1' } }),
        makeMessage('user', 'Bye', { chatId: 'm2' }),
    )
})

describe('removing', () => {
    it('removes one message after confirmation', async () => {
        await expect(removeMessage(1)).resolves.toBe(true)
        expect(alertConfirm).toHaveBeenCalledWith(language.removeChat)
        expect(texts()).toEqual(['Hi', 'Bye'])
    })

    it('keeps the message when the user declines', async () => {
        vi.mocked(alertConfirm).mockResolvedValueOnce(false)
        await expect(removeMessage(1)).resolves.toBe(false)
        expect(texts()).toEqual(['Hi', 'Hello there', 'Bye'])
    })

    it('skips the confirmation when askRemoval is off', async () => {
        DBState.db.askRemoval = false
        await removeMessage(0)
        expect(alertConfirm).not.toHaveBeenCalled()
        expect(texts()).toEqual(['Hello there', 'Bye'])
    })

    it('removes a message and everything below it', async () => {
        await expect(removeMessagesFrom(1)).resolves.toBe(true)
        expect(alertConfirm).toHaveBeenCalledWith(language.mobileChat.removeFromHereConfirm)
        expect(texts()).toEqual(['Hi'])
    })
})

describe('editing and hiding', () => {
    it('saves an edited message', () => {
        expect(saveMessageEdit(1, 'Edited')).toBe(true)
        expect(texts()).toEqual(['Hi', 'Edited', 'Bye'])
    })

    it('toggles hiding a message and everything before it from the AI', () => {
        toggleHidden(1)
        expect(currentChat().message[1].disabled).toBe(true)
        toggleHidden(1)
        expect(currentChat().message[1].disabled).toBe(false)
        toggleHiddenBefore(1)
        expect(currentChat().message[1].disabled).toBe('allBefore')
        toggleHiddenBefore(1)
        expect(currentChat().message[1].disabled).toBe(false)
    })
})

describe('bookmarks', () => {
    it('bookmarks with the given name and removes it again', async () => {
        vi.mocked(alertInput).mockResolvedValueOnce('Important')
        await toggleBookmark(1)
        expect(isBookmarked(1)).toBe(true)
        expect(currentChat().bookmarkNames.m1).toBe('Important')
        await toggleBookmark(1)
        expect(isBookmarked(1)).toBe(false)
        expect(currentChat().bookmarkNames.m1).toBeUndefined()
    })

    it('names unnamed bookmarks after the sender and the message', async () => {
        await toggleBookmark(1)
        expect(currentChat().bookmarkNames.m1).toBe('Lira| Hello there...')
        await toggleBookmark(0)
        expect(currentChat().bookmarkNames.m0).toBe('Traveller| Hi...')
    })

    it('gives legacy messages an id before bookmarking them', async () => {
        delete currentChat().message[2].chatId
        await toggleBookmark(2)
        const id = currentChat().message[2].chatId
        expect(typeof id).toBe('string')
        expect(currentChat().bookmarks).toContain(id)
    })

    it('builds default names from the second half, skipping markup lines', () => {
        expect(defaultBookmarkName('intro\nmore\n*action*\nThe actual line')).toBe('The actual line...')
        expect(defaultBookmarkName('*only markup*')).toBe('*only markup*...')
    })
})

describe('branching', () => {
    it('copies the chat up to the message into a new branch with a marker', () => {
        expect(branchFromMessage(1)).toBe(true)
        const character = currentCharacter()
        const branch = character.chats[0]
        expect(branch.name).toBe('Chat 1 (Branch)')
        expect(branch.id).not.toBe('chat-1')
        expect(branch.message.map((m: any) => m.data)).toEqual([
            'Hi',
            'Hello there',
            '{{specialcomment::branchedfrom::chat-1::Chat 1::m1::}}',
        ])
        expect(branch.message[2]).toMatchObject({ isComment: true, disabled: true })
        expect(character.chats[1].id).toBe('chat-1')
        expect(character.chatFolders[0].name).toBe('Branches of Chat 1')
        expect(character.chats[1].folderId).toBe(character.chatFolders[0].id)
        expect(changeChatTo).toHaveBeenCalledWith(0)
    })
})

describe('info, speech and translation', () => {
    it('opens the generation info of a message', () => {
        showGenerationInfo(1)
        expect(alertRequestData).toHaveBeenCalledWith({ genInfo: { model: 'opus', generationId: 'g1' }, idx: 1 })
        vi.mocked(alertRequestData).mockClear()
        showGenerationInfo(0)
        expect(alertRequestData).not.toHaveBeenCalled()
    })

    it('speaks text and saves edited translations', async () => {
        await speakMessage('Hello there')
        expect(sayTTS).toHaveBeenCalledWith(null, 'Hello there')
        await saveTranslationEdit('key', 'Привет')
        expect(setLLMCache).toHaveBeenCalledWith('key', 'Привет')
    })
})

describe('greetings', () => {
    it('cycles through alternate greetings', () => {
        const character = currentCharacter()
        character.alternateGreetings = ['Alt one', 'Alt two']
        expect(getGreetingText()).toBe(character.firstMessage)
        expect(getGreetingCounter()).toEqual({ index: 1, total: 3 })
        nextGreeting()
        expect(getGreetingText()).toBe('Alt one')
        nextGreeting()
        nextGreeting()
        expect(currentChat().fmIndex).toBe(-1)
        previousGreeting()
        expect(getGreetingText()).toBe('Alt two')
        expect(getGreetingCounter()).toEqual({ index: 3, total: 3 })
    })

    it('treats a missing greeting index as the first message', () => {
        delete currentChat().fmIndex
        expect(getGreetingText()).toBe(currentCharacter().firstMessage)
        expect(getGreetingCounter()).toBeNull()
    })
})

describe('the greeting (index -1)', () => {
    it('ignores every index-based action on the greeting', async () => {
        const before = JSON.stringify(currentChat())
        await expect(removeMessage(-1)).resolves.toBe(false)
        await expect(removeMessagesFrom(-1)).resolves.toBe(false)
        expect(saveMessageEdit(-1, 'x')).toBe(false)
        await toggleBookmark(-1)
        expect(branchFromMessage(-1)).toBe(false)
        toggleHidden(-1)
        toggleHiddenBefore(-1)
        expect(JSON.stringify(currentChat())).toBe(before)
        expect(currentCharacter().chats).toHaveLength(1)
    })
})
```

- [ ] **Шаг 3: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/ts/chatCore/tests/messageActions.test.ts`
Expected: FAIL — `Failed to resolve import "../messageActions.svelte"`.

- [ ] **Шаг 4: Реализовать `messageActions.svelte.ts`**

`src/ts/chatCore/messageActions.svelte.ts`:

```ts
import { v4 } from 'uuid'
import { language } from 'src/lang'
import { alertConfirm, alertInput, alertRequestData } from 'src/ts/alert'
import { changeChatTo, createChatCopyName } from 'src/ts/globalApi.svelte'
import { sayTTS } from 'src/ts/process/tts'
import type { MessageGenerationInfo } from 'src/ts/storage/database.svelte'
import { DBState } from 'src/ts/stores.svelte'
import { setLLMCache } from 'src/ts/translator/translator'
import { getUserName } from 'src/ts/util'
import * as session from './session.svelte'

// Message actions of Chat.svelte and the greeting controls of DefaultChatScreen.svelte.
// Every index-based action is a no-op for the greeting (index -1).

const BOOKMARK_NAME_BLACKLIST = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '-', '=', '[', ']', '{', '}', '|', ';', ':', '"', "'", ',', '.', '<', '>', '/', '?']

export async function removeMessage(idx: number): Promise<boolean> {
    if (!session.getMessage(idx)) {
        return false
    }
    const confirmed = DBState.db.askRemoval ? await alertConfirm(language.removeChat) : true
    if (!confirmed) {
        return false
    }
    const chat = session.getChat()
    const messages = chat.message
    messages.splice(idx, 1)
    chat.message = messages
    return true
}

export async function removeMessagesFrom(idx: number): Promise<boolean> {
    if (!session.getMessage(idx)) {
        return false
    }
    const confirmed = await alertConfirm(language.mobileChat.removeFromHereConfirm)
    if (!confirmed) {
        return false
    }
    const chat = session.getChat()
    chat.message = chat.message.slice(0, idx)
    return true
}

export function saveMessageEdit(idx: number, text: string): boolean {
    const message = session.getMessage(idx)
    if (!message) {
        return false
    }
    message.data = text
    return true
}

export function isBookmarked(idx: number): boolean {
    const id = session.getMessage(idx)?.chatId
    if (!id) {
        return false
    }
    return session.getChat()?.bookmarks?.includes(id) ?? false
}

export function defaultBookmarkName(content: string): string {
    const lines = content.split('\n')
    const secondHalf = lines.splice(Math.floor(lines.length * 0.5))
    for (const line of secondHalf) {
        if (line && !BOOKMARK_NAME_BLACKLIST.some((c) => line.startsWith(c))) {
            return line.trim().slice(0, 50) + '...'
        }
    }
    return content.slice(0, 50) + '...'
}

export async function toggleBookmark(idx: number): Promise<void> {
    const chat = session.getChat()
    const message = session.getMessage(idx)
    if (!chat || !message) {
        return
    }
    let messageId = message.chatId
    if (!messageId) {
        messageId = v4()
        message.chatId = messageId
    }
    chat.bookmarks ??= []
    chat.bookmarkNames ??= {}
    const existing = chat.bookmarks.indexOf(messageId)
    if (existing > -1) {
        chat.bookmarks.splice(existing, 1)
        delete chat.bookmarkNames[messageId]
    } else {
        chat.bookmarks.push(messageId)
        const sender = message.role === 'user' ? getUserName() : session.getCharacter()?.name
        const name = await alertInput(language.bookmarkAskNameOrDefault, [], chat.bookmarkNames[messageId] || '')
        chat.bookmarkNames[messageId] = name && name.trim() !== '' ? name : `${sender}| ${defaultBookmarkName(message.data)}`
    }
    chat.bookmarks = [...chat.bookmarks]
}

export function branchFromMessage(idx: number): boolean {
    const character = session.getCharacter()
    const currentChat = session.getChat()
    const currentMessage = session.getMessage(idx)
    if (!character || !currentChat || !currentMessage) {
        return false
    }
    if (DBState.db.createFolderOnBranch && !currentChat.folderId) {
        const folderId = v4()
        character.chatFolders ??= []
        character.chatFolders.unshift({ id: folderId, name: `Branches of ${currentChat.name}`, folded: false })
        currentChat.folderId = folderId
    }
    const newChat = $state.snapshot(currentChat)
    newChat.name = createChatCopyName(newChat.name, 'Branch')
    newChat.id = v4()
    newChat.message = newChat.message.slice(0, idx + 1)
    newChat.message.push({
        role: 'char',
        data: '{{specialcomment::branchedfrom::' + currentChat.id + '::' + currentChat.name + '::' + currentMessage.chatId + '::}}',
        isComment: true,
        disabled: true,
        chatId: v4(),
    })
    character.chats.unshift(newChat)
    changeChatTo(0)
    return true
}

export function toggleHidden(idx: number): void {
    const message = session.getMessage(idx)
    if (!message) {
        return
    }
    message.disabled = !message.disabled
}

export function toggleHiddenBefore(idx: number): void {
    const message = session.getMessage(idx)
    if (!message) {
        return
    }
    message.disabled = message.disabled === 'allBefore' ? false : 'allBefore'
}

export function showGenerationInfo(idx: number, fallback: MessageGenerationInfo | null = null): void {
    const genInfo = idx >= 0 ? session.getMessage(idx)?.generationInfo : fallback
    if (!genInfo) {
        return
    }
    alertRequestData({ genInfo, idx })
}

export function speakMessage(text: string) {
    return sayTTS(null, text)
}

export function getGreetingText(): string {
    const character = session.getCharacter()
    const chat = session.getChat()
    if (!character || character.type === 'group' || !chat) {
        return ''
    }
    const index = chat.fmIndex ?? -1
    return index === -1 ? character.firstMessage : character.alternateGreetings[index] ?? ''
}

export function getGreetingCounter(): { index: number; total: number } | null {
    const character = session.getCharacter()
    const chat = session.getChat()
    if (!character || character.type === 'group' || !chat || character.alternateGreetings.length === 0) {
        return null
    }
    return { index: (chat.fmIndex ?? -1) + 2, total: character.alternateGreetings.length + 1 }
}

export function nextGreeting(): void {
    const character = session.getCharacter()
    const chat = session.getChat()
    if (!character || character.type === 'group' || !chat) {
        return
    }
    const index = chat.fmIndex ?? -1
    chat.fmIndex = index >= character.alternateGreetings.length - 1 ? -1 : index + 1
}

export function previousGreeting(): void {
    const character = session.getCharacter()
    const chat = session.getChat()
    if (!character || character.type === 'group' || !chat) {
        return
    }
    const index = chat.fmIndex ?? -1
    chat.fmIndex = index === -1 ? character.alternateGreetings.length - 1 : index - 1
}

export function saveTranslationEdit(key: string, text: string): Promise<void> {
    return setLLMCache(key, text)
}
```

- [ ] **Шаг 5: Запустить тест и убедиться, что он проходит**

Run: `pnpm vitest run src/ts/chatCore/tests/messageActions.test.ts`
Expected: PASS, 16 тестов.

- [ ] **Шаг 6: Коммит**

```bash
git add src/ts/chatCore/messageActions.svelte.ts src/ts/chatCore/tests/messageActions.test.ts src/lang/en.ts src/lang/ru.ts
git commit -m "feat(chat-core): port message actions with greeting guards" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 13: Копирование сообщения

**Файлы:**
- Create: `src/ts/chatCore/copyMessage.ts`
- Test: `src/ts/chatCore/tests/copyMessage.test.ts`

**Интерфейсы:**
- Consumes:
  - `ParseMarkdown` из парсера;
  - `getCurrentCharacter` из `src/ts/storage/database.svelte`;
  - `getFileSrc` из `src/ts/globalApi.svelte`;
  - `getUserIcon`, `getUserName` из `src/ts/util`;
  - `alertWait`, `alertNormal`, `alertClear` из `src/ts/alert`;
  - `language`;
  - `getDisplayCbsConditions` (Задача 4).
- Produces:
  - `interface CopyRequest { copyText: string; idx: number; firstMessage: boolean; role: string | null; senderName: string; modelLabel: string | null; characterImage: string }`
  - `type CopyResult = 'rich' | 'plain'`
  - `copyMessage(request: CopyRequest): Promise<CopyResult>` — при `'plain'` UI показывает тост «Скопировано».

- [ ] **Шаг 1: Написать падающий тест**

`src/ts/chatCore/tests/copyMessage.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/storage/database.svelte', async () => (await import('./harness')).databaseMock())
vi.mock('src/ts/parser/parser.svelte', () => ({
    ParseMarkdown: vi.fn(async (text: string) => `<p>${text}</p>`),
    trimMarkdown: vi.fn(),
    addMetadataToElement: vi.fn(),
    postTranslationParse: vi.fn(),
    getDistance: vi.fn(() => 0),
}))
vi.mock('src/ts/process/scripts', () => ({ risuChatParser: vi.fn() }))
vi.mock('src/ts/translator/translator', () => ({ getLLMCache: vi.fn(), translateHTML: vi.fn() }))
vi.mock('src/ts/process/modules', () => ({ getModuleAssets: vi.fn(() => []) }))
vi.mock('src/ts/globalApi.svelte', () => ({ getFileSrc: vi.fn(async () => '') }))
vi.mock('src/ts/alert', () => ({ alertClear: vi.fn(), alertNormal: vi.fn(), alertWait: vi.fn(), alertError: vi.fn() }))
vi.mock('src/ts/util', () => ({ getUserIcon: vi.fn(() => ''), getUserName: vi.fn(() => 'Traveller') }))

import { language } from 'src/lang'
import { alertClear, alertNormal } from 'src/ts/alert'
import { ParseMarkdown } from 'src/ts/parser/parser.svelte'
import { copyMessage, type CopyRequest } from '../copyMessage'
import { currentChat, makeMessage, resetHarness } from './harness'

type ClipboardItemStub = { items: Record<string, Blob> }

const clipboard = {
    write: vi.fn(async (_items: ClipboardItemStub[]) => {}),
    writeText: vi.fn(async (_text: string) => {}),
}

const request: CopyRequest = {
    copyText: 'Hello there',
    idx: 1,
    firstMessage: false,
    role: 'char',
    senderName: 'Lira',
    modelLabel: 'Opus',
    characterImage: '',
}

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    currentChat().message.push(makeMessage('user', 'Hi'), makeMessage('char', 'Hello there'))
    Object.defineProperty(window.navigator, 'clipboard', { value: clipboard, configurable: true })
    vi.stubGlobal('ClipboardItem', class {
        items: Record<string, Blob>
        constructor(items: Record<string, Blob>) {
            this.items = items
        }
    })
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe('copyMessage', () => {
    it('copies a rich card together with plain text', async () => {
        await expect(copyMessage(request)).resolves.toBe('rich')
        expect(ParseMarkdown).toHaveBeenCalledWith('Hello there', expect.objectContaining({ name: 'Lira' }), 'normal', 1, { firstmsg: false, chatRole: 'char' })
        const [items] = clipboard.write.mock.calls[0]
        expect(await items[0].items['text/plain'].text()).toBe('Hello there')
        const html = await items[0].items['text/html'].text()
        expect(html).toContain('Lira')
        expect(html).toContain('Opus')
        expect(html).toContain('<p')
        expect(html).toContain('From Risuai')
        expect(alertNormal).toHaveBeenCalledWith(language.copied)
    })

    it('shows the persona name and no model badge for user messages', async () => {
        await copyMessage({ ...request, idx: 0, role: 'user', modelLabel: null })
        const [items] = clipboard.write.mock.calls[0]
        const html = await items[0].items['text/html'].text()
        expect(html).toContain('Traveller')
        expect(html).not.toContain('>User<')
    })

    it('falls back to plain text when the rich copy fails', async () => {
        clipboard.write.mockRejectedValueOnce(new Error('denied'))
        await expect(copyMessage(request)).resolves.toBe('plain')
        expect(alertClear).toHaveBeenCalled()
        expect(clipboard.writeText).toHaveBeenCalledWith('Hello there')
    })

    it('uses plain text when the clipboard cannot hold rich content', async () => {
        Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: clipboard.writeText }, configurable: true })
        await expect(copyMessage(request)).resolves.toBe('plain')
        expect(clipboard.writeText).toHaveBeenCalledWith('Hello there')
    })
})
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/ts/chatCore/tests/copyMessage.test.ts`
Expected: FAIL — `Failed to resolve import "../copyMessage"`.

- [ ] **Шаг 3: Реализовать `copyMessage.ts`**

`src/ts/chatCore/copyMessage.ts`:

```ts
import { language } from 'src/lang'
import { alertClear, alertNormal, alertWait } from 'src/ts/alert'
import { getFileSrc } from 'src/ts/globalApi.svelte'
import { ParseMarkdown } from 'src/ts/parser/parser.svelte'
import { getCurrentCharacter } from 'src/ts/storage/database.svelte'
import { getUserIcon, getUserName } from 'src/ts/util'
import { getDisplayCbsConditions } from './messageRender'

// "Copy" of Chat.svelte: an HTML card for rich-text targets plus plain text,
// or plain text only when the rich clipboard is unavailable or fails.

export interface CopyRequest {
    /** Display text of the message (Chat.svelte msgDisplay, or the prepared raw stream). */
    copyText: string
    idx: number
    firstMessage: boolean
    role: string | null
    /** Name shown on the card for character messages. */
    senderName: string
    /** Capitalized model short name, or null when the message has no generation info. */
    modelLabel: string | null
    /** Character image reference used as the card avatar. */
    characterImage: string
}

export type CopyResult = 'rich' | 'plain'

const EMBEDDABLE_PREFIXES = ['http://asset.localhost', 'https://asset.localhost', 'https://sv.risuai', 'data:', 'http', '/']

function isEmbeddable(url: string | null | undefined): boolean {
    return !!url && EMBEDDABLE_PREFIXES.some((prefix) => url.startsWith(prefix))
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}

async function toJpegDataUrl(url: string, quality: number): Promise<string | null> {
    const response = await fetch(url.startsWith('/') ? window.location.origin + url : url)
    if (!response.ok) {
        return null
    }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    const loaded = new Promise<boolean>((resolve) => {
        image.onload = () => resolve(true)
        image.onerror = () => resolve(false)
    })
    image.src = await blobToDataUrl(await response.blob())
    if (!(await loaded)) {
        return null
    }
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    canvas.getContext('2d')?.drawImage(image, 0, 0)
    return canvas.toDataURL('image/jpeg', quality)
}

async function resolveAvatar(reference: string): Promise<string | null> {
    try {
        const src = (await getFileSrc(reference ?? '')) ?? ''
        if (!isEmbeddable(src)) {
            return null
        }
        if (src.startsWith('data:')) {
            return src
        }
        return await toJpegDataUrl(src, 0.9)
    } catch (error) {
        console.error('Icon error:', error)
        return null
    }
}

function applyTextColors(doc: Document, root: HTMLElement): void {
    const color = (name: string) => root.style.getPropertyValue(name)
    doc.querySelectorAll('mark').forEach((el) => {
        const kind = el.getAttribute('risu-mark')
        if (kind === 'quote1' || kind === 'quote2') {
            const replacement = doc.createElement('div')
            replacement.textContent = el.textContent
            replacement.setAttribute('style', `background: transparent; color: ${color('--FontColorQuote' + kind.slice(-1))};`)
            el.replaceWith(replacement)
        }
    })
    doc.querySelectorAll('p').forEach((el) => el.setAttribute('style', `color: ${color('--FontColorStandard')};`))
    doc.querySelectorAll('em').forEach((el) => el.setAttribute('style', `font-style: italic; color: ${color('--FontColorItalic')};`))
    doc.querySelectorAll('strong').forEach((el) => el.setAttribute('style', `font-weight: bold; color: ${color('--FontColorBold')};`))
    doc.querySelectorAll('em strong, strong em').forEach((el) => {
        el.setAttribute('style', `font-weight: bold; font-style: italic; color: ${color('--FontColorItalicBold')};`)
    })
}

async function inlineImages(doc: Document): Promise<void> {
    for (const img of Array.from(doc.querySelectorAll('img'))) {
        img.setAttribute('alt', 'from Risuai')
        const url = img.getAttribute('src')
        img.setAttribute('style', 'max-width: 100%; margin: 10px 0; border-radius: 8px; box-shadow: rgba(0,0,0,0.1) 0px 2px 8px; display: block; margin-left: auto; margin-right: auto;')
        if (!isEmbeddable(url)) {
            continue
        }
        try {
            const dataUrl = await toJpegDataUrl(url, 0.6)
            if (dataUrl) {
                img.setAttribute('src', dataUrl)
            }
        } catch (error) {
            console.error('Image error:', error)
        }
    }
}

function buildCard(root: HTMLElement, card: { bodyHtml: string; displayName: string; isUser: boolean; modelInfo: string; avatar: string | null }): string {
    const v = (name: string) => root.style.getPropertyValue(name)
    return `<div style="font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: ${v('--risu-theme-textcolor')}; line-height: 1.6; max-width: 600px; margin: 1rem auto; background: ${v('--risu-theme-bgcolor')}; border-radius: 12px; box-shadow: 0px 4px 12px rgba(0,0,0,0.15); overflow: hidden;">
<div style="padding: 20px;">
<div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 1rem; text-align: center;">
    ${card.avatar ? `<img style="width: 80px; height: 80px; border-radius: 50%; border: 3px solid ${v('--risu-theme-darkborderc')}; margin-bottom: 0.75rem; object-fit: cover;" src="${card.avatar}" alt="profile">` : ''}
    <h3 style="color: ${v('--risu-theme-textcolor')}; font-weight: 600; font-size: 1.5rem; margin: 0 0 0.5rem 0;">${card.displayName}</h3>
    ${!card.isUser ? `<span style="display: inline-block; border-radius: 16px; font-size: 0.8rem; padding: 0.25rem 0.75rem; background: ${v('--risu-theme-darkbg')}; color: ${v('--risu-theme-textcolor')}; border: 1px solid ${v('--risu-theme-darkborderc')};">${card.modelInfo}</span>` : ''}
</div>
<div style="border-top: 1px solid ${v('--risu-theme-darkborderc')}; padding-top: 1rem;">
    ${card.bodyHtml}
</div>
<div style="text-align: center; margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid ${v('--risu-theme-darkborderc')};">
    <span style="font-size: 0.75rem; color: ${v('--risu-theme-textcolor2')}; opacity: 0.7;">From Risuai</span>
</div>
</div>
</div>`
}

export async function copyMessage(request: CopyRequest): Promise<CopyResult> {
    const clipboard = window.navigator.clipboard
    if (clipboard?.write) {
        try {
            alertWait(language.loading)
            const root = document.querySelector(':root') as HTMLElement
            const parsed = await ParseMarkdown(request.copyText, getCurrentCharacter(), 'normal', request.idx, getDisplayCbsConditions(request.idx, request.firstMessage))
            const doc = new DOMParser().parseFromString(parsed, 'text/html')
            applyTextColors(doc, root)
            await inlineImages(doc)
            const isUser = request.role === 'user'
            let avatar: string | null
            if (isUser) {
                const userIcon = getUserIcon()
                avatar = userIcon ? await resolveAvatar(userIcon) : null
            } else {
                avatar = await resolveAvatar(request.characterImage)
            }
            const html = buildCard(root, {
                bodyHtml: doc.body.innerHTML,
                displayName: isUser ? getUserName() : request.senderName,
                isUser,
                modelInfo: request.modelLabel ?? (isUser ? 'User' : 'AI'),
                avatar,
            })
            await clipboard.write([
                new ClipboardItem({
                    'text/plain': new Blob([request.copyText], { type: 'text/plain' }),
                    'text/html': new Blob([html], { type: 'text/html' }),
                }),
            ])
            alertNormal(language.copied)
            return 'rich'
        } catch {
            alertClear()
        }
    }
    await clipboard?.writeText(request.copyText)
    return 'plain'
}
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Run: `pnpm vitest run src/ts/chatCore/tests/copyMessage.test.ts`
Expected: PASS, 4 теста.

- [ ] **Шаг 5: Коммит**

```bash
git add src/ts/chatCore/copyMessage.ts src/ts/chatCore/tests/copyMessage.test.ts
git commit -m "feat(chat-core): port rich message copy" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 14: Окно сообщений

**Файлы:**
- Create: `src/ts/chatCore/messageWindow.svelte.ts`
- Test: `src/ts/chatCore/tests/messageWindow.test.ts`

**Интерфейсы:**
- Consumes: `getInitialChatLoadPages`, `getAdditionalChatLoadPages` из `src/ts/chatLoadPages`; `chatFoldedState`, `chatFoldedStateMessageIndex` из `src/ts/globalApi.svelte`; `coldStorageHeader`, `preLoadChat` из `src/ts/process/coldstorage.svelte`; `DBState`; `session`.
- Produces:
  - `class MessageWindow` с реактивным полем `loadPages` и методами:
    - `reset()`
    - `visibleIndices(total): number[]` — от новых к старым
    - `loadOlder(total): boolean`
    - `expandFolded()`
    - `ensureLoaded(index, total)`
    - `showsGreeting(total): boolean`
    - `loadAll()`
  - `isFolded(): boolean`
  - `needsColdStorageLoad(): boolean`
  - `loadColdStorage(): Promise<unknown>`

- [ ] **Шаг 1: Написать падающий тест**

`src/ts/chatCore/tests/messageWindow.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('src/ts/stores.svelte', async () => (await import('./harness')).storesMock())
vi.mock('src/ts/globalApi.svelte', () => ({ chatFoldedState: { data: null }, chatFoldedStateMessageIndex: { index: -1 } }))
vi.mock('src/ts/process/coldstorage.svelte', () => ({ coldStorageHeader: '@@cold@@', preLoadChat: vi.fn(async () => true) }))

import { chatFoldedState, chatFoldedStateMessageIndex } from 'src/ts/globalApi.svelte'
import { preLoadChat } from 'src/ts/process/coldstorage.svelte'
import { isFolded, loadColdStorage, MessageWindow, needsColdStorageLoad } from '../messageWindow.svelte'
import { DBState, currentChat, makeMessage, resetHarness } from './harness'

beforeEach(() => {
    resetHarness()
    vi.clearAllMocks()
    chatFoldedStateMessageIndex.index = -1
    chatFoldedState.data = null
})

describe('MessageWindow', () => {
    it('starts with the configured page size and lists the newest messages first', () => {
        const view = new MessageWindow()
        expect(view.loadPages).toBe(30)
        const indices = view.visibleIndices(40)
        expect(indices).toHaveLength(30)
        expect(indices[0]).toBe(39)
        expect(indices.at(-1)).toBe(10)
        expect(view.visibleIndices(5)).toEqual([4, 3, 2, 1, 0])
    })

    it('reads the initial page size from settings', () => {
        DBState.db.chatLoadInitialPages = 10
        expect(new MessageWindow().loadPages).toBe(10)
    })

    it('loads older messages in steps while there are more', () => {
        const view = new MessageWindow()
        expect(view.loadOlder(40)).toBe(true)
        expect(view.loadPages).toBe(45)
        expect(view.loadOlder(45)).toBe(false)
        expect(view.loadPages).toBe(45)
    })

    it('shows the folded range and expands it', () => {
        chatFoldedStateMessageIndex.index = 20
        chatFoldedState.data = { targetCharacterId: 'cha-lira', targetChatId: 'chat-1', targetMessageId: 'm' }
        const view = new MessageWindow()
        expect(isFolded()).toBe(true)
        expect(view.visibleIndices(100)[0]).toBe(20)
        expect(view.visibleIndices(100).at(-1)).toBe(0)
        view.expandFolded()
        expect(view.loadPages).toBe(51)
        expect(chatFoldedState.data).toBeNull()
    })

    it('loads enough messages to reach a target and knows when the greeting is visible', () => {
        const view = new MessageWindow()
        view.ensureLoaded(5, 100)
        expect(view.loadPages).toBe(100)
        expect(view.showsGreeting(100)).toBe(true)
        view.reset()
        expect(view.showsGreeting(31)).toBe(false)
        view.loadAll()
        expect(view.showsGreeting(10_000)).toBe(true)
    })
})

describe('cold storage', () => {
    it('detects and loads chats kept in cold storage', async () => {
        expect(needsColdStorageLoad()).toBe(false)
        currentChat().message.push(makeMessage('char', '@@cold@@payload'))
        expect(needsColdStorageLoad()).toBe(true)
        await loadColdStorage()
        expect(preLoadChat).toHaveBeenCalledWith(0, 0)
    })
})
```

- [ ] **Шаг 2: Запустить тест и убедиться, что он падает**

Run: `pnpm vitest run src/ts/chatCore/tests/messageWindow.test.ts`
Expected: FAIL — `Failed to resolve import "../messageWindow.svelte"`.

- [ ] **Шаг 3: Реализовать `messageWindow.svelte.ts`**

`src/ts/chatCore/messageWindow.svelte.ts`:

```ts
import { getAdditionalChatLoadPages, getInitialChatLoadPages } from 'src/ts/chatLoadPages'
import { chatFoldedState, chatFoldedStateMessageIndex } from 'src/ts/globalApi.svelte'
import { coldStorageHeader, preLoadChat } from 'src/ts/process/coldstorage.svelte'
import { DBState } from 'src/ts/stores.svelte'
import * as session from './session.svelte'

// Which messages the feed mounts (Chats.svelte loadStart/loadEnd + DefaultChatScreen
// loadPages). No virtualization beyond this window: CSS from card messages must keep
// applying to every mounted .chattext (spec §5.1, §7.2).

export class MessageWindow {
    loadPages = $state(getInitialChatLoadPages(DBState.db))

    reset(): void {
        this.loadPages = getInitialChatLoadPages(DBState.db)
    }

    /** Indices to mount, newest first. */
    visibleIndices(total: number): number[] {
        let loadStart = total - 1
        let loadEnd = total - this.loadPages
        if (chatFoldedStateMessageIndex.index !== -1) {
            loadStart = chatFoldedStateMessageIndex.index
            loadEnd = Math.max(0, chatFoldedStateMessageIndex.index - this.loadPages)
        }
        const indices: number[] = []
        for (let i = loadStart; i >= loadEnd; i--) {
            if (i < 0) {
                break
            }
            indices.push(i)
        }
        return indices
    }

    /** DefaultChatScreen onscroll near the top. Returns whether more became visible. */
    loadOlder(total: number): boolean {
        if (total <= this.loadPages) {
            return false
        }
        this.loadPages += getAdditionalChatLoadPages(DBState.db)
        return true
    }

    /** The "load more" button of the folded view. */
    expandFolded(): void {
        this.loadPages += chatFoldedStateMessageIndex.index + 1
        chatFoldedState.data = null
    }

    /** scrollToMessage: make sure message `index` is mounted. */
    ensureLoaded(index: number, total: number): void {
        const needed = total - index + 5
        if (this.loadPages < needed) {
            this.loadPages = needed
        }
    }

    /** The greeting is shown only when every message is loaded. */
    showsGreeting(total: number): boolean {
        return total <= this.loadPages
    }

    /** Screenshot: mount the whole chat. */
    loadAll(): void {
        this.loadPages = Infinity
    }
}

export function isFolded(): boolean {
    return chatFoldedStateMessageIndex.index !== -1
}

export function needsColdStorageLoad(): boolean {
    return session.getMessages()[0]?.data?.startsWith(coldStorageHeader) ?? false
}

export function loadColdStorage(): Promise<unknown> {
    return preLoadChat(session.getCharacterIndex(), session.getCharacter()?.chatPage ?? 0)
}
```

- [ ] **Шаг 4: Запустить тест и убедиться, что он проходит**

Run: `pnpm vitest run src/ts/chatCore/tests/messageWindow.test.ts`
Expected: PASS, 6 тестов.

- [ ] **Шаг 5: Коммит**

```bash
git add src/ts/chatCore/messageWindow.svelte.ts src/ts/chatCore/tests/messageWindow.test.ts
git commit -m "feat(chat-core): add message window with folding and cold storage" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Задача 15: Проверка этапа и синхронизация спецификации

**Файлы:**
- Modify: `docs/superpowers/specs/2026-09-28-mobile-chat-rework-design.md` (§6.2, §6.7, §12)

**Интерфейсы:**
- Consumes: всё из Задач 1–14.
- Produces: зелёный гейт этапа и спецификацию, совпадающую с кодом.

- [ ] **Шаг 1: Прогнать все новые тесты**

Run: `pnpm vitest run src/ts/chatCore src/lib/MobileChat`
Expected: PASS — 15 файлов, 114 тестов.

- [ ] **Шаг 2: Прогнать весь набор тестов**

Run: `pnpm test`
Expected: PASS — все существующие тесты плюс новые.

- [ ] **Шаг 3: Проверить типы**

Run: `pnpm check`
Expected: ошибок не больше, чем в базовой линии (Задача 1, шаг 0), и ни одной в `src/ts/chatCore/**`, `src/lib/MobileChat/**`, `src/ts/process/prereroll.ts`, `src/lang/*.ts`. Новые ошибки исправьте в соответствующем файле.

- [ ] **Шаг 4: Проверить сборку**

Run: `pnpm build`
Expected: сборка завершается без ошибок.

- [ ] **Шаг 5: Проверить, что не осталось заглушек**

Run: `git grep -nE "TODO|FIXME|\.only\(|\.skip\(" -- src/ts/chatCore src/lib/MobileChat`
Expected: пустой вывод.

- [ ] **Шаг 6: Синхронизировать спецификацию с кодом**

В `docs/superpowers/specs/2026-09-28-mobile-chat-rework-design.md` сделайте четыре правки.

**1. §6.2.** Замените в дереве `src/ts/chatCore/` строку

```
  messageActions.ts                   удалить, удалить ниже, сохранить правку, закладка, ветвь, скрыть, копировать, TTS, сведения, приветствие
```

на

```
  messageActions.svelte.ts            удалить, удалить ниже, сохранить правку, закладка, ветвь, скрыть, TTS, сведения, приветствие
  copyMessage.ts                      копирование сообщения карточкой или текстом
```

А в дереве `src/lib/MobileChat/` строку

```
  Sheet.svelte                        примитив нижней шторки
```

на

```
  Sheet.svelte                        примитив нижней шторки
  McIconButton.svelte                 иконочная кнопка 44×44
```

В §6.3 замените пункт, который начинается с ``- `messageActions.ts` — перенос `rm`…``, на:

```
- `messageActions.svelte.ts` — перенос `rm`, `edit`, `toggleBookmark`, ветвления, `disabled`, `sayTTS`, `alertRequestData`, переключения `fmIndex`, сохранения правки перевода. Индекс −1 защищён для всех действий, которые его не поддерживают.
- `copyMessage.ts` — копирование сообщения карточкой (HTML + текст) или только текстом, как в `Chat.svelte`.
```

**2. §6.7.** Добавьте в таблицу правок строку после строки `hotkey.ts`:

```
| `src/ts/process/prereroll.ts` | функция `getPrerollState` в конце файла — счётчик заранее сгенерированных вариантов | апстрим |
```

**3. §11.2.** Замените пункт списка

```
- inlay-изображение;
```

на

```
- inlay-изображение — покрыто `src/ts/process/files/tests/inlays.test.ts` (IndexedDB недоступна в happy-dom, а разбор inlay у старого и нового пути общий);
```

**4. §12.** Дополните строки этапов 0 и 1 в колонке «Готово, когда» словами «— выполнено, план `docs/superpowers/plans/2026-09-28-mobile-chat-core-phase-0-1.md`».

- [ ] **Шаг 7: Коммит**

```bash
git add docs/superpowers/specs/2026-09-28-mobile-chat-rework-design.md
git commit -m "docs: sync mobile chat spec with the implemented core" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
