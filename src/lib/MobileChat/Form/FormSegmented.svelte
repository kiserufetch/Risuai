<script lang="ts">
    // Segmented control row: a label over 2-4 equal options.

    interface Props {
        label: string
        value: string | number
        options: { value: string | number; label: string }[]
        onchange?: (value: string | number) => void
    }

    let { label, value = $bindable(), options, onchange }: Props = $props()

    function pick(next: string | number) {
        if (next === value) return
        value = next
        onchange?.(next)
    }
</script>

<div class="flex flex-col gap-2 px-4 py-3">
    <span class="text-[15px]">{label}</span>
    <div role="radiogroup" aria-label={label} class="grid gap-1 rounded-xl p-1" style="background: var(--mc-surface); grid-template-columns: repeat({options.length}, minmax(0, 1fr));">
        {#each options as option (option.value)}
            <button type="button" role="radio" aria-checked={value === option.value} class="min-h-9 truncate rounded-lg px-1 text-[13px] font-semibold" style={value === option.value ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => pick(option.value)}>{option.label}</button>
        {/each}
    </div>
</div>
