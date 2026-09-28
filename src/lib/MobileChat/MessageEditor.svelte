<script lang="ts">
    import { tick, untrack } from 'svelte'
    import { RotateCcwIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertConfirm } from 'src/ts/alert'
    import { saveMessageEdit, saveTranslationEdit } from 'src/ts/chatCore/messageActions.svelte'
    import { getAlternativesCounter } from 'src/ts/chatCore/alternatives.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'
    import type { EditRequest } from './editRequest'
    import { pushBackHandler } from 'src/ts/chatCore/backStack'

    // Full-screen editor (spec §5.5): Cancel asks before dropping changes, Save writes
    // the message (or the translation cache), chips wrap the selection.

    interface Props {
        request: EditRequest
        onclose: () => void
    }

    let { request, onclose }: Props = $props()

    const original = untrack(() => request.kind === 'translation' ? request.text : session.getMessage(request.idx)?.data ?? '')
    let value = $state(original)
    let area: HTMLTextAreaElement | null = $state(null)
    let speaker = $derived(session.getSpeaker(session.getMessage(request.idx)))
    let subtitle = $derived.by(() => {
        const counter = request.idx === session.getMessages().length - 1 ? getAlternativesCounter() : null
        if (request.kind === 'translation') {
            return `${speaker.name} · ${language.mobileChat.editTranslation}`
        }
        return counter
            ? `${speaker.name} · ${language.mobileChat.variantOf.replace('{0}', String(counter.index)).replace('{1}', String(counter.total))}`
            : speaker.name
    })

    $effect(() => {
        tick().then(() => area?.focus())
    })

    // System back behaves like Cancel; the popped entry is gone, so a declined
    // confirmation just keeps the editor open without one.
    $effect(() => pushBackHandler(() => untrack(() => cancel())))

    async function cancel() {
        if (value !== original && !(await alertConfirm(language.mobileChat.discardEditConfirm))) {
            return
        }
        onclose()
    }

    async function save() {
        if (request.kind === 'translation') {
            await saveTranslationEdit(request.key, value)
            request.onsaved()
        } else {
            saveMessageEdit(request.idx, value)
        }
        onclose()
    }

    async function wrap(open: string, close: string) {
        if (!area) {
            return
        }
        const start = area.selectionStart
        const end = area.selectionEnd
        value = value.slice(0, start) + open + value.slice(start, end) + close + value.slice(end)
        await tick()
        area.focus()
        const cursor = start === end ? start + open.length : end + open.length + close.length
        area.setSelectionRange(cursor, cursor)
    }

    function onkeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            event.preventDefault()
            cancel()
        }
    }
</script>

<svelte:window {onkeydown} />

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<section
    role="dialog"
    aria-modal="true"
    aria-label={language.mobileChat.editMessage}
    class="risu-mc-editor risu-mc-slide-up fixed inset-0 z-50 flex flex-col"
    style="background: var(--mc-bg); color: var(--mc-text); padding-top: var(--safe-top); padding-bottom: calc(var(--safe-bottom) + var(--kb-inset, 0px));"
>
    <header class="flex h-14 shrink-0 items-center gap-2 border-b px-2" style="border-color: var(--mc-line);">
        <button type="button" class="h-11 rounded-xl px-3 text-[15px] text-(--mc-text2) active:scale-95" onclick={cancel}>{language.cancel}</button>
        <span class="flex min-w-0 flex-1 flex-col items-center">
            <span class="text-[15px] font-semibold">{language.mobileChat.editTitle}</span>
            <span class="max-w-full truncate text-[12px] text-(--mc-text2)">{subtitle}</span>
        </span>
        <button type="button" class="h-11 rounded-full px-4 text-[15px] font-semibold active:scale-95" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={save}>{language.mobileChat.save}</button>
    </header>
    <textarea
        bind:this={area}
        bind:value
        class="message-edit-area min-h-0 flex-1 resize-none bg-transparent p-4 text-base leading-relaxed outline-none"
        style="color: var(--mc-text);"
    ></textarea>
    <div class="flex shrink-0 items-center gap-2 border-t px-3 py-2" style="border-color: var(--mc-line);">
        <button type="button" class="h-10 rounded-full px-4 text-[14px] active:scale-95" style="background: var(--mc-group);" onclick={() => wrap('*', '*')}>{language.mobileChat.actionChip}</button>
        <button type="button" class="h-10 rounded-full px-4 text-[14px] active:scale-95" style="background: var(--mc-group);" onclick={() => wrap('"', '"')}>{language.mobileChat.speechChip}</button>
        <button type="button" class="ml-auto flex h-11 w-11 items-center justify-center rounded-full text-(--mc-text2) active:scale-95 disabled:opacity-40" aria-label={language.mobileChat.restoreOriginal} title={language.mobileChat.restoreOriginal} disabled={value === original} onclick={() => { value = original }}>
            <RotateCcwIcon size={19} />
        </button>
    </div>
</section>
