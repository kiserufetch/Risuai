<script lang="ts">
    // A color swatch row. `nullable` adds a switch: off stores null, on restores `fallback`.

    interface Props {
        label: string
        value: string | null | undefined
        nullable?: boolean
        fallback?: string
        oninput?: (value: string | null) => void
    }

    let { label, value = $bindable(), nullable = false, fallback = '#121212', oninput }: Props = $props()

    function set(next: string | null) {
        value = next
        oninput?.(next)
    }
</script>

<div class="flex min-h-[52px] items-center gap-3 px-4">
    <span class="min-w-0 flex-1 text-[15px]">{label}</span>
    {#if !nullable || value}
        <input type="color" aria-label={label} value={value || '#000000'} oninput={(e) => set((e.currentTarget as HTMLInputElement).value)} class="risu-mc-color h-8 w-8 shrink-0 cursor-pointer" />
    {/if}
    {#if nullable}
        <button type="button" role="switch" aria-checked={!!value} aria-label={label} class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {value ? 'var(--mc-accent)' : 'var(--mc-line)'};" onclick={() => set(value ? null : fallback)}>
            <span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {value ? '21px' : '3px'};"></span>
        </button>
    {/if}
</div>

<style>
    .risu-mc-color {
        padding: 0;
        border: 0;
        border-radius: 9999px;
        background: transparent;
        appearance: none;
        -webkit-appearance: none;
    }
    .risu-mc-color::-webkit-color-swatch-wrapper {
        padding: 0;
    }
    .risu-mc-color::-webkit-color-swatch {
        border: 1px solid var(--mc-line);
        border-radius: 9999px;
    }
    .risu-mc-color::-moz-color-swatch {
        border: 1px solid var(--mc-line);
        border-radius: 9999px;
    }
</style>
