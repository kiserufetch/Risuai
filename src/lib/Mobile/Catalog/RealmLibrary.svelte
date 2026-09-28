<script lang="ts">
    import { untrack } from 'svelte'
    import { CheckIcon, ChevronRightIcon, DownloadIcon, RefreshCwIcon, SearchIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertError } from 'src/ts/alert'
    import { hubAdditionalHTML } from 'src/ts/characterCards'
    import { DBState, RealmInitialOpenChar } from 'src/ts/stores.svelte'
    import {
        REALM_PAGE_SIZE,
        fetchRealmPage,
        findImportedRealmCharacter,
        getRealmCard,
        parseRealmLink,
        realmHasUpdate,
        realmImageUrl,
        realmSortPages,
        type RealmCard,
        type RealmSort,
    } from 'src/ts/realmLibrary'
    import RealmCharacterSheet from './RealmCharacterSheet.svelte'

    // Mobile RisuRealm library (mockups "RisuRealm · лента" / "импорт по ссылке"):
    // sort chips, a 2-column grid loaded page by page as it scrolls, imported/update
    // badges, and a pasted character link offered as a card instead of a text search.

    let { scroller }: { scroller: HTMLElement | null } = $props()

    let draft = $state('')
    let search = $state('')
    let sort: RealmSort = $state('recommended')
    let nsfw = $state(false)

    let cards: RealmCard[] = $state([])
    let page = $state(-1)
    let exhausted = $state(false)
    let loading = $state(false)
    let opened: RealmCard | null = $state(null)
    let linkCard: RealmCard | null = $state(null)
    let linkLoading = $state(false)
    let sentinel: HTMLElement | null = $state(null)
    let request = 0

    const sorts: { mode: RealmSort; label: () => string }[] = [
        { mode: 'recommended', label: () => language.mobileCatalog.sortRecommended },
        { mode: '', label: () => language.mobileCatalog.sortRecent },
        { mode: 'trending', label: () => language.mobileCatalog.sortTrending },
        { mode: 'downloads', label: () => language.mobileCatalog.sortDownloads },
        { mode: 'random', label: () => language.mobileCatalog.sortRandom },
    ]

    let linkId = $derived(parseRealmLink(draft))

    async function load(reset: boolean) {
        const id = ++request
        const nextPage = reset ? 0 : page + 1
        loading = true
        const result = await fetchRealmPage({ search, page: nextPage, nsfw, sort })
        if (id !== request) {
            return
        }
        loading = false
        const seen = new Set(reset ? [] : cards.map((c) => c.id))
        cards = reset ? result : [...cards, ...result.filter((c) => !seen.has(c.id))]
        page = nextPage
        // No total from the hub: a short page is the last one.
        exhausted = !realmSortPages(sort) || result.length < REALM_PAGE_SIZE
    }

    $effect(() => {
        void search
        void sort
        void nsfw
        untrack(() => {
            if (scroller) {
                scroller.scrollTop = 0
            }
            load(true)
        })
    })

    $effect(() => {
        if (!sentinel || !scroller) {
            return
        }
        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting) && !loading && !exhausted) {
                load(false)
            }
        }, { root: scroller, rootMargin: '600px 0px' })
        observer.observe(sentinel)
        return () => observer.disconnect()
    })

    // A pasted link: fetch the card it points to and offer it instead of searching.
    $effect(() => {
        const id = linkId
        linkCard = null
        if (!id) {
            return
        }
        let cancelled = false
        linkLoading = true
        getRealmCard(id).then((card) => {
            if (!cancelled) {
                linkCard = card
                linkLoading = false
            }
        })
        return () => {
            cancelled = true
            linkLoading = false
        }
    })

    $effect(() => {
        if ($RealmInitialOpenChar) {
            opened = $RealmInitialOpenChar
            $RealmInitialOpenChar = null
        }
    })

    function applySearch(query: string) {
        // Random and recommended ignore the query on the hub; searching switches to "new".
        if (query && !realmSortPages(sort)) {
            sort = ''
        }
        search = query
    }

    function submitSearch(event: SubmitEvent) {
        event.preventDefault()
        ;(document.activeElement as HTMLElement | null)?.blur()
        if (linkId) {
            if (linkCard) {
                opened = linkCard
            } else if (!linkLoading) {
                alertError(language.mobileCatalog.linkNotFound)
            }
            return
        }
        applySearch(draft.trim())
    }

    function searchFromSheet(query: string) {
        draft = query
        applySearch(query)
    }

    function clearSearch() {
        draft = ''
        search = ''
    }
</script>

