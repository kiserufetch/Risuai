<script lang="ts">
    import { UserIcon } from '@lucide/svelte'
    import { getCharImage } from 'src/ts/characters'

    // Persona image as a rounded square; an empty icon shows a placeholder glyph.

    let { icon, size = 48, radius = 14, large = false }: { icon: string; size?: number; radius?: number; large?: boolean } = $props()

    let style = $state('')
    $effect(() => {
        const source = icon
        if (!source) {
            style = ''
            return
        }
        getCharImage(source, large ? 'lgcss' : 'css').then((css) => {
            if (source === icon) style = css ?? ''
        })
    })
</script>

<span class="flex shrink-0 items-center justify-center overflow-hidden bg-cover bg-center text-(--mc-text2)" style="width: {size}px; height: {size}px; border-radius: {radius}px; background-color: var(--mc-line); {style}">
    {#if !style}<UserIcon size={Math.round(size * 0.45)} />{/if}
</span>
