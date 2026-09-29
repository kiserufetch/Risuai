<script lang="ts">
    import { CheckIcon, SearchIcon, StarIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import Sheet from 'src/lib/MobileChat/Sheet.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { getHordeModels } from 'src/ts/horde/getModels'
    import { getModelList } from 'src/ts/model/modellist'
    import type { LLMModel } from 'src/ts/model/types'
    import { DBState } from 'src/ts/stores.svelte'
    import { modelHint } from './models'

    // Mockup "Выбор модели": search, provider chips, grouped list. Same sources as
    // ModelList.svelte: the model registry, custom models and Horde.

    interface Props {
        open: boolean
        title: string
        value: string
        blankable?: boolean
        onpick: (id: string) => void
        onclose: () => void
    }

    let { open, title, value, blankable = false, onpick, onclose }: Props = $props()

    const t = $derived(language.mobileBot)

    type Entry = { id: string; name: string; hint: string; recommended: boolean }
    type Group = { name: string; items: Entry[] }

    let query = $state('')
    let provider = $state('')
    let showAll = $state(false)
    let horde: Entry[] = $state([])

    $effect(() => {
        if (!open) return
        getHordeModels().then((models) => {
            horde = [{ id: 'horde:::auto', name: 'Auto Model', hint: '', recommended: false }, ...models.map((m) => ({
                id: `horde:::${m.name}`, name: m.name.trim(), hint: `Performance ${m.performance.toFixed(1)}`, recommended: false,
            }))]
        }).catch(() => { horde = [] })
    })

    const entry = (m: LLMModel): Entry => ({ id: m.id, name: m.name, hint: modelHint(m), recommended: !!m.recommended })

    let groups: Group[] = $derived.by(() => {
        const out: Group[] = []
        const other: Entry[] = []
        for (const g of getModelList({ recommendedOnly: !showAll, groupedByProvider: true })) {
            if (g.providerName === '@as-is') other.push(...g.models.map(entry))
            else out.push({ name: g.providerName, items: g.models.map(entry) })
        }
        if (other.length) out.unshift({ name: t.otherModels, items: other })
        if ((DBState.db.customModels ?? []).length) {
            out.push({ name: language.customModels, items: DBState.db.customModels.map((m) => ({ id: m.id, name: m.name ?? 'Unnamed', hint: '', recommended: false })) })
        }
        if (horde.length) out.push({ name: 'Horde', items: horde })
        return out
    })

    let visible = $derived.by(() => {
        const q = query.trim().toLocaleLowerCase()
        return groups
            .filter((g) => !provider || g.name === provider)
            .map((g) => ({ ...g, items: q ? g.items.filter((m) => m.name.toLocaleLowerCase().includes(q) || m.id.toLocaleLowerCase().includes(q)) : g.items }))
            .filter((g) => g.items.length > 0)
    })

    function pick(id: string) {
        onpick(id)
        onclose()
    }
</script>

<Sheet {open} label={title} {onclose} class="h-[85dvh]">
    <div class="flex shrink-0 items-center gap-2 px-1">
        <span class="flex-1 text-[18px] font-bold">{title}</span>
        <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full" style="background: var(--mc-line);" aria-label={language.mobileBot.close} onclick={onclose}><XIcon size={16} /></button>
    </div>
    <label class="flex h-[42px] shrink-0 items-center gap-2.5 rounded-full px-3.5" style="background: var(--mc-line);">
        <SearchIcon size={18} class="shrink-0 text-(--mc-text2)" />
        <input type="search" bind:value={query} placeholder={t.searchModel} aria-label={t.searchModel} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
    </label>
    <div class="-mx-3 flex shrink-0 gap-1.5 overflow-x-auto px-3" role="tablist" aria-label={t.providers}>
        {#each ['', ...groups.map((g) => g.name)] as name (name)}
            <button type="button" role="tab" aria-selected={provider === name} class="h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold" style={provider === name ? 'background: var(--mc-text); color: var(--mc-bg);' : 'background: var(--mc-line); color: var(--mc-text2);'} onclick={() => { provider = name }}>{name || t.allProviders}</button>
        {/each}
    </div>
    {#if blankable && !query}
        <button type="button" class="flex min-h-[52px] shrink-0 items-center rounded-2xl px-4 text-left text-[15px]" style="background: var(--mc-group);" onclick={() => pick('')}>
            <span class="flex-1">{t.noModel}</span>
            {#if !value}<CheckIcon size={20} style="color: var(--mc-accent);" />{/if}
        </button>
    {/if}
    {#each visible as group (group.name)}
        <div class="flex shrink-0 flex-col gap-1.5">
            <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{group.name}</span>
            <div class="risu-mc-picker-group overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {#each group.items as model (model.id)}
                    {@const on = model.id === value}
                    <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left" onclick={() => pick(model.id)}>
                        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span class="flex items-center gap-1.5 text-[15px]" style={on ? 'color: var(--mc-accent); font-weight: 600;' : ''}>
                                <span class="truncate">{model.name}</span>
                                {#if model.recommended && showAll}<StarIcon size={12} class="shrink-0" style="color: #f59e0b;" />{/if}
                            </span>
                            {#if model.hint}<span class="truncate text-[12px] text-(--mc-text2)">{model.hint}</span>{/if}
                        </span>
                        {#if on}<CheckIcon size={20} class="shrink-0" style="color: var(--mc-accent);" />{/if}
                    </button>
                {/each}
            </div>
        </div>
    {:else}
        <span class="py-8 text-center text-[15px] text-(--mc-text2)">{language.mobileDialogs.nothingFound}</span>
    {/each}
    <div class="shrink-0 overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        <FormToggle label={t.showUnrecommended} bind:checked={showAll} />
    </div>
</Sheet>

<style>
    .risu-mc-picker-group > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
