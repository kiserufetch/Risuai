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
