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
