<script lang="ts">
    import { ChevronRightIcon } from '@lucide/svelte'

    // Row that opens a sub-page; the value summary sits right-aligned before the chevron.

    let { label, value = '', onclick }: { label: string; value?: string; onclick: () => void } = $props()
</script>

<button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left" {onclick}>
    <span class="shrink-0 text-[15px]">{label}</span>
    {#if value}<span class="ml-auto min-w-0 truncate text-right text-[13px] text-(--mc-text2)">{value}</span>{/if}
    <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2) {value ? '' : 'ml-auto'}" />
</button>
