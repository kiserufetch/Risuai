import { tick } from 'svelte'
import { v4 } from 'uuid'
import { language } from 'src/lang'
import { alertError, alertNormal, alertWait } from 'src/ts/alert'
import { downloadFile } from 'src/ts/globalApi.svelte'
import type { MessageWindow } from './messageWindow.svelte'

// DefaultChatScreen.screenShot: mount the whole chat, render every message to a
// canvas and stack them oldest-first into one PNG.

export async function takeChatScreenshot(messageWindow: MessageWindow): Promise<void> {
    try {
        messageWindow.loadAll()
        await tick()
        const toImage = await import('html-to-image')
        const chats = document.querySelectorAll('.default-chat-screen .risu-chat')
        alertWait('Taking screenShot...')
        const canvases: HTMLCanvasElement[] = []
        for (const chat of chats) {
            canvases.push(await toImage.toCanvas(chat as HTMLElement))
            alertWait('Taking screenShot... ' + canvases.length + '/' + chats.length)
        }
        canvases.reverse()
        alertWait('Merging images...')
        const merged = document.createElement('canvas')
        const width = Math.max(0, ...canvases.map((c) => c.width))
        const height = canvases.reduce((sum, c) => sum + c.height, 0)
        merged.width = width
        merged.height = height
        const context = merged.getContext('2d')
        context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--risu-theme-bgcolor') || '#000'
        context.fillRect(0, 0, width, height)
        let offset = 0
        for (const canvas of canvases) {
            context.drawImage(canvas, 0, offset)
            offset += canvas.height
            canvas.remove()
        }
        await downloadFile(`chat-${v4()}.png`, Buffer.from(merged.toDataURL('png').split(',').at(-1), 'base64'))
        merged.remove()
        alertNormal(language.screenshotSaved)
    } catch (error) {
        console.error(error)
        alertError('Error while taking screenshot')
    } finally {
        messageWindow.reset()
    }
}
