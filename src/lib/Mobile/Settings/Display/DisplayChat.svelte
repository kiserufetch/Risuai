<script lang="ts">
    import { language } from 'src/lang'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSlider from 'src/lib/MobileChat/Form/FormSlider.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import DisplayPreview from './DisplayPreview.svelte'

    // Mockup "Вид чата": the chat layout as picture cards, a live preview, sizes, then
    // what shows up inside the chat. Desktop-only themes (Mobile Chat, CardBoard) count as the feed.

    const t = $derived(language.mobileDisplay)

    type Layout = 'feed' | 'immersive' | 'html'
    let layout: Layout = $derived(DBState.db.theme === 'waifu' || DBState.db.theme === 'waifuMobile' ? 'immersive' : DBState.db.theme === 'customHTML' ? 'html' : 'feed')

    function pick(next: Layout) {
        if (next === layout) return
        DBState.db.theme = next === 'immersive' ? 'waifu' : next === 'html' ? 'customHTML' : ''
    }

    let cards = $derived([
        { id: 'feed' as const, label: t.feed, hint: t.feedHint },
        { id: 'immersive' as const, label: t.immersive, hint: t.immersiveHint },
        { id: 'html' as const, label: t.html, hint: t.htmlHint },
    ])
</script>

<div class="flex flex-col gap-4">
    <div role="radiogroup" aria-label={t.chat} class="grid grid-cols-3 gap-2">
        {#each cards as card (card.id)}
            {@const on = layout === card.id}
            <button type="button" role="radio" aria-checked={on} class="flex min-w-0 flex-col gap-2 rounded-2xl p-2.5 text-left" style="border: 1.5px solid {on ? 'var(--mc-accent)' : 'var(--mc-line)'}; background: {on ? 'var(--mc-accent-soft)' : 'var(--mc-group)'};" onclick={() => pick(card.id)}>
                <span class="relative h-16 overflow-hidden rounded-[10px]" style="background: color-mix(in oklab, var(--mc-bg) 60%, black);" aria-hidden="true">
                    {#if card.id === 'feed'}
                        <span class="absolute left-2 right-5 top-2.5 h-1.5 rounded-full" style="background: var(--mc-line);"></span>
                        <span class="absolute left-2 right-9 top-5 h-1.5 rounded-full" style="background: var(--mc-line);"></span>
                        <span class="absolute bottom-2.5 right-2 h-3 w-[40%] rounded-full" style="background: var(--mc-bubble);"></span>
                    {:else if card.id === 'immersive'}
                        <span class="absolute inset-0" style="background: linear-gradient(160deg, #3b3160, #1d2336);"></span>
                        <span class="absolute inset-x-0 bottom-0 h-[40%]" style="background: color-mix(in oklab, var(--mc-bg) 85%, transparent);"></span>
                    {:else}
                        <span class="absolute inset-2 flex items-center justify-center rounded-md border-[1.5px] border-dashed font-mono text-[11px] font-semibold text-(--mc-text2)" style="border-color: var(--mc-line);">&lt;/&gt;</span>
                    {/if}
                </span>
                <span class="truncate text-[14px] font-semibold">{card.label}</span>
                <span class="text-[11px] leading-[14px] text-(--mc-text2)">{card.hint}</span>
            </button>
        {/each}
    </div>

    {#if layout === 'html'}
        <CodeField label={t.htmlTemplate} bind:value={DBState.db.guiHTML} placeholder={'<div>{{slot}}</div>'} minRows={6} wrap />
    {/if}

    <DisplayPreview />

    <FormGroup>
        <FormSlider label={t.textSize} bind:value={DBState.db.zoomsize} min={50} max={200} format={(v) => `${v}%`} />
        <FormSlider label={t.lineHeight} bind:value={DBState.db.lineHeight} min={0.5} max={3} step={0.05} fixed={2} />
        <FormSlider label={t.avatarSize} bind:value={DBState.db.iconsize} min={50} max={200} format={(v) => `${v}%`} />
        <FormSlider label={t.cardZoom} bind:value={DBState.db.mobileContentZoom} min={50} max={100} step={5} format={(v) => `${v}%`} />
    </FormGroup>

    <FormGroup label={t.inChat}>
        <FormToggle label={t.greetingPages} bind:checked={DBState.db.showFirstMessagePages} />
        <FormToggle label={t.assetsPreview} bind:checked={DBState.db.useAdditionalAssetsPreview} />
        <FormSlider label={t.assetWidth} bind:value={DBState.db.assetWidth} min={-1} max={40} format={(v) => (v === -1 ? t.unlimited : v === 0 ? t.hidden : `${v} rem`)} />
        {#if DBState.db.showUnrecommended}
            <FormToggle label={t.stickers} bind:checked={DBState.db.useChatSticker} />
        {/if}
        <FormToggle label={t.memoryLimit} bind:checked={DBState.db.showMemoryLimit} />
        {#if DBState.db.showMemoryLimit}
            <FormSlider label={t.memoryThickness} bind:value={DBState.db.memoryLimitThickness} min={1} max={500} format={(v) => `${v}px`} />
        {/if}
    </FormGroup>
</div>
