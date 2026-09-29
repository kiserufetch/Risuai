<script lang="ts">
    import { ChevronRightIcon } from '@lucide/svelte'
    import { getModelInfo } from 'src/ts/model/modellist'
    import ModelPickerSheet from './ModelPickerSheet.svelte'
    import { modelName, providerName } from './models'

    // A model slot: caption, model name and provider; opens the picker sheet.

    interface Props {
        label: string
        value: string
        hint?: string
        blankable?: boolean
    }

    let { label, value = $bindable(), hint = '', blankable = false }: Props = $props()

    let open = $state(false)
    let info = $derived(getModelInfo(value))
    let sub = $derived(value ? [providerName(info), hint].filter(Boolean).join(' · ') : '')
</script>

<!-- One wrapper, so a form group's row separators never touch the sheet. -->
<div>
    <button type="button" class="flex min-h-16 w-full items-center gap-3 px-4 py-2 text-left" onclick={() => { open = true }}>
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="text-[12px] text-(--mc-text2)">{label}</span>
            <span class="truncate text-[16px] font-semibold">{modelName(value)}</span>
            {#if sub}<span class="truncate text-[12px] text-(--mc-text2)">{sub}</span>{/if}
        </span>
        <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
    </button>

    <ModelPickerSheet {open} title={label} {value} {blankable} onpick={(id) => { value = id }} onclose={() => { open = false }} />
</div>
