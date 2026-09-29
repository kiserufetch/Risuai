<script lang="ts">
    // Range row with the current value on the right.

    interface Props {
        label: string
        value: number
        min: number
        max: number
        step?: number
        fixed?: number
        format?: (value: number) => string
        /** Runs after the bound value has updated. */
        oninput?: () => void
    }

    let { label, value = $bindable(), min, max, step = 1, fixed = 0, format, oninput }: Props = $props()
</script>

<label class="flex flex-col gap-2 px-4 py-3">
    <span class="flex items-center justify-between gap-3 text-[15px]"><span>{label}</span><span class="shrink-0 tabular-nums text-(--mc-text2)">{format ? format(Number(value ?? 0)) : Number(value ?? 0).toFixed(fixed)}</span></span>
    <input type="range" bind:value {min} {max} {step} oninput={() => queueMicrotask(() => oninput?.())} class="w-full" style="accent-color: var(--mc-accent);" />
</label>
