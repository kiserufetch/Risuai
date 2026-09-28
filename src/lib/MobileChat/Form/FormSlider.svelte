<script lang="ts">
    // Range row with the current value on the right.

    interface Props {
        label: string
        value: number
        min: number
        max: number
        step?: number
        fixed?: number
    }

    let { label, value = $bindable(), min, max, step = 1, fixed = 0 }: Props = $props()
</script>

<label class="flex flex-col gap-2 px-4 py-3">
    <span class="flex items-center justify-between text-[15px]"><span>{label}</span><span class="tabular-nums text-(--mc-text2)">{Number(value ?? 0).toFixed(fixed)}</span></span>
    <input type="range" bind:value {min} {max} {step} class="w-full" style="accent-color: var(--mc-accent);" />
</label>
