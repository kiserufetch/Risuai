import { describe, expect, it, vi } from 'vitest'

// spicychat.ts pulls the app's data/UI layers for the import handoff; mock
// them so the pure parser can be tested hermetically.
vi.mock('src/ts/alert', () => ({
    alertConfirm: vi.fn(),
    alertError: vi.fn(),
    alertStore: { set: vi.fn() },
}))
vi.mock('src/ts/characterCards', () => ({
    importCharacterCardSpec: vi.fn(),
}))
vi.mock('src/ts/characters', () => ({
    changeChar: vi.fn(),
}))
vi.mock('src/ts/globalApi.svelte', () => ({
    checkCharOrder: vi.fn(),
    fetchNative: vi.fn(),
}))
vi.mock('src/ts/storage/database.svelte', () => ({
    getDatabase: () => ({ characters: [] }),
}))
vi.mock('src/ts/stores.svelte', () => ({
    DBState: { db: { characters: [] } },
}))
vi.mock('src/ts/platform', () => ({
    isTauri: false,
    isNodeServer: false,
}))

import { parseSpicyChatDetailToCard, type SpicyChatCharacterDetail, type SpicyChatListResponse } from 'src/ts/spicychat'
import detailFixture from './fixtures/spicychat/detail.json'
import listFixture from './fixtures/spicychat/list.json'

describe('parseSpicyChatDetailToCard', () => {
    it('maps the real detail fixture per the Step 1 Field Mapping Matrix', () => {
        const detail = detailFixture as SpicyChatCharacterDetail
        const card = parseSpicyChatDetailToCard(detail)

        expect(card.spec).toBe('chara_card_v3')
        expect(card.spec_version).toBe('3.0')
        expect(card.data.name).toBe('Noa Watanabe')
        expect(card.data.description).toBe(detail.persona)
        expect(card.data.first_mes).toBe(detail.greeting)
        expect(card.data.scenario).toBe('')
        expect(card.data.mes_example).toBe(detail.dialogue)
        expect(card.data.creator).toBe('nickachu')
        expect(card.data.creator_notes).toBe('Tsundere roommate who rejects everyone!!!')
        expect(card.data.tags).toContain('Tsundere')
        expect(card.data.extensions.spicychatImportId).toBe('0c5aa3b9-d132-4215-b0e0-6b5c6d0b5dab')
        expect(card.data.extensions.spicychat.language).toBe('en')
        expect(card.data.extensions.spicychat.token_count).toBe(431)
        expect(card.data.extensions.spicychat.definition_visible).toBe(true)
    })

    it('keeps an existing NSFW tag without duplicating it', () => {
        // fixture has is_nsfw=true and an "NSFW" tag already
        const card = parseSpicyChatDetailToCard(detailFixture as SpicyChatCharacterDetail)
        const nsfwTags = card.data.tags.filter((t) => t.toLowerCase() === 'nsfw')
        expect(nsfwTags.length).toBe(1)
    })

    it('adds an nsfw tag when is_nsfw is set but the tag is missing', () => {
        const card = parseSpicyChatDetailToCard({ name: 'x', is_nsfw: true, tags: ['Anime'] })
        expect(card.data.tags).toEqual(['Anime', 'nsfw'])
    })

    it('defaults every missing field defensively', () => {
        const card = parseSpicyChatDetailToCard({})
        expect(card.data.name).toBe('')
        expect(card.data.description).toBe('')
        expect(card.data.first_mes).toBe('')
        expect(card.data.scenario).toBe('')
        expect(card.data.mes_example).toBe('')
        expect(card.data.tags).toEqual([])
        expect(card.data.creator).toBe('')
        expect(card.data.creator_notes).toBe('')
        expect(card.data.source).toEqual([])
        expect(card.data.extensions.spicychatImportId).toBe('')
    })
})

describe('SpicyChat list fixture shape', () => {
    it('exposes hit documents with the fields the browse UI renders', () => {
        const list = listFixture as SpicyChatListResponse
        expect(Array.isArray(list.hits)).toBe(true)
        const documents = list.hits.map((h) => h.document)
        expect(documents.length).toBeGreaterThan(0)
        for (const doc of documents) {
            expect(typeof doc.id).toBe('string')
            expect(typeof doc.name).toBe('string')
            expect(typeof doc.avatar_url).toBe('string')
            expect(Array.isArray(doc.tags)).toBe(true)
            expect(typeof doc.is_nsfw).toBe('boolean')
        }
        expect(typeof list.found).toBe('number')
        expect(typeof list.page).toBe('number')
    })
})
