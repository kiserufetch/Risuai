<script lang="ts">
    import { tick } from 'svelte'
    import { ArrowUpIcon, SquareIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertError } from 'src/ts/alert'
    import { haptic } from 'src/ts/gui/haptics'
    import { isMobile } from 'src/ts/platform'
    import { doingChat } from 'src/ts/process/index.svelte'
    import { postChatFile } from 'src/ts/process/files/multisend'
    import { getInlayAsset } from 'src/ts/process/files/inlays'
    import { DBState, chatPanelStore } from 'src/ts/stores.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'
    import { abortGeneration, generate, sendMessage } from 'src/ts/chatCore/sendPipeline'
    import { reroll } from 'src/ts/chatCore/alternatives.svelte'
    import { clearDraft, getDraft } from 'src/ts/chatCore/composerDraft.svelte'
    import { generationStatus } from 'src/ts/chatCore/generationStatus.svelte'
    import GenerationStatus from './GenerationStatus.svelte'

    // Floating composer (spec §4.2, §5.2, §7.4). Drafts live per chat (§10.15).

    let { height = $bindable(0) }: { height?: number } = $props()

    const MAX_LINES_HEIGHT = 5 * 24 + 20

    let area: HTMLTextAreaElement | null = $state(null)
    let chatKey = $derived(session.getChatKey())
    let draft = $derived(getDraft(chatKey))
    let generatingHere = $derived(generationStatus.running && generationStatus.charIndex === session.getCharacterIndex())
    let busy = $derived($doingChat || generatingHere)

    function resize() {
        if (!area) {
            return
        }
        area.style.height = '0'
        area.style.height = `${Math.min(area.scrollHeight, MAX_LINES_HEIGHT)}px`
    }

    $effect(() => {
        void draft.text
        tick().then(resize)
    })

    async function send() {
        if (busy) {
            return
        }
        haptic(6)
        const key = chatKey
        const text = draft.text
        const attachments = [...draft.attachments]
        clearDraft(key)
        const restore = () => {
            const current = getDraft(key)
            if (current.text === '' && current.attachments.length === 0) {
                current.text = text
                current.attachments = attachments
            }
        }
        try {
            if (await sendMessage(text, attachments) === 'busy') {
                restore()
            }
        } catch (error) {
            restore()
            alertError(error)
        }
    }

    function stop() {
        haptic(6)
        abortGeneration()
    }

    function onkeydown(event: KeyboardEvent) {
        const key = event.key.toLocaleLowerCase()
        if (key === 'enter' && !event.isComposing && !isMobile) {
            if ((DBState.db.sendWithEnter && !event.shiftKey) || (!DBState.db.sendWithEnter && event.shiftKey)) {
                event.preventDefault()
                send()
            }
        }
        if (key === 'm' && event.ctrlKey) {
            event.preventDefault()
            reroll(() => generate())
        }
    }

    function onpaste(event: ClipboardEvent) {
        const items = event.clipboardData?.items
        if (!items) {
            return
        }
        const key = chatKey
        let canceled = false
        for (const item of items) {
            if (item.kind !== 'file' || !item.type.startsWith('image')) {
                continue
            }
            if (!canceled) {
                event.preventDefault()
                canceled = true
            }
            const file = item.getAsFile()
            if (!file) {
                continue
            }
            file.arrayBuffer().then(async (buffer) => {
                const results = await postChatFile({ name: file.name, data: new Uint8Array(buffer) })
                if (!results) {
                    return
                }
                const target = getDraft(key)
                for (const result of results) {
                    if (result?.type === 'asset') {
                        target.attachments.push(result.data)
                    }
                    if (result?.type === 'text') {
                        target.text += `{{file::${result.name}::${result.data}}}`
                    }
                }
            })
        }
    }
</script>

<div
    bind:clientHeight={height}
    class="risu-mc-composer absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 px-3 pt-2"
    style="padding-bottom: calc(0.5rem + var(--safe-bottom, 0px) + var(--kb-inset, 0px));"
>
    {#if generatingHere}
        <GenerationStatus />
    {/if}
    {#if chatPanelStore.length > 0}
        <div class="flex flex-col gap-2">
            {#each chatPanelStore as panel (panel.id)}
                <section class="rounded-2xl border p-3 {panel.className ?? ''}" style="background: var(--mc-surface); border-color: var(--mc-line);" data-plugin-chat-panel={panel.id}>
                    {@html panel.html}
                </section>
            {/each}
        </div>
    {/if}
    {#if draft.attachments.length > 0}
        <div class="flex gap-2 overflow-x-auto pb-1" aria-label={language.mobileChat.attachments}>
            {#each draft.attachments as file, i (file)}
                <div class="relative shrink-0">
                    {#await getInlayAsset(file) then asset}
                        {#if asset?.type === 'image'}
                            <img src={asset.data} alt="" class="h-16 w-16 rounded-xl object-cover" />
                        {:else}
                            <div class="flex h-16 w-16 items-center justify-center rounded-xl text-[11px] break-all" style="background: var(--mc-surface);">{asset?.type ?? file}</div>
                        {/if}
                    {/await}
                    <button type="button" class="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border" style="background: var(--mc-surface); border-color: var(--mc-line);" aria-label={language.mobileChat.removeAttachment} onclick={() => draft.attachments.splice(i, 1)}>
                        <XIcon size={14} />
                    </button>
                </div>
            {/each}
        </div>
    {/if}
    <div class="flex items-end gap-1 rounded-[28px] border p-1 pl-4 shadow-lg" style="background: var(--mc-surface); border-color: var(--mc-line);">
        <textarea
            bind:this={area}
            bind:value={draft.text}
            {onkeydown}
            {onpaste}
            rows="1"
            placeholder={language.mobileChat.messagePlaceholder}
            class="text-input-area min-w-0 flex-1 resize-none self-center overflow-y-auto border-0 bg-transparent py-2.5 text-base leading-6 outline-none"
            style="color: var(--mc-text);"
        ></textarea>
        {#if busy}
            <button type="button" class="button-icon-stop relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-95" style="background: var(--mc-accent-soft); color: var(--mc-accent);" aria-label={language.mobileChat.stop} onclick={stop}>
                <svg class="ring absolute inset-0" viewBox="0 0 44 44" aria-hidden="true">
                    <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="32 94" stroke-linecap="round" />
                </svg>
                <SquareIcon size={13} class="fill-current" />
            </button>
        {:else}
            <button type="button" class="button-icon-send flex h-11 w-11 shrink-0 items-center justify-center rounded-full active:scale-95" style="background: var(--mc-accent); color: var(--mc-on-accent);" aria-label={language.mobileChat.send} onclick={send}>
                <ArrowUpIcon size={22} strokeWidth={2.5} />
            </button>
        {/if}
    </div>
</div>

<style>
    .ring {
        animation: risu-mc-spin 1.1s linear infinite;
    }
    @keyframes risu-mc-spin {
        to { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
        .ring { animation: none; }
    }
</style>