<div class="flex flex-col gap-3">
    <form class="flex h-11 items-center gap-2.5 rounded-full border px-3.5" style="background: var(--mc-surface); border-color: var(--mc-line);" onsubmit={submitSearch}>
        <SearchIcon size={18} class="shrink-0 text-(--mc-text2)" />
        <input type="search" enterkeyhint="search" bind:value={draft} placeholder={language.mobileCatalog.realmSearchPlaceholder} aria-label={language.search} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
        {#if draft}
            <button type="button" class="-mr-2 flex h-9 w-9 items-center justify-center text-(--mc-text2)" aria-label={language.mobileCatalog.reset} onclick={clearSearch}>
                <XIcon size={16} />
            </button>
        {/if}
    </form>

    {#if linkId}
        <div class="flex flex-col gap-3">
            <span class="text-[13px] text-(--mc-text2)">{language.mobileCatalog.linkDetected}</span>
            {#if linkCard}
                <button type="button" class="flex items-center gap-3.5 rounded-[20px] border p-3 text-left" style="border-color: var(--mc-accent); background: var(--mc-accent-soft);" onclick={() => { opened = linkCard }}>
                    <span class="block h-24 w-[72px] shrink-0 overflow-hidden rounded-xl" style="background: var(--mc-group);">
                        {#if !DBState.db.hideAllImages}<img src={realmImageUrl(linkCard)} alt="" class="h-full w-full object-cover object-top" />{/if}
                    </span>
                    <span class="flex min-w-0 flex-1 flex-col gap-1">
                        <span class="truncate text-[16px] font-semibold">{linkCard.name}</span>
                        <span class="truncate text-[13px] text-(--mc-text2)">{linkCard.authorname ? language.mobileCatalog.by.replace('{}', linkCard.authorname) + ' · ' : ''}{language.mobileCatalog.downloads.replace('{}', linkCard.download)}</span>
                        <span class="text-[14px] font-medium" style="color: var(--mc-accent);">{language.mobileCatalog.openCard}</span>
                    </span>
                    <ChevronRightIcon size={20} style="color: var(--mc-accent);" />
                </button>
            {:else if linkLoading}
                <div aria-hidden="true" class="h-[122px] animate-pulse rounded-[20px]" style="background: var(--mc-surface);"></div>
            {:else}
                <span class="text-[14px] text-(--mc-text2)">{language.mobileCatalog.linkNotFound}</span>
            {/if}
            <button type="button" class="h-11 self-start px-1 text-[14px] font-medium text-(--mc-text2)" onclick={() => applySearch(draft.trim())}>{language.mobileCatalog.searchAsText}</button>
        </div>
    {:else}
        <div class="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
            {#each sorts as item (item.mode)}
                <button type="button" class="flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[14px] font-medium" style={sort === item.mode ? 'background: var(--mc-accent); border-color: var(--mc-accent); color: var(--mc-on-accent);' : 'background: var(--mc-surface); border-color: var(--mc-line);'} aria-pressed={sort === item.mode} onclick={() => { sort = item.mode }}>{item.label()}</button>
            {/each}
            <button type="button" class="flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[14px] font-medium" style={nsfw ? 'background: var(--mc-danger); border-color: var(--mc-danger); color: #fff;' : 'background: var(--mc-surface); border-color: var(--mc-line);'} aria-pressed={nsfw} onclick={() => { nsfw = !nsfw }}>NSFW</button>
        </div>

        {#if hubAdditionalHTML}
            <div class="text-[14px]">{@html hubAdditionalHTML}</div>
        {/if}

        {#if !loading && cards.length === 0}
            <div class="py-12 text-center text-[15px] text-(--mc-text2)">{language.spicyChat.noResults}</div>
        {/if}

        <div class="grid grid-cols-2 gap-x-3 gap-y-5">
            {#each cards as card (card.id)}
                {@const imported = findImportedRealmCharacter(card.id) !== -1}
                {@const update = imported && realmHasUpdate(card)}
                <button type="button" class="flex min-w-0 flex-col gap-2 text-left active:opacity-80" onclick={() => { opened = card }}>
                    <span class="relative block aspect-[3/4] w-full overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                        {#if !DBState.db.hideAllImages}
                            <img src={realmImageUrl(card)} alt={card.name} loading="lazy" class="absolute inset-0 h-full w-full object-cover object-top" />
                        {/if}
                        {#if update}
                            <span class="absolute left-2 top-2 flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent);"><RefreshCwIcon size={12} />{language.mobileCatalog.update}</span>
                        {:else if imported}
                            <span class="absolute left-2 top-2 flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold" style="background: rgb(10 12 16 / 0.72); color: #ededf0;"><CheckIcon size={12} />{language.mobileCatalog.imported}</span>
                        {/if}
                        <span class="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium" style="background: rgb(10 12 16 / 0.72); color: #ededf0;">
                            <DownloadIcon size={12} />{card.download}
                        </span>
                    </span>
                    <span class="truncate text-[15px] font-semibold">{card.name}</span>
                    {#if card.authorname}
                        <span class="truncate text-[13px] text-(--mc-text2)">{language.mobileCatalog.by.replace('{}', card.authorname)}</span>
                    {/if}
                </button>
            {/each}
            {#if loading}
                {#each [0, 1, 2, 3] as skeleton (skeleton)}
                    <div aria-hidden="true" class="flex animate-pulse flex-col gap-2">
                        <div class="aspect-[3/4] w-full rounded-2xl" style="background: var(--mc-surface);"></div>
                        <div class="h-3.5 w-2/3 rounded-full" style="background: var(--mc-surface);"></div>
                    </div>
                {/each}
            {/if}
        </div>
        <div bind:this={sentinel} aria-hidden="true" class="h-px"></div>
    {/if}
</div>

{#if opened}
    <RealmCharacterSheet card={opened} {nsfw} onclose={() => { opened = null }} onsearch={searchFromSheet} />
{/if}
