<script lang="ts">
    import { CheckIcon, GripVerticalIcon, PlusIcon, SearchIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import Sheet from 'src/lib/MobileChat/Sheet.svelte'
    import { getOpenRouterProviders } from 'src/ts/model/openrouter'
    import { DBState } from 'src/ts/stores.svelte'

    // OpenRouter provider routing (mockup "Маршрутизация провайдеров"): the order, only and
    // ignore lists of OpenrouterSettings.svelte. The order list is dragged by its grip;
    // providers are added from a searchable sheet that also takes a custom slug.

    type ListKey = 'order' | 'only' | 'ignore'
    const t = $derived(language.mobileBot)

    let tab: ListKey = $state('order')
    let adding = $state(false)
    let query = $state('')
    let providers: { name: string; slug: string }[] = $state([])
    getOpenRouterProviders().then((list) => { providers = list })

    let lists = $derived(DBState.db.openrouterProvider)
    let current = $derived(lists[tab].filter(Boolean))
    const nameOf = (slug: string) => providers.find((p) => p.slug === slug)?.name ?? slug
    const hints = $derived({ order: t.orOrderHint, only: t.orOnlyHint, ignore: t.orIgnoreHint })

    function add(slug: string) {
        slug = slug.trim()
        if (!slug) return
        const list = lists[tab].filter(Boolean)
        if (!list.includes(slug)) lists[tab] = [...list, slug]
        adding = false
        query = ''
    }

    function remove(slug: string) {
        lists[tab] = lists[tab].filter((s) => s && s !== slug)
    }

    let found = $derived.by(() => {
        const q = query.trim().toLowerCase()
        return q ? providers.filter((p) => p.name.toLowerCase().includes(q) || p.slug.includes(q)) : providers
    })

    function stateOf(slug: string): 'here' | ListKey | '' {
        if (lists[tab].includes(slug)) return 'here'
        for (const key of ['order', 'only', 'ignore'] as const) if (lists[key].includes(slug)) return key
        return ''
    }

    // Drag to reorder (order tab), as in the prompt block list.
    let listEl: HTMLElement | null = $state(null)
    let drag: { from: number; to: number; startY: number; dy: number; centers: number[]; height: number } | null = $state(null)

    function dragStart(e: PointerEvent, i: number) {
        if (!listEl) return
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        const rects = (Array.from(listEl.children) as HTMLElement[]).slice(0, current.length).map((r) => r.getBoundingClientRect())
        drag = { from: i, to: i, startY: e.clientY, dy: 0, centers: rects.map((r) => r.top + r.height / 2), height: rects[i].height }
    }
    function dragMove(e: PointerEvent) {
        if (!drag) return
        drag.dy = e.clientY - drag.startY
        const center = drag.centers[drag.from] + drag.dy
        let to = drag.from
        while (to < drag.centers.length - 1 && center > drag.centers[to + 1]) to++
        while (to > 0 && center < drag.centers[to - 1]) to--
        drag.to = to
    }
    function dragEnd() {
        if (!drag) return
        const { from, to } = drag
        drag = null
        if (from === to) return
        const list = [...current]
        const [moved] = list.splice(from, 1)
        list.splice(to, 0, moved)
        lists.order = list
    }
    function shift(i: number): number {
        if (!drag || i === drag.from) return drag?.dy ?? 0
        if (drag.from < drag.to && i > drag.from && i <= drag.to) return -drag.height
        if (drag.from > drag.to && i < drag.from && i >= drag.to) return drag.height
        return 0
    }
</script>

<div class="flex flex-col gap-4">
    <div role="tablist" aria-label={t.page_routing} class="grid grid-cols-3 gap-1 rounded-xl p-1" style="background: var(--mc-surface);">
        {#each [['order', t.orOrder], ['only', t.orOnly], ['ignore', t.orIgnore]] as [key, label] (key)}
            <button type="button" role="tab" aria-selected={tab === key} class="flex min-h-9 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold" style={tab === key ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => { tab = key as ListKey }}>
                {label}<span class="text-[11px] text-(--mc-text2)">{lists[key as ListKey].filter(Boolean).length}</span>
            </button>
        {/each}
    </div>
    <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{hints[tab]}</span>

    <div bind:this={listEl} class="risu-mc-routing flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {#each current as slug, i (slug)}
            <div class="relative flex min-h-14 items-center gap-2.5 pr-1.5" class:pl-4={tab !== 'order'} style="transform: translateY({tab === 'order' ? shift(i) : 0}px); transition: {drag && i !== drag.from ? 'transform 150ms' : 'none'}; z-index: {drag?.from === i ? 2 : 1}; background: var(--mc-group);">
                {#if tab === 'order'}
                    <button type="button" class="flex h-14 w-9 shrink-0 touch-none items-center justify-center text-(--mc-text2) opacity-60" aria-label={t.dragBlock} onpointerdown={(e) => dragStart(e, i)} onpointermove={dragMove} onpointerup={dragEnd} onpointercancel={dragEnd}><GripVerticalIcon size={18} /></button>
                    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold" style="background: var(--mc-line);">{i + 1}</span>
                {/if}
                <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span class="truncate text-[15px] font-semibold">{nameOf(slug)}</span>
                    <span class="truncate font-mono text-[12px] text-(--mc-text2)">{slug}</span>
                </span>
                <button type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style="color: var(--mc-danger);" aria-label={t.remove} onclick={() => remove(slug)}><XIcon size={18} /></button>
            </div>
        {/each}
        <button type="button" class="flex min-h-[52px] w-full items-center gap-2 px-4 text-[15px] font-semibold" style="color: var(--mc-accent);" onclick={() => { adding = true }}><PlusIcon size={18} />{t.orAddProvider}</button>
    </div>
</div>

<Sheet open={adding} label={t.orAddTo} onclose={() => { adding = false }} class="h-[80dvh]">
    <div class="flex shrink-0 items-center gap-2 px-1">
        <span class="flex-1 text-[18px] font-bold">{t.orAddTo.replace('{}', { order: t.orOrder, only: t.orOnly, ignore: t.orIgnore }[tab])}</span>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full" style="background: var(--mc-line);" aria-label={t.close} onclick={() => { adding = false }}><XIcon size={16} /></button>
    </div>
    <form class="flex h-[42px] shrink-0 items-center gap-2.5 rounded-full px-3.5" style="background: var(--mc-line);" onsubmit={(e) => { e.preventDefault(); add(query) }}>
        <SearchIcon size={18} class="shrink-0 text-(--mc-text2)" />
        <input type="search" bind:value={query} placeholder={t.orSearch} aria-label={t.orSearch} autocapitalize="off" class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
    </form>
    {#if query.trim() && !providers.some((p) => p.slug === query.trim())}
        <button type="button" class="flex min-h-[52px] shrink-0 items-center gap-2 rounded-2xl px-4 text-left text-[15px]" style="background: var(--mc-group);" onclick={() => add(query)}>
            <PlusIcon size={18} style="color: var(--mc-accent);" /><span>{t.orCustomSlug} <b class="font-mono">{query.trim()}</b></span>
        </button>
    {/if}
    <div class="risu-mc-routing flex shrink-0 flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {#each found as p (p.slug)}
            {@const state = stateOf(p.slug)}
            <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 py-1.5 text-left disabled:opacity-60" disabled={state === 'here'} onclick={() => add(p.slug)}>
                <span class="flex min-w-0 flex-1 flex-col"><span class="truncate text-[15px]">{p.name}</span><span class="truncate font-mono text-[12px] text-(--mc-text2)">{p.slug}</span></span>
                {#if state === 'here'}
                    <CheckIcon size={20} style="color: var(--mc-accent);" />
                {:else if state}
                    <span class="shrink-0 text-[12px]" style="color: {state === 'ignore' ? 'var(--mc-danger)' : 'var(--mc-text2)'};">{t.orIn.replace('{}', { order: t.orOrder, only: t.orOnly, ignore: t.orIgnore }[state].toLowerCase())}</span>
                {/if}
            </button>
        {:else}
            <span class="px-4 py-4 text-[15px] text-(--mc-text2)">{providers.length ? language.mobileDialogs.nothingFound : language.loading}</span>
        {/each}
    </div>
</Sheet>

<style>
    .risu-mc-routing > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
