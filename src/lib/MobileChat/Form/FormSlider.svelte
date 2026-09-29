<script lang="ts">
    import { language } from 'src/lang'

    // Range row with the current value on the right. `disableable` adds a switch: off
    // stores -1000 (SliderInput's "not sent"), and undefined also reads as off.

    interface Props {
        label: string
        value: number | undefined
        min: number
        max: number
        step?: number
        fixed?: number
        /** Scale for the shown number only, like SliderInput. */
        multiple?: number
        disableable?: boolean
        format?: (value: number) => string
        /** Runs after the bound value has updated. */
        oninput?: () => void
    }

    let { label, value = $bindable(), min, max, step = 1, fixed = 0, multiple = 1, disableable = false, format, oninput }: Props = $props()

    let off = $derived(disableable && (value === -1000 || value === undefined))
    let shown = $derived(off ? language.mobileBot.off : format ? format(Number(value ?? 0)) : (Number(value ?? 0) * multiple).toFixed(fixed))

    function setOn(on: boolean) {
        value = on ? min : -1000
        oninput?.()
    }
</script>

<div class="flex flex-col gap-2 px-4 py-3">
    <span class="flex items-center justify-between gap-3 text-[15px]">
        <span class:text-(--mc-text2)={off}>{label}</span>
        <span class="flex shrink-0 items-center gap-2.5">
            <span class="tabular-nums text-(--mc-text2)">{shown}</span>
            {#if disableable}
                <button type="button" role="switch" aria-checked={!off} aria-label={label} class="relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors" style="background: {off ? 'var(--mc-line)' : 'var(--mc-accent)'};" onclick={() => setOn(off)}>
                    <span class="absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all" style="left: {off ? '3px' : '19px'};"></span>
                </button>
            {/if}
        </span>
    </span>
    {#if !off}
        <input type="range" aria-label={label} bind:value {min} {max} {step} oninput={() => queueMicrotask(() => oninput?.())} class="w-full" style="accent-color: var(--mc-accent);" />
    {/if}
</div>
