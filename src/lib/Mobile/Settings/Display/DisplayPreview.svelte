<script lang="ts">
    import { language } from 'src/lang'
    import { ColorSchemeTypeStore } from 'src/ts/gui/colorscheme'
    import { DBState } from 'src/ts/stores.svelte'
    import { getCustomBackground } from 'src/ts/util'

    // Live sample of a chat: the same text classes as MessageBody, so scheme, text color,
    // font, size, line spacing, quote styling and the custom background show as in chat.

    let background = $state('')

    $effect(() => {
        const source = DBState.db.customBackground ?? ''
        getCustomBackground(source).then((css) => {
            if ((DBState.db.customBackground ?? '') === source) background = css
        })
    })

    let zoom = $derived((DBState.db.zoomsize ?? 100) / 100)
    let quotes = $derived(DBState.db.customQuotes ? (DBState.db.customQuotesData ?? ['“', '”', '‘', '’']) : ['“', '”', '‘', '’'])
    let quoted = $derived(`${quotes[0]}${language.mobileDisplay.previewQuote}${quotes[1]}`)
    let quoteHtml = $derived.by(() => {
        if (DBState.db.unformatQuotes) return quoted
        if (DBState.db.blockquoteStyling) return `<br><br><mark risu-mark="blockquote2">${quoted}</mark>`
        return `<mark risu-mark="quote2">${quoted}</mark>`
    })
    let avatar = $derived(Math.round(24 * (DBState.db.iconsize ?? 100) / 100))
    let panel = $derived(DBState.db.textScreenColor ? `background: ${DBState.db.textScreenColor}cc;` : '')
</script>

<div aria-label={language.mobileDisplay.preview} class="flex flex-col gap-2.5 overflow-hidden rounded-[20px] border p-3.5" style="border-color: var(--mc-line); background-color: color-mix(in oklab, var(--mc-bg) 70%, black); {background}">
    <div class="flex flex-col gap-2 p-1" class:rounded-xl={DBState.db.textScreenRounded} style="{panel} {DBState.db.textScreenBorder ? `border: 1px solid ${DBState.db.textScreenBorder};` : ''}">
        <span class="flex items-center gap-2 text-[13px] font-semibold">
            <span class="shrink-0" class:rounded-full={DBState.db.roundIcons} class:rounded-md={!DBState.db.roundIcons} style="width: {avatar}px; height: {avatar}px; background: linear-gradient(135deg, #2b3a55, #5b4a7a);"></span>
            {language.mobileDisplay.previewName}
        </span>
        <span class="chattext prose risu-mc-text" class:prose-invert={$ColorSchemeTypeStore === 'dark'} style:font-size="{zoom}rem" style:line-height="{(DBState.db.lineHeight ?? 1.25) * zoom}rem">
            <p><em>{language.mobileDisplay.previewAction}</em> {@html quoteHtml}</p>
        </span>
    </div>
    <span class="chattext prose risu-mc-text max-w-[75%] self-end rounded-[16px_16px_5px_16px] px-3 py-2" class:prose-invert={$ColorSchemeTypeStore === 'dark'} style="background: var(--mc-bubble, var(--mc-surface));" style:font-size="{zoom}rem" style:line-height="{(DBState.db.lineHeight ?? 1.25) * zoom}rem">
        <p>{language.mobileDisplay.previewReply}</p>
    </span>
</div>
