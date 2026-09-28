<script lang="ts">
    import { DownloadIcon, LinkIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertNormal } from 'src/ts/alert'
    import {
        downloadSpicyChatCharacter,
        getSpicyChatCharacter,
        type SpicyChatCharacterDetail,
        type SpicyChatListDocument,
    } from 'src/ts/spicychat'
    import Sheet from '../../MobileChat/Sheet.svelte'
    import SpicyCover from './SpicyCover.svelte'

    // Character sheet (mockup "Карточка персонажа"): cover, author, stats, tags,
    // greeting preview, import. Mirrors SpicyChatPopUp's data flow.

    let { card, onclose }: { card: SpicyChatListDocument; onclose: () => void } = $props()

    let detail: SpicyChatCharacterDetail | null = $state(null)
    let loading = $state(true)
    let greetingOpen = $state(false)

    let charId = $derived(card.character_id ?? card.id ?? '')
    let name = $derived(detail?.name ?? card.name ?? '')
    let greeting = $derived(detail?.greeting ?? card.greeting ?? '')
    let tags = $derived(detail?.tags ?? card.tags ?? [])
    let messages = $derived(detail?.num_messages ?? card.num_messages)
    let rating = $derived(detail?.rating_score ?? card.rating_score)
    let tokens = $derived(detail?.token_count ?? card.token_count)

    $effect(() => {
        const id = charId
        detail = null
        loading = true
        if (!id) {
            loading = false
            return
        }
        let cancelled = false
        getSpicyChatCharacter(id).then((result) => {
            if (!cancelled) {
                detail = result
                loading = false
            }
        })
        return () => {
            cancelled = true
        }
    })

    function compact(value: number): string {
        return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value)
    }

    async function copyLink() {
        await navigator.clipboard.writeText(`https://spicychat.ai/chat/${charId}`)
        alertNormal(language.clipboardSuccess)
    }

    function importCharacter() {
        onclose()
        downloadSpicyChatCharacter(charId)
    }
</script>

<Sheet open={true} label={name} {onclose} class="gap-4">
    <div class="relative -mx-3 -mt-2 h-[300px] shrink-0 overflow-hidden rounded-t-[24px]">
        <SpicyCover url={detail?.avatar_url ?? card.avatar_url} {name} class="h-full w-full" />
        <button type="button" class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full" style="background: rgb(10 12 16 / 0.6); color: #ededf0;" aria-label={language.mobileCatalog.close} onclick={onclose}>
            <XIcon size={18} />
        </button>
        {#if detail?.is_nsfw ?? card.is_nsfw}
            <span class="absolute left-4 top-4 rounded-lg px-2 py-0.5 text-[11px] font-semibold text-white" style="background: var(--mc-danger);">NSFW</span>
        {/if}
        <span aria-hidden="true" class="absolute inset-x-0 bottom-0 h-24" style="background: linear-gradient(to bottom, transparent, var(--mc-surface));"></span>
    </div>

    <div class="-mt-8 relative flex flex-col gap-1 px-1">
        <h2 class="text-[26px] font-bold leading-tight tracking-tight">{name}</h2>
        {#if detail?.creator_username ?? card.creator_username}
            <span class="text-[14px] text-(--mc-text2)">{language.spicyChat.madeBy.replace('{}', detail?.creator_username ?? card.creator_username)}</span>
        {/if}
    </div>

    {#if detail?.title ?? card.title}
        <p class="px-1 text-[15px] leading-[22px]">{detail?.title ?? card.title}</p>
    {/if}

    <div class="flex gap-2">
        {#if typeof messages === 'number'}
            <div class="flex flex-1 flex-col gap-0.5 rounded-2xl px-3 py-2.5" style="background: var(--mc-group);"><b class="text-[16px] font-semibold">{compact(messages)}</b><span class="text-[12px] text-(--mc-text2)">{language.mobileCatalog.messages}</span></div>
        {/if}
        {#if typeof rating === 'number'}
            <div class="flex flex-1 flex-col gap-0.5 rounded-2xl px-3 py-2.5" style="background: var(--mc-group);"><b class="text-[16px] font-semibold">{rating.toFixed(1)}</b><span class="text-[12px] text-(--mc-text2)">{language.mobileCatalog.rating}</span></div>
        {/if}
        {#if typeof tokens === 'number'}
            <div class="flex flex-1 flex-col gap-0.5 rounded-2xl px-3 py-2.5" style="background: var(--mc-group);"><b class="text-[16px] font-semibold">{tokens.toLocaleString()}</b><span class="text-[12px] text-(--mc-text2)">{language.mobileCatalog.tokens}</span></div>
        {/if}
    </div>

    {#if tags.length > 0}
        <div class="flex flex-wrap gap-1.5">
            {#each tags as tag (tag)}
                <span class="flex h-[30px] items-center rounded-full px-3 text-[13px] font-medium" style="background: var(--mc-group); color: var(--mc-accent);">{tag}</span>
            {/each}
        </div>
    {/if}

    {#if loading}
        <span class="px-1 text-[13px] text-(--mc-text2)">{language.spicyChat.loading}</span>
    {:else if detail && detail.definition_visible === false}
        <span class="px-1 text-[13px] text-(--mc-text2)">{language.spicyChat.definitionHidden}</span>
    {/if}

    {#if greeting}
        <div class="flex flex-col gap-1.5 rounded-2xl px-3.5 py-3" style="background: var(--mc-group);">
            <span class="text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{language.mobileCatalog.greeting}</span>
            <p class="text-[14px] leading-[21px] whitespace-pre-wrap break-words" class:line-clamp-4={!greetingOpen}>{greeting}</p>
            <button type="button" class="h-8 self-start text-[14px] font-medium" style="color: var(--mc-accent);" onclick={() => { greetingOpen = !greetingOpen }}>
                {greetingOpen ? language.mobileCatalog.showLess : language.mobileCatalog.showMore}
            </button>
        </div>
    {/if}

    <div class="sticky bottom-0 -mx-3 flex gap-2.5 border-t px-4 pt-3" style="background: var(--mc-surface); border-color: var(--mc-line);">
        <button type="button" class="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-full border" style="border-color: var(--mc-line);" aria-label={language.mobileCatalog.copyLink} onclick={copyLink}>
            <LinkIcon size={20} />
        </button>
        <button type="button" class="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-full text-[16px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent);" disabled={!charId} onclick={importCharacter}>
            <DownloadIcon size={20} />
            {language.spicyChat.import}
        </button>
    </div>
</Sheet>
