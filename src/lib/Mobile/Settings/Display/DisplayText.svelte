<script lang="ts">
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import ColorRow from './ColorRow.svelte'
    import DisplayPreview from './DisplayPreview.svelte'

    // Mockup "Текст сообщений": quote formatting with a live preview, custom quote
    // characters, and the text backdrop used over portraits and custom backgrounds.

    const t = $derived(language.mobileDisplay)

    let quoteFields = $derived([t.openDouble, t.closeDouble, t.openSingle, t.closeSingle])

    function setQuote(i: number, value: string) {
        DBState.db.customQuotesData ??= ['"', '"', "'", "'"]
        DBState.db.customQuotesData[i] = value
    }
</script>

<div class="flex flex-col gap-4">
    <DisplayPreview />

    <FormGroup label={t.quotesGroup}>
        <FormToggle label={t.highlightQuotes} hint={t.highlightQuotesHint} checked={!DBState.db.unformatQuotes} onchange={(v) => { DBState.db.unformatQuotes = !v }} />
        {#if !DBState.db.unformatQuotes}
            <FormToggle label={t.blockquote} hint={t.blockquoteHint} bind:checked={DBState.db.blockquoteStyling} />
        {/if}
        <FormToggle label={t.customQuotes} bind:checked={DBState.db.customQuotes} />
    </FormGroup>

    {#if DBState.db.customQuotes}
        <div class="grid grid-cols-2 gap-2">
            {#each quoteFields as label, i (i)}
                <label class="flex min-w-0 flex-col gap-1 rounded-xl px-3 py-2.5" style="background: var(--mc-group);">
                    <span class="truncate text-[11px] text-(--mc-text2)">{label}</span>
                    <input value={DBState.db.customQuotesData?.[i] ?? ''} oninput={(e) => setQuote(i, (e.currentTarget as HTMLInputElement).value)} autocomplete="off" autocapitalize="off" spellcheck="false" class="w-full min-w-0 border-0 bg-transparent text-[18px] font-medium outline-none" style="color: var(--mc-text);" />
                </label>
            {/each}
        </div>
    {/if}

    <FormGroup label={t.panelGroup}>
        <ColorRow label={t.panelColor} nullable bind:value={DBState.db.textScreenColor} />
        <ColorRow label={t.panelBorder} nullable bind:value={DBState.db.textScreenBorder} />
        <FormToggle label={t.letterOutline} bind:checked={DBState.db.textBorder} />
        <FormToggle label={t.rounded} bind:checked={DBState.db.textScreenRounded} />
    </FormGroup>
</div>
