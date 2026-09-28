<script lang="ts">
    import { getModelInfo } from 'src/ts/model/modellist'
    import type { SettingContext, SettingItem } from 'src/ts/setting/types'
    import { checkCondition, getLabel } from 'src/ts/setting/utils'
    import { DBState } from 'src/ts/stores.svelte'
    import MobileSettingItem from './MobileSettingItem.svelte'

    // Lays data-driven setting items out as mobile groups: a 'span' header starts a
    // labelled group, 'h2' headers are dropped (the page header already names it), and
    // runs of switches / value rows / custom blocks each get their own card.

    let { items, ctx: given }: { items: SettingItem[]; ctx?: SettingContext } = $props()

    let ctx: SettingContext = $derived(given ?? {
        db: DBState.db,
        modelInfo: getModelInfo(DBState.db.aiModel),
        subModelInfo: getModelInfo(DBState.db.subModel),
    })

    type Group = { label: string; items: SettingItem[] }

    function kind(item: SettingItem): string {
        if (item.type === 'check') return 'switch'
        if (item.type === 'custom' || item.type === 'accordion') return 'block'
        if (item.type === 'textarea') return 'text'
        return 'value'
    }

    let groups = $derived.by(() => {
        const out: Group[] = []
        let current: Group | null = null
        let currentKind = ''
        let pendingLabel = ''
        for (const item of items) {
            if (!checkCondition(item, ctx)) continue
            if (item.type === 'header' && item.options?.level !== 'warning') {
                if (item.options?.level !== 'h2') {
                    pendingLabel = getLabel(item)
                    current = null
                }
                continue
            }
            const k = kind(item)
            if (!current || (k !== currentKind && !pendingLabel) || pendingLabel) {
                current = { label: pendingLabel, items: [] }
                out.push(current)
                pendingLabel = ''
                currentKind = k
            }
            current.items.push(item)
        }
        return out
    })
</script>

<div class="flex flex-col gap-4">
    {#each groups as group, i (i)}
        <div class="flex flex-col gap-2">
            {#if group.label}
                <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{group.label}</span>
            {/if}
            <div class="risu-mc-settings-group overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {#each group.items as item (item.id)}
                    <MobileSettingItem {item} {ctx} />
                {/each}
            </div>
        </div>
    {/each}
</div>

<style>
    .risu-mc-settings-group > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
