<script lang="ts">
    import { tick, untrack } from 'svelte'
    import { language } from 'src/lang'
    import { saveMessageEdit } from 'src/ts/chatCore/messageActions.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'

    // Full-screen message editor (spec §5.5): Cancel keeps the message untouched,
    // Save writes the text back. Escape cancels.

    interface Props {
        idx: number
        onclose: () => void
    }

    let { idx, onclose }: Props = $props()

    const original = untrack(() => session.getMessage(idx)?.data ?? '')
    let value = $state(original)
    let area: HTMLTextAreaElement | null = $state(null)
    let speaker = $derived(session.getSpeaker(session.getMessage(idx)))

    $effect(() => {
        tick().then(() => area?.focus())
    })

    function save() {
        saveMessageEdit(idx, value)
        onclose()
    }

    function onkeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            event.preventDefault()
            onclose()
        }
    }
</script>

<svelte:window {onkeydown} />

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<section
    role="dialog"
    aria-modal="true"
    aria-label={language.mobileChat.editMessage}
    class="risu-mc-editor fixed inset-0 z-50 flex flex-col"
    style="background: var(--mc-bg); color: var(--mc-text); padding-top: var(--safe-top); padding-bottom: calc(var(--safe-bottom) + var(--kb-inset, 0px));"
>
    <header class="flex h-14 shrink-0 items-center gap-2 border-b px-2" style="border-color: var(--mc-line);">
        <button type="button" class="h-11 rounded-xl px-3 text-[15px] text-(--mc-text2) active:scale-95" onclick={onclose}>{language.cancel}</button>
        <span class="min-w-0 flex-1 truncate text-center text-[15px] font-semibold">{speaker.name}</span>
        {#if value !== original}
            <button type="button" class="h-11 rounded-xl px-3 text-[13px] text-(--mc-text2) active:scale-95" onclick={() => { value = original }}>{language.mobileChat.restoreOriginal}</button>
        {/if}
        <button type="button" class="h-11 rounded-full px-4 text-[15px] font-semibold active:scale-95" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={save}>{language.mobileChat.save}</button>
    </header>
    <textarea
        bind:this={area}
        bind:value
        class="message-edit-area min-h-0 flex-1 resize-none bg-transparent p-4 text-base leading-relaxed outline-none"
        style="color: var(--mc-text);"
    ></textarea>
</section>
