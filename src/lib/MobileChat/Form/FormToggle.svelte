<script lang="ts">
    // Switch row: label, optional hint, bindable value.

    interface Props {
        label: string
        hint?: string
        checked: boolean
        onchange?: (value: boolean) => void
    }

    let { label, hint = '', checked = $bindable(), onchange }: Props = $props()

    function toggle() {
        checked = !checked
        onchange?.(checked)
    }
</script>

<button type="button" role="switch" aria-checked={!!checked} class="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left" onclick={toggle}>
    <span class="flex min-w-0 flex-1 flex-col gap-0.5"><span class="text-[15px]">{label}</span>{#if hint}<span class="text-[12px] text-(--mc-text2)">{hint}</span>{/if}</span>
    <span class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {checked ? 'var(--mc-accent)' : 'var(--mc-line)'};">
        <span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {checked ? '21px' : '3px'};"></span>
    </span>
</button>
