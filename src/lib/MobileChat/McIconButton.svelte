<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        label: string
        onclick?: (event: MouseEvent) => void
        disabled?: boolean
        pressed?: boolean
        class?: string
        children: Snippet
    }

    let { label, onclick, disabled = false, pressed = undefined, class: className = '', children }: Props = $props()
</script>

<button
    type="button"
    aria-label={label}
    title={label}
    aria-pressed={pressed}
    {disabled}
    {onclick}
    class="risu-mc-icon-button inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-(--mc-text2) transition-transform active:scale-95 disabled:opacity-40 {className}"
>
    {@render children()}
</button>
