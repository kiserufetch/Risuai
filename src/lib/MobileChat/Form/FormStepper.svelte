<script lang="ts">
    // Number row with − / + around an editable field; the value is clamped on commit.

    interface Props {
        label: string
        value: number
        hint?: string
        min?: number
        max?: number
        step?: number
    }

    let { label, value = $bindable(), hint = '', min, max, step = 1 }: Props = $props()

    function commit(next: number) {
        if (!Number.isFinite(next)) next = min ?? 0
        if (min !== undefined) next = Math.max(min, next)
        if (max !== undefined) next = Math.min(max, next)
        value = next
    }
</script>

<div class="flex min-h-[60px] items-center gap-3 px-4 py-2">
    <span class="flex min-w-0 flex-1 flex-col gap-0.5"><span class="text-[15px]">{label}</span>{#if hint}<span class="text-[12px] text-(--mc-text2)">{hint}</span>{/if}</span>
    <span class="flex shrink-0 items-center overflow-hidden rounded-xl" style="background: var(--mc-surface);">
        <button type="button" class="flex h-9 w-9 items-center justify-center text-[18px] text-(--mc-text2)" aria-label="−{step}" onclick={() => commit(Number(value) - step)}>−</button>
        <input type="number" inputmode="numeric" aria-label={label} value={value} {min} {max} onchange={(e) => commit(Number((e.currentTarget as HTMLInputElement).value))} class="w-[72px] border-0 bg-transparent text-center text-[15px] font-semibold tabular-nums outline-none" style="color: var(--mc-text);" />
        <button type="button" class="flex h-9 w-9 items-center justify-center text-[18px] text-(--mc-text2)" aria-label="+{step}" onclick={() => commit(Number(value) + step)}>+</button>
    </span>
</div>
