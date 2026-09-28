<script lang="ts">
    import { ChevronDownIcon, ChevronRightIcon, ChevronsUpDownIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import Help from 'src/lib/Others/Help.svelte'
    import { customComponents } from 'src/ts/setting/customComponents'
    import type { SettingContext, SettingItem } from 'src/ts/setting/types'
    import { getLabel, getSettingValue, setSettingValue } from 'src/ts/setting/utils'
    import MobileSettingsList from './MobileSettingsList.svelte'

    // One data-driven setting (src/ts/setting/*Data) drawn as a mobile row. Reads and
    // writes go through the same getSettingValue/setSettingValue as the desktop wrappers.

    let { item, ctx }: { item: SettingItem; ctx: SettingContext } = $props()

    let value = $derived(getSettingValue(item, ctx))
    let label = $derived(getLabel(item))
    let open = $state(false)

    function set(next: unknown) {
        if (next !== value) {
            setSettingValue(item, next, ctx)
        }
    }

    let selectOptions = $derived((item.options?.selectOptions ?? []).filter((o) => !o.condition || o.condition(ctx)))
    let segmentOptions = $derived((item.options?.segmentOptions ?? []).filter((o) => !o.condition || o.condition(ctx)))
    let optionLabel = (o: { label?: string; labelKey?: string; value: string | number }) =>
        (o.labelKey ? (language as Record<string, unknown>)[o.labelKey] as string : undefined) ?? o.label ?? String(o.value)

    // SliderInput semantics: `multiple` scales the shown number, -1000 means "disabled".
    let disabled = $derived(!!item.options?.disableable && value === -1000)
    let shown = $derived.by(() => {
        if (disabled) return language.disabled
        const custom = item.options?.customText
        if (typeof custom === 'function') return custom(value)
        if (custom) return custom
        const n = Number(value ?? 0) * (item.options?.multiple ?? 1)
        return n.toFixed(item.options?.fixed ?? 0)
    })

    let Custom = $derived(item.componentId ? customComponents[item.componentId] : null)
</script>

{#snippet labelText()}
    <span>{label}</span>
    {#if item.showExperimental}<Help key="experimental" />{/if}
    {#if item.helpKey}<Help key={item.helpKey as never} unrecommended={item.helpUnrecommended ?? false} />{/if}
{/snippet}

{#if item.type === 'check'}
    <button type="button" role="switch" aria-checked={!!value} class="flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left" onclick={() => set(!value)}>
        <span class="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[15px]">{@render labelText()}</span>
        <span class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {value ? 'var(--mc-accent)' : 'var(--mc-line)'};">
            <span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {value ? '21px' : '3px'};"></span>
        </span>
    </button>
{:else if item.type === 'select'}
    <label class="relative flex min-h-[52px] items-center gap-3 px-4">
        <span class="flex shrink-0 items-center gap-1 text-[15px]">{@render labelText()}</span>
        <span class="ml-auto min-w-0 truncate text-right text-[15px] text-(--mc-text2)">{optionLabel(selectOptions.find((o) => o.value === value) ?? { value: value ?? '' })}</span>
        <ChevronsUpDownIcon size={16} class="shrink-0 text-(--mc-text2)" />
        <select aria-label={label} class="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={value} onchange={(e) => set((e.currentTarget as HTMLSelectElement).value)}>
            {#each selectOptions as option (option.value)}
                <option value={option.value}>{optionLabel(option)}</option>
            {/each}
        </select>
    </label>
{:else if item.type === 'segmented'}
    <div class="flex flex-col gap-2 px-4 py-3">
        <span class="flex items-center gap-1 text-[15px]">{@render labelText()}</span>
        <div role="radiogroup" aria-label={label} class="grid gap-1 rounded-xl p-1" style="background: var(--mc-surface); grid-template-columns: repeat({Math.max(segmentOptions.length, 1)}, minmax(0, 1fr));">
            {#each segmentOptions as option (option.value)}
                <button type="button" role="radio" aria-checked={value === option.value} class="min-h-9 truncate rounded-lg px-1 text-[13px] font-semibold" style={value === option.value ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => set(option.value)}>{optionLabel(option)}</button>
            {/each}
        </div>
    </div>
{:else if item.type === 'slider'}
    <div class="flex flex-col gap-2 px-4 py-3">
        <span class="flex items-center justify-between gap-2 text-[15px]">
            <span class="flex items-center gap-1">{@render labelText()}</span>
            <span class="tabular-nums text-(--mc-text2)">{shown}</span>
        </span>
        <div class="flex items-center gap-3">
            {#if item.options?.disableable}
                <button type="button" role="switch" aria-checked={!disabled} aria-label={label} class="relative h-[22px] w-[38px] shrink-0 rounded-full" style="background: {disabled ? 'var(--mc-line)' : 'var(--mc-accent)'};" onclick={() => set(disabled ? (item.options?.min ?? 0) : -1000)}>
                    <span class="absolute top-[3px] h-4 w-4 rounded-full bg-white" style="left: {disabled ? '3px' : '19px'};"></span>
                </button>
            {/if}
            <input type="range" aria-label={label} class="min-w-0 flex-1" style="accent-color: var(--mc-accent);" min={item.options?.min} max={item.options?.max} step={item.options?.step ?? 1} disabled={disabled} value={disabled ? item.options?.min : value} oninput={(e) => set(Number((e.currentTarget as HTMLInputElement).value))} />
        </div>
    </div>
{:else if item.type === 'number'}
    <label class="flex min-h-[52px] items-center gap-3 px-4 py-2">
        <span class="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[15px]">{@render labelText()}</span>
        <input type="number" inputmode="decimal" min={item.options?.min} max={item.options?.max} value={value} onchange={(e) => set(Number((e.currentTarget as HTMLInputElement).value))} class="w-24 border-0 bg-transparent text-right text-[15px] tabular-nums outline-none" style="color: var(--mc-text);" />
    </label>
{:else if item.type === 'text'}
    <label class="flex flex-col gap-1 px-4 py-2.5">
        <span class="flex items-center gap-1 text-[12px] text-(--mc-text2)">{@render labelText()}</span>
        <input type={item.options?.hideText ? 'password' : 'text'} value={value ?? ''} placeholder={item.options?.placeholder} autocomplete="off" autocapitalize="off" spellcheck="false" oninput={(e) => set((e.currentTarget as HTMLInputElement).value)} class="min-w-0 border-0 bg-transparent text-[15px] outline-none" style="color: var(--mc-text);" />
    </label>
{:else if item.type === 'textarea'}
    <label class="flex flex-col gap-1 px-4 py-3">
        <span class="flex items-center gap-1 text-[12px] text-(--mc-text2)">{@render labelText()}</span>
        <textarea value={value ?? ''} placeholder={item.options?.placeholder} rows="4" oninput={(e) => set((e.currentTarget as HTMLTextAreaElement).value)} class="resize-none border-0 bg-transparent text-[15px] leading-[22px] outline-none" style="color: var(--mc-text); field-sizing: content; max-height: 50dvh;"></textarea>
    </label>
{:else if item.type === 'color'}
    <label class="flex min-h-[52px] items-center gap-3 px-4">
        <span class="flex min-w-0 flex-1 items-center gap-1 text-[15px]">{@render labelText()}</span>
        {#if item.options?.nullable && value}
            <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full text-(--mc-text2)" aria-label={language.mobileCatalog.reset} onclick={() => set(null)}><XIcon size={16} /></button>
        {/if}
        <input type="color" value={value || '#000000'} aria-label={label} oninput={(e) => set((e.currentTarget as HTMLInputElement).value)} class="h-9 w-12 cursor-pointer rounded-lg border-0 bg-transparent" />
    </label>
{:else if item.type === 'button'}
    <button type="button" class="flex min-h-[52px] w-full items-center px-4 text-left text-[15px] font-medium" style="color: var(--mc-accent);" onclick={() => item.options?.onClick?.()}>{label}</button>
{:else if item.type === 'accordion'}
    <div>
        <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px]" aria-expanded={open} onclick={() => { open = !open }}>
            <span class="flex-1">{label}</span>
            {#if open}<ChevronDownIcon size={18} class="text-(--mc-text2)" />{:else}<ChevronRightIcon size={18} class="text-(--mc-text2)" />{/if}
        </button>
        {#if open && item.options?.children}
            <div class="px-3 pb-3"><MobileSettingsList items={item.options.children} {ctx} /></div>
        {/if}
    </div>
{:else if item.type === 'custom' && Custom}
    <div class="risu-mc-legacy flex flex-col px-4 py-3"><Custom {...item.componentProps} /></div>
{:else if item.type === 'header' && item.options?.level === 'warning'}
    <span class="block px-4 py-3 text-[13px]" style="color: var(--mc-danger);">{label}</span>
{/if}
