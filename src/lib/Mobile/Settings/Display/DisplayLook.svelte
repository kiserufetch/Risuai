<script lang="ts">
    import { CheckIcon, DownloadIcon, UploadIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSegmented from 'src/lib/MobileChat/Form/FormSegmented.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import {
        changeColorScheme, changeColorSchemeType, exportColorScheme, importColorScheme, updateCustomColorScheme, updateTextThemeAndCSS,
    } from 'src/ts/gui/colorscheme'
    import { saveImage } from 'src/ts/storage/database.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { selectSingleFile } from 'src/ts/util'
    import ColorRow from './ColorRow.svelte'
    import { formatSchemeName, pickableSchemes, schemeColors } from './schemes'

    // Mockup "Оформление": scheme cards (+ the custom scheme editor), text color, font,
    // chat background, avatar shape.

    const t = $derived(language.mobileDisplay)
    const COLLAPSED = 3

    let expanded = $state(false)
    let active = $derived(DBState.db.colorSchemeName ?? 'default')
    let shown = $derived.by(() => {
        if (expanded) return pickableSchemes as string[]
        const head: string[] = pickableSchemes.slice(0, COLLAPSED)
        if (active !== 'custom' && !head.includes(active)) head.push(active)
        return head
    })

    const SCHEME_COLORS = [
        ['bgcolor', 'cBackground'], ['darkbg', 'cDarkBackground'], ['borderc', 'cAccent'], ['selected', 'cSelected'], ['draculared', 'cDanger'],
        ['darkBorderc', 'cBorder'], ['darkbutton', 'cButton'], ['textcolor', 'cText'], ['textcolor2', 'cText2'],
    ] as const
    const TEXT_COLORS = [
        ['FontColorStandard', 'tNormal', false], ['FontColorItalic', 'tItalic', false], ['FontColorBold', 'tBold', false],
        ['FontColorItalicBold', 'tItalicBold', false], ['FontColorQuote1', 'tQuote1', true], ['FontColorQuote2', 'tQuote2', true],
    ] as const

    async function pickBackground() {
        const previous = DBState.db.customBackground ?? ''
        const file = await selectSingleFile(['png', 'webp', 'gif', 'jpg', 'jpeg'])
        if (!file) {
            DBState.db.customBackground = previous
            return
        }
        DBState.db.customBackground = await saveImage(file.data)
    }
</script>

{#snippet schemeCard(name: string)}
    {@const c = schemeColors(name, DBState.db.customColorScheme)}
    {@const on = active === name}
    <button type="button" aria-pressed={on} class="flex min-w-0 flex-col gap-1.5 text-left text-[13px] font-medium" onclick={() => changeColorScheme(name)}>
        <span class="relative flex h-[92px] flex-col gap-1.5 overflow-hidden rounded-[14px] p-2.5" style="background: {c.bgcolor}; border: {on ? '2px solid var(--mc-accent)' : '1px solid var(--mc-line)'};">
            <span class="h-2 w-[60%] rounded-full opacity-70" style="background: {c.textcolor};"></span>
            <span class="h-2 w-[80%] rounded-full opacity-35" style="background: {c.textcolor};"></span>
            <span class="h-[18px] w-[46%] self-end rounded-full" style="background: {c.selected};"></span>
            <span class="absolute bottom-2.5 left-2.5 h-4 w-4 rounded-full" style="background: {c.borderc};"></span>
            {#if on}
                <span class="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white" style="background: var(--mc-accent);"><CheckIcon size={12} strokeWidth={3} /></span>
            {/if}
        </span>
        <span class="truncate">{formatSchemeName(name)}</span>
    </button>
{/snippet}

<div class="flex flex-col gap-4">
    <div class="flex flex-col gap-2">
        <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{t.colorScheme}</span>
        <div class="grid grid-cols-2 gap-3">
            {#each shown as name (name)}{@render schemeCard(name)}{/each}
            {@render schemeCard('custom')}
        </div>
        <button type="button" class="h-9 self-start px-1 text-[14px] font-medium" style="color: var(--mc-accent);" onclick={() => { expanded = !expanded }}>
            {expanded ? t.fewerSchemes : `${t.allSchemes.replace('{}', String(pickableSchemes.length))} ›`}
        </button>
    </div>

    {#if active === 'custom'}
        <FormGroup label={t.customScheme}>
            <FormSegmented label={t.schemeBase} value={DBState.db.customColorScheme.type} options={[{ value: 'dark', label: t.dark }, { value: 'light', label: t.light }]} onchange={(v) => changeColorSchemeType(v as 'light' | 'dark')} />
            {#each SCHEME_COLORS as [key, labelKey] (key)}
                <ColorRow label={t[labelKey]} bind:value={DBState.db.customColorScheme[key]} oninput={updateCustomColorScheme} />
            {/each}
            <div class="grid grid-cols-2">
                <button type="button" class="flex min-h-[52px] items-center justify-center gap-2 text-[15px] font-medium" style="color: var(--mc-accent);" onclick={exportColorScheme}><DownloadIcon size={18} />{t.exportScheme}</button>
                <button type="button" class="flex min-h-[52px] items-center justify-center gap-2 border-l text-[15px] font-medium" style="color: var(--mc-accent); border-color: var(--mc-line);" onclick={importColorScheme}><UploadIcon size={18} />{t.importScheme}</button>
            </div>
        </FormGroup>
    {/if}

    <FormGroup>
        <FormSegmented label={t.textColor} bind:value={DBState.db.textTheme} options={[{ value: 'standard', label: t.textClassic }, { value: 'highcontrast', label: t.textContrast }, { value: 'custom', label: t.textCustom }]} onchange={updateTextThemeAndCSS} />
        {#if DBState.db.textTheme === 'custom'}
            {#each TEXT_COLORS as [key, labelKey, nullable] (key)}
                <ColorRow label={t[labelKey]} {nullable} fallback={key === 'FontColorQuote1' ? '#8BE9FD' : '#FFB86C'} bind:value={DBState.db.customTextTheme[key]} oninput={updateTextThemeAndCSS} />
            {/each}
        {/if}
        <FormSegmented label={t.font} bind:value={DBState.db.font} options={[{ value: 'default', label: t.fontDefault }, { value: 'timesnewroman', label: 'Times' }, { value: 'custom', label: t.fontCustom }]} onchange={updateTextThemeAndCSS} />
        {#if DBState.db.font === 'custom'}
            <FormText label={t.fontName} bind:value={DBState.db.customFont} placeholder="Onest" oninput={updateTextThemeAndCSS} />
        {/if}
    </FormGroup>

    <FormGroup>
        <div class="flex min-h-[52px] items-center">
            <button type="button" class="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 px-4 text-left" onclick={pickBackground}>
                <span class="shrink-0 text-[15px]">{t.background}</span>
                <span class="ml-auto truncate text-[13px] text-(--mc-text2)">{(DBState.db.customBackground ?? '').length > 1 ? t.image : t.none}</span>
            </button>
            {#if (DBState.db.customBackground ?? '').length > 1}
                <button type="button" class="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label={t.removeBackground} onclick={() => { DBState.db.customBackground = '' }}><XIcon size={18} /></button>
            {/if}
        </div>
        <FormToggle label={t.roundIcons} bind:checked={DBState.db.roundIcons} />
    </FormGroup>
</div>
