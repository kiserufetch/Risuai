<script lang="ts">
    // Number row: label left, compact number field right.

    interface Props {
        label: string
        value: number
        hint?: string
        min?: number
        max?: number
        step?: number
    }

    let { label, value = $bindable(), hint = '', min, max, step = 1 }: Props = $props()

    function clamp() {
        let next = Number(value)
        if (!Number.isFinite(next)) next = min ?? 0
        if (min !== undefined) next = Math.max(min, next)
        if (max !== undefined) next = Math.min(max, next)
        value = next
    }
</script>

<label class="flex min-h-[52px] items-center gap-3 px-4 py-2">
    <span class="flex min-w-0 flex-1 flex-col gap-0.5"><span class="text-[15px]">{label}</span>{#if hint}<span class="text-[12px] text-(--mc-text2)">{hint}</span>{/if}</span>
    <input type="number" inputmode="decimal" bind:value {min} {max} {step} onchange={clamp} class="w-24 border-0 bg-transparent text-right text-[15px] tabular-nums outline-none" style="color: var(--mc-text);" />
</label>
