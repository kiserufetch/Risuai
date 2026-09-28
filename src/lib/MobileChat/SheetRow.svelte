<script lang="ts">
    import type { Snippet } from 'svelte'

    // A 52px row inside a sheet group (spec §4.2). `toggle` renders a switch on the right.

    interface Props {
        label: string
        onclick: () => void
        danger?: boolean
        disabled?: boolean
        toggle?: boolean | null
        trailing?: string
        children?: Snippet
    }

    let { label, onclick, danger = false, disabled = false, toggle = null, trailing = '', children }: Props = $props()
</script>

<button
    type="button"
    {disabled}
    {onclick}
    role={toggle === null ? undefined : 'switch'}
    aria-checked={toggle === null ? undefined : toggle}
    class="risu-mc-row flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px] active:opacity-70 disabled:opacity-40"
    style="color: {danger ? 'var(--mc-danger)' : 'var(--mc-text)'};"
>
    {#if children}
        <span class="flex w-6 shrink-0 justify-center" style="color: {danger ? 'var(--mc-danger)' : 'var(--mc-text2)'};">{@render children()}</span>
    {/if}
    <span class="min-w-0 flex-1 truncate">{label}</span>
    {#if trailing}
        <span class="text-[13px] text-(--mc-text2)">{trailing}</span>
    {/if}
    {#if toggle !== null}
        <span class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {toggle ? 'var(--mc-accent)' : 'var(--mc-line)'};">
            <span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {toggle ? '21px' : '3px'};"></span>
        </span>
    {/if}
</button>
