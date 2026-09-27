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
