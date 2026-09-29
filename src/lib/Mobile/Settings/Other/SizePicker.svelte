<script lang="ts">
    import { language } from 'src/lang'
    import FormStepper from 'src/lib/MobileChat/Form/FormStepper.svelte'

    // Image size as preset chips; "Custom" (or a size off the list) shows width and height.

    let { width = $bindable(), height = $bindable() }: { width: number; height: number } = $props()

    const PRESETS = [[832, 1216], [1216, 832], [1024, 1024], [512, 768]] as const
    let custom = $state(false)
    let matched = $derived(PRESETS.findIndex(([w, h]) => w === width && h === height))
</script>

<div class="flex flex-wrap gap-1.5 px-4 py-3">
    {#each PRESETS as [w, h], i (i)}
        <button type="button" aria-pressed={!custom && matched === i} class="h-8 rounded-full px-3 text-[13px] font-semibold tabular-nums" style={!custom && matched === i ? 'background: var(--mc-text); color: var(--mc-bg);' : 'background: var(--mc-line); color: var(--mc-text2);'} onclick={() => { width = w; height = h; custom = false }}>{w}×{h}</button>
    {/each}
    <button type="button" aria-pressed={custom || matched === -1} class="h-8 rounded-full px-3 text-[13px] font-semibold" style={custom || matched === -1 ? 'background: var(--mc-text); color: var(--mc-bg);' : 'background: var(--mc-line); color: var(--mc-text2);'} onclick={() => { custom = true }}>{language.mobileOther.customSize}</button>
</div>
{#if custom || matched === -1}
    <FormStepper label={language.mobileOther.width} bind:value={width} min={64} max={2048} step={64} />
    <FormStepper label={language.mobileOther.height} bind:value={height} min={64} max={2048} step={64} />
{/if}
