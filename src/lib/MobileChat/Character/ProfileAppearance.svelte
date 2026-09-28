<script lang="ts">
    import { CheckIcon, FileIcon, FilmIcon, ImageIcon, ImageOffIcon, MusicIcon, PlusIcon, SearchIcon, Trash2Icon, TypeIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertConfirm } from 'src/ts/alert'
    import { addCharEmotion, addingEmotion, changeCharImage, getCharImage, makeGroupImage, rmCharEmotion, selectCharImg } from 'src/ts/characters'
    import { getFileSrc } from 'src/ts/globalApi.svelte'
    import { longpress } from 'src/ts/gui/longtouch'
    import { updateInlayScreen } from 'src/ts/process/inlayScreen'
    import { saveImage, type character, type groupChat } from 'src/ts/storage/database.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { selectMultipleFile, selectSingleFile } from 'src/ts/util'
    import * as session from 'src/ts/chatCore/session.svelte'
    import Sheet from '../Sheet.svelte'
    import SheetRow from '../SheetRow.svelte'
    import SheetGroup from '../SheetGroup.svelte'
    import ProfileField from './ProfileField.svelte'

    // "Внешний вид" of the profile (mockups "Внешний вид · Аватар / Портрет / Ассеты"),
    // ported from CharConfig submenu 1 with the same fields and helpers.

    let tab: 'avatar' | 'portrait' | 'assets' = $state('avatar')
    let emotionFor: number | null = $state(null)
    let assetQuery = $state('')

    let index = $derived(session.getCharacterIndex())
    let char = $derived(session.getCharacter())
    let single = $derived(char?.type === 'character' ? (char as character) : null)
    let group = $derived(char?.type === 'group' ? (char as groupChat) : null)

    const IMAGE_EXT = ['png', 'webp', 'jpeg', 'jpg', 'gif', 'avif', 'svg']

    function toggle(on: boolean) {
        return {
            track: `background: ${on ? 'var(--mc-accent)' : 'var(--mc-line)'};`,
            knob: `left: ${on ? '21px' : '3px'};`,
        }
    }

    // --- Avatar ---------------------------------------------------------------

    async function removeVariant(variant: number) {
        if (!single || !(await alertConfirm(language.mobileAppearance.removeVariantConfirm))) {
            return
        }
        if (variant === -1) {
            // CharConfig: dropping the main image promotes the first variant.
            single.image = ''
            if (single.ccAssets?.length) {
                changeCharImage(index, 0)
            }
        } else {
            single.ccAssets.splice(variant, 1)
        }
    }

    // --- Portrait -------------------------------------------------------------

    function setViewScreen(value: string) {
        if (!char) {
            return
        }
        char.viewScreen = value as never
        if (single) {
            DBState.db.characters[index] = updateInlayScreen(single)
        }
    }

    function setInlay(on: boolean) {
        if (!single) {
            return
        }
        single.inlayViewScreen = on
        if (single.viewScreen === 'emotion') {
            if (on && single.additionalAssets === undefined) {
                single.additionalAssets = []
            } else if (!on && single.additionalAssets?.length === 0) {
                single.additionalAssets = undefined
            }
        }
        DBState.db.characters[index] = updateInlayScreen(single)
    }

    async function replaceEmotionImage(emotion: number) {
        const selected = await selectSingleFile(['png', 'webp', 'gif'])
        if (!selected || !char) {
            return
        }
        char.emotionImages[emotion][1] = await saveImage(selected.data)
    }

    function deleteEmotion(emotion: number) {
        emotionFor = null
        rmCharEmotion(index, emotion)
    }

    // --- Assets ---------------------------------------------------------------

    function assetKind(ext: string) {
        const e = (ext ?? '').toLowerCase()
        if (IMAGE_EXT.includes(e)) return { icon: ImageIcon, label: language.mobileAppearance.kindImage }
        if (['mp3', 'wav', 'ogg'].includes(e)) return { icon: MusicIcon, label: language.mobileAppearance.kindAudio }
        if (['mp4', 'webm'].includes(e)) return { icon: FilmIcon, label: language.mobileAppearance.kindVideo }
        if (['ttf', 'otf', 'woff', 'woff2'].includes(e)) return { icon: TypeIcon, label: language.mobileAppearance.kindFont }
        return { icon: FileIcon, label: language.mobileAppearance.kindOther }
    }

    function assetExt(asset: [string, string, string?]) {
        return asset[2] || asset[1].split('.').pop() || ''
    }

    let assets = $derived(
        (single?.additionalAssets ?? [])
            .map((asset, i) => ({ asset: asset as [string, string, string?], i }))
            .filter(({ asset }) => !assetQuery.trim() || asset[0].toLocaleLowerCase().includes(assetQuery.trim().toLocaleLowerCase())),
    )
    let showExclude = $derived(!!DBState.db.newImageHandlingBeta || !!DBState.db.useAdditionalAssetsPreview)

    /** CharConfig's asset upload: same extensions, same [name, path, ext] triples. */
    async function addAssets() {
        if (!single) {
            return
        }
        const files = await selectMultipleFile(['png', 'webp', 'mp4', 'mp3', 'gif', 'jpeg', 'jpg', 'ttf', 'otf', 'css', 'webm', 'woff', 'woff2', 'svg', 'avif'])
        single.additionalAssets = single.additionalAssets ?? []
        if (!files) {
            return
        }
        for (const file of files) {
            const extension = file.name.split('.').pop().toLowerCase()
            const path = await saveImage(file.data, '', extension)
            single.additionalAssets.push([file.name, path, extension])
            single.additionalAssets = single.additionalAssets
        }
    }

    function deleteAsset(i: number) {
        if (!single) {
            return
        }
        // Parity with CharConfig, which resets the greeting pick when an asset goes away.
        single.chats[single.chatPage].fmIndex = -1
        single.additionalAssets.splice(i, 1)
        single.additionalAssets = single.additionalAssets
    }

    function toggleExclude(path: string) {
        if (!single) {
            return
        }
        single.prebuiltAssetExclude ??= []
        single.prebuiltAssetExclude = single.prebuiltAssetExclude.includes(path)
            ? single.prebuiltAssetExclude.filter((p) => p !== path)
            : [...single.prebuiltAssetExclude, path]
    }
