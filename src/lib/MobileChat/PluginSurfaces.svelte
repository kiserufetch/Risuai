<script lang="ts">
    import { additionalFloatingActionButtons } from 'src/ts/stores.svelte'
    import PluginDefinedIcon from '../Others/PluginDefinedIcon.svelte'

    // registerButton('action') (spec §5.11, §7.5): a vertical stack of 40px round
    // buttons on the right, below the header instead of over it.

    let { top }: { top: number } = $props()
</script>

{#if additionalFloatingActionButtons.length > 0}
    <div class="risu-mc-plugin-actions absolute z-20 flex flex-col gap-2" style="top: {top}px; right: calc(12px + var(--safe-right, 0px));">
        {#each additionalFloatingActionButtons as button (button)}
            <button
                type="button"
                class="flex h-10 w-10 items-center justify-center rounded-full border shadow-lg active:scale-95"
                style="background: var(--mc-surface); border-color: var(--mc-line); color: var(--mc-text);"
                aria-label={button.name}
                title={button.name}
                onclick={() => button.callback()}
            >
                <PluginDefinedIcon ico={button} />
            </button>
        {/each}
    </div>
{/if}
