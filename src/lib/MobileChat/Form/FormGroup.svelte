<script lang="ts">
    import type { Snippet } from 'svelte'

    // A titled rounded group of form rows; rows get 1px separators.

    let { label = '', children }: { label?: string; children: Snippet } = $props()
</script>

<div class="flex flex-col gap-2">
    {#if label}
        <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{label}</span>
    {/if}
    <div class="risu-mc-form-group overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {@render children()}
    </div>
</div>

<style>
    .risu-mc-form-group > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