</script>

{#snippet switchRow(label: string, hint: string, on: boolean, onchange: () => void)}
    {@const t = toggle(on)}
    <button type="button" role="switch" aria-checked={on} class="flex min-h-14 w-full items-center gap-3 rounded-2xl px-4 py-2 text-left" style="background: var(--mc-group);" onclick={onchange}>
        <span class="flex flex-1 flex-col gap-0.5"><span class="text-[15px]">{label}</span>{#if hint}<span class="text-[12px] text-(--mc-text2)">{hint}</span>{/if}</span>
        <span class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style={t.track}><span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style={t.knob}></span></span>
    </button>
{/snippet}

{#snippet modeOption(value: string, label: string, hint: string)}
    {@const on = char?.viewScreen === value}
    <button type="button" role="radio" aria-checked={on} class="flex items-center gap-3 rounded-2xl border-[1.5px] px-3.5 py-3 text-left" style={on ? 'border-color: var(--mc-accent); background: var(--mc-accent-soft);' : 'border-color: var(--mc-line); background: var(--mc-group);'} onclick={() => setViewScreen(value)}>
        <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2" style="border-color: {on ? 'var(--mc-accent)' : 'var(--mc-line)'};">
            {#if on}<span class="h-2.5 w-2.5 rounded-full" style="background: var(--mc-accent);"></span>{/if}
        </span>
        <span class="flex flex-col gap-0.5"><span class="text-[15px] font-semibold">{label}</span><span class="text-[12px] text-(--mc-text2)">{hint}</span></span>
    </button>
{/snippet}

<div role="tablist" aria-label={language.mobileAppearance.sections} class="sticky top-0 z-10 -mx-4 mb-4 grid grid-cols-3 gap-1 px-4 pb-1 pt-1" style="background: var(--mc-bg);">
    <div class="col-span-3 grid grid-cols-3 gap-1 rounded-[14px] p-1" style="background: var(--mc-surface);">
        {#each [['avatar', language.mobileAppearance.tabAvatar], ['portrait', language.mobileAppearance.tabPortrait], ['assets', language.mobileAppearance.tabAssets]] as [key, label] (key)}
            {#if key !== 'assets' || single}
                <button type="button" role="tab" aria-selected={tab === key} class="h-9 rounded-[10px] text-[14px] font-semibold" style={tab === key ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => { tab = key as typeof tab }}>{label}</button>
            {/if}
        {/each}
    </div>
</div>

{#if !char}
    <!-- nothing selected -->
{:else if tab === 'avatar'}
    <div class="flex flex-col gap-4">
        {#if group}
            <button type="button" class="flex items-center gap-3.5 text-left" onclick={() => selectCharImg(index)}>
                {#await getCharImage(group.image ?? '', 'css') then css}
                    <span class="h-24 w-24 shrink-0 rounded-2xl bg-cover bg-center" style={css || 'background: var(--mc-group);'}></span>
                {/await}
                <span class="flex flex-col gap-1"><span class="text-[17px] font-semibold">{language.mobileAppearance.mainAvatar}</span><span class="text-[13px] text-(--mc-text2)">{language.mobileAppearance.groupAvatarHint}</span></span>
            </button>
            <button type="button" class="flex min-h-[52px] items-center justify-center rounded-2xl text-[15px] font-semibold" style="background: var(--mc-group);" onclick={() => makeGroupImage()}>{language.mobileAppearance.groupImage}</button>
        {:else if single}
            <div class="flex items-center gap-3.5">
                {#await getCharImage(single.image ?? '', 'css') then css}
                    <span class="shrink-0 rounded-2xl bg-cover bg-center" style="{css || 'background: var(--mc-group);'}width: 96px; height: {single.largePortrait ? 128 : 96}px;"></span>
                {/await}
                <span class="flex flex-col gap-1"><span class="text-[17px] font-semibold">{language.mobileAppearance.mainAvatar}</span><span class="text-[13px] leading-[18px] text-(--mc-text2)">{language.mobileAppearance.mainAvatarHint}</span></span>
            </div>
            <div class="flex flex-col gap-2">
                <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{language.mobileAppearance.variants.replace('{}', String((single.image ? 1 : 0) + (single.ccAssets?.length ?? 0)))}</span>
                <div class="grid grid-cols-3 gap-2.5">
                    {#if single.image}
                        {#await getCharImage(single.image, 'css') then css}
                            <button type="button" aria-label={language.mobileAppearance.mainAvatar} class="relative rounded-[14px] bg-cover bg-center" style="{css}aspect-ratio: 3/4; box-shadow: 0 0 0 3px var(--mc-accent);" use:longpress={() => removeVariant(-1)}>
                                <span class="absolute right-1.5 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full" style="background: var(--mc-accent); color: var(--mc-on-accent);"><CheckIcon size={14} strokeWidth={3} /></span>
                            </button>
                        {/await}
                    {/if}
                    {#each single.ccAssets ?? [] as asset, i (asset.uri + i)}
                        {#await getCharImage(asset.uri, 'css') then css}
                            <button type="button" aria-label={language.mobileAppearance.variant.replace('{}', String(i + 2))} class="rounded-[14px] bg-cover bg-center active:opacity-80" style="{css || 'background: var(--mc-group);'}aspect-ratio: 3/4;" onclick={() => changeCharImage(index, i)} use:longpress={() => removeVariant(i)}></button>
                        {/await}
                    {/each}
                    <button type="button" aria-label={language.mobileAppearance.addImage} class="flex flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed text-[12px] font-medium text-(--mc-text2)" style="aspect-ratio: 3/4; border-color: var(--mc-line);" onclick={() => selectCharImg(index)}>
                        <PlusIcon size={22} />{language.mobileAppearance.add}
                    </button>
                </div>
                <span class="px-2 text-[13px] text-(--mc-text2)">{language.mobileAppearance.removeHint}</span>
            </div>
            {#if single.image}
                {@render switchRow(language.mobileAppearance.tallPortrait, language.mobileAppearance.tallPortraitHint, !!single.largePortrait, () => { single.largePortrait = !single.largePortrait })}
            {/if}
        {/if}
    </div>
{:else if tab === 'portrait'}
    <div class="flex flex-col gap-3.5">
        <div role="radiogroup" aria-label={language.mobileAppearance.portraitMode} class="flex flex-col gap-2">
            {@render modeOption('none', language.mobileAppearance.modeNone, language.mobileAppearance.modeNoneHint)}
            {#if single}
                {@render modeOption('emotion', language.mobileAppearance.modeEmotion, language.mobileAppearance.modeEmotionHint)}
                {@render modeOption('imggen', language.mobileAppearance.modeImggen, language.mobileAppearance.modeImggenHint)}
            {:else}
                {@render modeOption('single', language.mobileAppearance.modeSingle, language.mobileAppearance.modeSingleHint)}
                {@render modeOption('multiple', language.mobileAppearance.modeMultiple, language.mobileAppearance.modeMultipleHint)}
                {@render modeOption('emp', language.mobileAppearance.modeEmp, language.mobileAppearance.modeEmpHint)}
            {/if}
        </div>
        {#if single && (single.viewScreen === 'emotion' || single.viewScreen === 'imggen')}
            <span class="px-2 text-[12px] text-(--mc-text2)">{language.emotionWarn}</span>
        {/if}
        {#if single?.viewScreen === 'emotion'}
            <div class="flex flex-col gap-2">
                <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{language.mobileAppearance.emotions.replace('{}', String(single.emotionImages.length))}</span>
                <div class="grid grid-cols-3 gap-2.5">
                    {#each single.emotionImages as emotion, i (emotion[1] + i)}
                        <button type="button" class="flex min-w-0 flex-col gap-1.5 text-left text-[13px] font-medium" aria-label={emotion[0]} onclick={() => { emotionFor = i }}>
                            {#await getCharImage(emotion[1], 'css') then css}
                                <span class="block aspect-square w-full rounded-[14px] bg-cover bg-center" style={css || 'background: var(--mc-group);'}></span>
                            {/await}
                            <span class="truncate">{emotion[0]}</span>
                        </button>
                    {/each}
                    <button type="button" class="flex flex-col gap-1.5 text-[13px] font-medium text-(--mc-text2)" disabled={$addingEmotion} onclick={() => addCharEmotion(index)}>
                        <span class="flex aspect-square w-full items-center justify-center rounded-[14px] border-[1.5px] border-dashed" style="border-color: var(--mc-line);"><PlusIcon size={22} /></span>
                        {$addingEmotion ? language.mobileAppearance.adding : language.mobileAppearance.add}
                    </button>
                </div>
            </div>
            {@render switchRow(language.mobileAppearance.inlay, language.mobileAppearance.inlayHint, !!single.inlayViewScreen, () => setInlay(!single.inlayViewScreen))}
            {#if single.inlayViewScreen}
                <ProfileField label={language.imgGenInstructions} bind:value={single.newGenData.emotionInstructions} tokens={false} />
            {/if}
        {:else if single?.viewScreen === 'imggen'}
            <ProfileField label={language.imgGenPrompt} bind:value={single.newGenData.prompt} tokens={false} />
            <ProfileField label={language.imgGenNegatives} bind:value={single.newGenData.negative} tokens={false} />
            <ProfileField label={language.imgGenInstructions} bind:value={single.newGenData.instructions} tokens={false} />
            {@render switchRow(language.mobileAppearance.inlay, language.mobileAppearance.inlayHint, !!single.inlayViewScreen, () => setInlay(!single.inlayViewScreen))}
        {/if}
    </div>
{:else if tab === 'assets' && single}
    <div class="flex flex-col gap-3.5">
        <div class="flex gap-2">
            <label class="flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-full px-3.5" style="background: var(--mc-group);">
                <SearchIcon size={17} class="shrink-0 text-(--mc-text2)" />
                <input type="search" bind:value={assetQuery} placeholder={language.mobileAppearance.searchAssets} aria-label={language.mobileAppearance.searchAssets} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
            </label>
            <button type="button" class="flex h-[42px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={addAssets}>
                <PlusIcon size={18} strokeWidth={2.4} />{language.mobileAppearance.addFiles}
            </button>
        </div>
        {#if assets.length === 0}
            <span class="py-8 text-center text-[14px] text-(--mc-text2)">{assetQuery ? language.mobileDialogs.nothingFound : language.mobileAppearance.noAssets}</span>
        {:else}
            <ul class="risu-mc-group overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {#each assets as { asset, i } (asset[1] + i)}
                    {@const ext = assetExt(asset)}
                    {@const kind = assetKind(ext)}
                    {@const excluded = single.prebuiltAssetExclude?.includes(asset[1])}
                    <li class="flex min-h-16 items-center gap-3 py-2 pl-3 pr-1.5">
                        {#if DBState.db.useAdditionalAssetsPreview && IMAGE_EXT.includes(ext.toLowerCase())}
                            {#await getFileSrc(asset[1]) then src}
                                <img {src} alt="" loading="lazy" class="h-12 w-12 shrink-0 rounded-[10px] object-cover" />
                            {/await}
                        {:else}
                            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px]" style="background: var(--mc-accent-soft); color: var(--mc-accent);"><kind.icon size={20} /></span>
                        {/if}
                        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                            <input bind:value={asset[0]} aria-label={language.mobileAppearance.searchAssets} class="min-w-0 border-0 bg-transparent text-[15px] outline-none" style="color: var(--mc-text);" />
                            <span class="text-[12px] text-(--mc-text2)">{ext.toUpperCase()} · {kind.label}</span>
                        </span>
                        {#if showExclude}
                            <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style="color: {excluded ? 'var(--mc-text2)' : 'var(--mc-accent)'};" aria-label={excluded ? language.mobileAppearance.includeAsset : language.mobileAppearance.excludeAsset} onclick={() => toggleExclude(asset[1])}>
                                {#if excluded}<ImageOffIcon size={19} />{:else}<ImageIcon size={19} />{/if}
                            </button>
                        {/if}
                        <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label={language.mobileAppearance.deleteAsset.replace('{}', asset[0])} onclick={() => deleteAsset(i)}>
                            <Trash2Icon size={19} />
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
        {#if DBState.db.newImageHandlingBeta}
            {@render switchRow(language.mobileAppearance.assetPrompt, language.mobileAppearance.assetPromptHint, !!single.prebuiltAssetCommand, () => { single.prebuiltAssetCommand = !single.prebuiltAssetCommand })}
            <div class="flex items-center gap-3 rounded-2xl px-4 py-2" style="background: var(--mc-group);">
                <span class="flex-1 text-[15px]">{language.mobileAppearance.assetStyle}</span>
                <span class="grid grid-cols-2 gap-1 rounded-xl p-1" style="background: var(--mc-surface);" role="radiogroup" aria-label={language.mobileAppearance.assetStyle}>
                    {#each [['', language.mobileAppearance.styleStatic], ['dynamic', language.mobileAppearance.styleDynamic]] as [value, label] (value)}
                        <button type="button" role="radio" aria-checked={(single.prebuiltAssetStyle ?? '') === value} class="h-8 rounded-lg px-3 text-[13px] font-semibold" style={(single.prebuiltAssetStyle ?? '') === value ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => { single.prebuiltAssetStyle = value }}>{label}</button>
                    {/each}
                </span>
            </div>
        {/if}
    </div>
{/if}

{#if emotionFor !== null && single?.emotionImages[emotionFor]}
    {@const emotion = single.emotionImages[emotionFor]}
    {@const current = emotionFor}
    <Sheet open={true} label={emotion[0]} onclose={() => { emotionFor = null }}>
        <div class="flex items-center gap-3.5 px-1">
            {#await getCharImage(emotion[1], 'css') then css}
                <span class="h-[88px] w-[88px] shrink-0 rounded-2xl bg-cover bg-center" style={css || 'background: var(--mc-group);'}></span>
            {/await}
            <span class="flex flex-col gap-0.5"><span class="truncate text-[17px] font-semibold">{emotion[0]}</span><span class="text-[13px] text-(--mc-text2)">{language.mobileAppearance.emotionNameHint}</span></span>
        </div>
        <label class="flex flex-col gap-1.5 rounded-2xl px-3.5 py-3" style="background: var(--mc-group);">
            <span class="text-[12px] text-(--mc-text2)">{language.mobileAppearance.emotionName}</span>
            <input bind:value={emotion[0]} class="border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
        </label>
        <SheetGroup>
            <SheetRow label={language.mobileAppearance.replaceImage} onclick={() => replaceEmotionImage(current)}><ImageIcon size={19} /></SheetRow>
            <SheetRow label={language.mobileAppearance.deleteEmotion} danger onclick={() => deleteEmotion(current)}><Trash2Icon size={19} /></SheetRow>
        </SheetGroup>
    </Sheet>
{/if}

<style>
    .risu-mc-group > :global(li + li) {
        border-top: 1px solid var(--mc-line);
    }
</style>
