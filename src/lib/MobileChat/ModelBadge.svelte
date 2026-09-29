<script lang="ts">
    import { BotIcon, ChevronRightIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { showGenerationInfo } from 'src/ts/chatCore/messageActions.svelte'
    import { usageLine } from 'src/ts/chatCore/usageLine'
    import type { MessageGenerationInfo } from 'src/ts/storage/database.svelte'

    // Model of a reply (mockup "A · Иконка в шапке"): a small round icon next to the name;
    // a tap opens a popover with the model, where it ran, cost, and a link to full details.

    let { idx, info, label }: { idx: number; info: MessageGenerationInfo; label: string } = $props()

    let open = $state(false)
    let name = $derived(label.split('/').pop() || label)
    let source = $derived(label.includes('/') ? label.slice(0, label.lastIndexOf('/')).replace(/^openrouter-/i, 'OpenRouter · ') : '')
    let usage = $derived(usageLine(info.openrouter))
    let thinking = $derived(info.thinkingMs ? language.mobileChat.thoughtFor.replace('{}', String(Math.round(info.thinkingMs / 1000))) : '')
</script>

<span class="relative ml-auto shrink-0">
    <button type="button" class="flex h-[30px] w-[30px] items-center justify-center rounded-full text-(--mc-text2)" style="background: var(--mc-surface);" aria-label={language.mobileChat.modelInfo} aria-expanded={open} onclick={() => { open = !open }}>
        <BotIcon size={15} />
    </button>
    {#if open}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="fixed inset-0 z-40" onclick={() => { open = false }}></div>
        <div class="absolute right-0 top-9 z-50 flex w-64 flex-col gap-1 rounded-2xl px-3.5 py-3" style="background: var(--mc-bubble); box-shadow: 0 12px 32px rgb(0 0 0 / 0.45);">
            {#if source}<span class="truncate text-[12px] text-(--mc-text2)">{source}</span>{/if}
            <span class="break-all text-[15px] font-semibold leading-5">{name}</span>
            {#if usage || thinking}<span class="text-[12px] leading-4 text-(--mc-text2)">{[usage, thinking].filter(Boolean).join(' · ')}</span>{/if}
            <button type="button" class="-mx-1 mt-1 flex h-8 items-center gap-1 rounded-lg px-1 text-[13px] font-semibold" style="color: var(--mc-accent);" onclick={() => { open = false; showGenerationInfo(idx, info) }}>{language.mobileChat.moreDetails}<ChevronRightIcon size={15} /></button>
        </div>
    {/if}
</span>
