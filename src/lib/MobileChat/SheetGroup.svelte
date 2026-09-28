<script lang="ts">
    import type { Snippet } from 'svelte'

    // Rounded container that separates its rows with 1px lines (spec §4.2).

    let { children, label = '' }: { children: Snippet; label?: string } = $props()
</script>

<div class="flex flex-col gap-1.5">
    {#if label}
        <span class="px-2 text-[12px] font-medium uppercase tracking-wide text-(--mc-text2)">{label}</span>
    {/if}
    <div class="risu-mc-group overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {@render children()}
    </div>
</div>

<style>
    .risu-mc-group > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
