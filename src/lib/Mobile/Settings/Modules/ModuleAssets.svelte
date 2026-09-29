<script lang="ts">
    import { FileIcon, MusicIcon, PlusIcon, Trash2Icon, VideoIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import Sheet from 'src/lib/MobileChat/Sheet.svelte'
    import SheetGroup from 'src/lib/MobileChat/SheetGroup.svelte'
    import SheetRow from 'src/lib/MobileChat/SheetRow.svelte'
    import { getFileSrc, saveAsset } from 'src/ts/globalApi.svelte'
    import { selectMultipleFile } from 'src/ts/util'
    import { currentModule } from './modulePage.svelte'

    // Mockup "Модуль · ассеты": a thumbnail grid; tap for rename, preview and delete.
    // Files are stored as [name, asset path, extension], as in ModuleMenu.svelte.

    const t = $derived(language.mobileModules)
    let m = $derived(currentModule())
    let assets = $derived(m?.assets ?? [])
    let selected: number | null = $state(null)

    let sources: Record<string, string> = $state({})
    const requested = new Set<string>()
    $effect(() => {
        for (const [, path] of assets) {
            if (path && !requested.has(path)) {
                requested.add(path)
                getFileSrc(path).then((src) => { sources[path] = src })
            }
        }
    })

    const ext = (a: [string, string, string]) => (a[2] || a[1].split('.').pop() || '').toLowerCase()
    const isImage = (e: string) => ['png', 'webp', 'gif', 'jpeg', 'jpg', 'svg', 'avif'].includes(e)

    async function add() {
        const files = await selectMultipleFile(['png', 'webp', 'mp4', 'mp3', 'gif', 'jpeg', 'jpg', 'ttf', 'otf', 'css', 'webm', 'woff', 'woff2', 'svg', 'avif'])
        if (!files || !m) return
        m.assets ??= []
        for (const f of files) {
            const extension = f.name.split('.').pop()?.toLowerCase() ?? ''
            m.assets.push([f.name, await saveAsset(f.data, '', extension), extension])
        }
    }

    function remove(i: number) {
        selected = null
        m?.assets?.splice(i, 1)
    }
</script>

{#snippet thumb(a: [string, string, string], size: string)}
    {@const e = ext(a)}
    <span class="flex {size} items-center justify-center overflow-hidden rounded-[14px] text-(--mc-text2)" style="background: var(--mc-line);">
        {#if isImage(e) && sources[a[1]]}
            <img src={sources[a[1]]} alt="" class="h-full w-full object-cover" loading="lazy" />
        {:else if e === 'mp3'}<MusicIcon size={26} />{:else if e === 'mp4' || e === 'webm'}<VideoIcon size={26} />{:else}<FileIcon size={26} />{/if}
    </span>
{/snippet}

<div class="flex flex-col gap-3.5">
    <div class="grid grid-cols-3 gap-2.5">
        {#each assets as a, i (i)}
            <button type="button" class="flex min-w-0 flex-col gap-1.5 text-left" onclick={() => { selected = i }}>
                {@render thumb(a, 'aspect-square w-full')}
                <span class="truncate text-[12px]">{a[0]}</span>
            </button>
        {/each}
        <button type="button" class="flex min-w-0 flex-col gap-1.5 text-left" onclick={add}>
            <span class="flex aspect-square w-full items-center justify-center rounded-[14px] border-[1.5px] border-dashed" style="border-color: var(--mc-line); color: var(--mc-accent);"><PlusIcon size={26} /></span>
            <span class="text-[12px]" style="color: var(--mc-accent);">{t.addAsset}</span>
        </button>
    </div>
    <span class="px-2 text-[12px] text-(--mc-text2)">{t.assetsHint}</span>
</div>

<Sheet open={selected !== null && !!assets[selected]} label={t.assets} onclose={() => { selected = null }}>
    {#if selected !== null && assets[selected] && m?.assets}
        {@const a = assets[selected]}
        {@const e = ext(a)}
        <div class="flex shrink-0 justify-center">
            {#if (e === 'mp3') && sources[a[1]]}
                <audio controls class="w-full" src={sources[a[1]]}></audio>
            {:else if (e === 'mp4' || e === 'webm') && sources[a[1]]}
                <!-- svelte-ignore a11y_media_has_caption -->
                <video controls class="max-h-[40dvh] w-full rounded-2xl" src={sources[a[1]]}></video>
            {:else}
                {@render thumb(a, 'h-40 w-40')}
            {/if}
        </div>
        <label class="flex shrink-0 flex-col gap-1 rounded-2xl px-4 py-2.5" style="background: var(--mc-group);">
            <span class="text-[12px] text-(--mc-text2)">{language.name}</span>
            <input bind:value={m.assets[selected][0]} autocomplete="off" autocapitalize="off" spellcheck="false" class="border-0 bg-transparent text-[16px] outline-none" style="color: var(--mc-text);" />
        </label>
        <SheetGroup>
            <SheetRow label={language.mobileBot.remove} danger onclick={() => remove(selected ?? 0)}><Trash2Icon size={20} /></SheetRow>
        </SheetGroup>
    {/if}
</Sheet>
