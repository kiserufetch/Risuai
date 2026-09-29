<script lang="ts">
    import { BellIcon, BrushIcon, ChevronRightIcon, LayoutPanelLeftIcon, MessageCircleIcon, PaletteIcon, TypeIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState } from 'src/ts/stores.svelte'
    import DisplayPreview from './DisplayPreview.svelte'
    import { displayPage, type DisplayPage } from './displayPage.svelte'
    import { formatSchemeName } from './schemes'

    // Section root (mockup "Экран и звук · главная"): live preview, then sub-pages with summaries.

    const t = $derived(language.mobileDisplay)

    let chatSummary = $derived.by(() => {
        const theme = DBState.db.theme
        const layout = theme === 'waifu' || theme === 'waifuMobile' ? t.immersive : theme === 'customHTML' ? t.html : t.feed
        return `${layout} · ${DBState.db.zoomsize ?? 100}%`
    })
    let fontName = $derived(DBState.db.font === 'timesnewroman' ? 'Times' : DBState.db.font === 'custom' ? (DBState.db.customFont || t.fontCustom) : t.fontDefault)

    type Row = { page: DisplayPage; icon: typeof PaletteIcon; color: string; label: string; value: string }
    let groups: Row[][] = $derived([
        [
            { page: 'look', icon: PaletteIcon, color: '#6366f1', label: t.look, value: `${formatSchemeName(DBState.db.colorSchemeName ?? 'default')} · ${fontName}` },
            { page: 'chat', icon: MessageCircleIcon, color: '#22c55e', label: t.chat, value: chatSummary },
            { page: 'text', icon: TypeIcon, color: '#f59e0b', label: t.text, value: t.textSummary },
        ],
        [
            { page: 'sound', icon: BellIcon, color: '#ef4444', label: t.sound, value: DBState.db.playMessage ? t.soundOn : t.soundOff },
            { page: 'interface', icon: LayoutPanelLeftIcon, color: '#0ea5e9', label: t.interface, value: t.interfaceSummary },
        ],
    ])
    let cssLines = $derived((DBState.db.customCSS ?? '').trim() ? t.lines.replace('{}', String(DBState.db.customCSS.split('\n').length)) : t.empty)
</script>

{#snippet row(r: Row)}
    {@const Icon = r.icon}
    <button type="button" class="flex min-h-14 w-full items-center gap-3 px-4 text-left" onclick={() => { displayPage.current = r.page }}>
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white" style="background: {r.color};"><Icon size={18} /></span>
        <span class="shrink-0 text-[15px]">{r.label}</span>
        <span class="ml-auto min-w-0 truncate text-right text-[13px] text-(--mc-text2)">{r.value}</span>
        <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
    </button>
{/snippet}

<div class="flex flex-col gap-4">
    <DisplayPreview />
    {#each groups as group, i (i)}
        <div class="risu-mc-display-group overflow-hidden rounded-2xl" style="background: var(--mc-group);">
            {#each group as r (r.page)}{@render row(r)}{/each}
        </div>
    {/each}
    <div class="flex flex-col gap-2">
        <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{t.advanced}</span>
        <div class="risu-mc-display-group overflow-hidden rounded-2xl" style="background: var(--mc-group);">
            {@render row({ page: 'css', icon: BrushIcon, color: '#64748b', label: t.css, value: cssLines })}
        </div>
    </div>
</div>

<style>
    .risu-mc-display-group > :global(* + *) {
        position: relative;
    }
    .risu-mc-display-group > :global(* + *)::before {
        content: '';
        position: absolute;
        top: 0;
        left: 60px;
        right: 0;
        border-top: 1px solid var(--mc-line);
    }
</style>
