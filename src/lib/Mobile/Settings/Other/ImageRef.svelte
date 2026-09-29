<script lang="ts">
    import { ImagePlusIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { getCharImage } from 'src/ts/characters'
    import { saveAsset } from 'src/ts/globalApi.svelte'
    import { selectSingleFile } from 'src/ts/util'

    // A reference image slot: preview with remove, or an upload row. Saves the file as an
    // asset and hands back the asset id plus base64, as the desktop image settings do.

    interface Props {
        label: string
        image: string | undefined
        hint?: string
        onpick: (id: string, base64: string) => void
        onremove: () => void
    }

    let { label, image, hint = '', onpick, onremove }: Props = $props()

    let src = $state('')
    $effect(() => {
        const id = image
        src = ''
        if (id) getCharImage(id, 'plain').then((url) => { if (id === image) src = url ?? '' })
    })

    async function pick() {
        const file = await selectSingleFile(['jpg', 'jpeg', 'png', 'webp'])
        if (!file) return
        const base64 = Buffer.from(file.data).toString('base64')
        onpick(await saveAsset(file.data), base64)
    }
</script>

<div class="flex min-h-[72px] items-center gap-3 px-4 py-2.5">
    <button type="button" class="flex h-[52px] w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-xl text-(--mc-text2)" style="background: var(--mc-line);" aria-label={label} onclick={pick}>
        {#if image && src}<img {src} alt="" class="h-full w-full object-cover" />{:else}<ImagePlusIcon size={22} />{/if}
    </button>
    <button type="button" class="flex min-w-0 flex-1 flex-col gap-0.5 text-left" onclick={pick}>
        <span class="text-[15px]">{label}</span>
        <span class="text-[12px] text-(--mc-text2)">{image ? language.mobileOther.tapToReplace : hint || language.mobileOther.tapToUpload}</span>
    </button>
    {#if image}
        <button type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style="color: var(--mc-danger);" aria-label={language.mobileBot.remove} onclick={onremove}><XIcon size={18} /></button>
    {/if}
</div>
