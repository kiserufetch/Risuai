<script lang="ts">
    import type { Snippet } from 'svelte'

    // Quick-action tile of a sheet (spec §4.2): icon over a short label.

    interface Props {
        label: string
        onclick: () => void
        disabled?: boolean
        active?: boolean
        children: Snippet
    }

    let { label, onclick, disabled = false, active = false, children }: Props = $props()
</script>

<button
    type="button"
    {disabled}
    {onclick}
    class="risu-mc-tile flex min-h-[72px] min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2.5 text-[12px] leading-tight transition-transform active:scale-95 disabled:opacity-40"
    style="background: {active ? 'var(--mc-accent-soft)' : 'var(--mc-group)'}; color: {active ? 'var(--mc-accent)' : 'var(--mc-text)'};"
>
    <span class="flex h-6 items-center" style="color: {active ? 'var(--mc-accent)' : 'var(--mc-text2)'};">{@render children()}</span>
    <span class="line-clamp-2 text-center">{label}</span>
</button>
