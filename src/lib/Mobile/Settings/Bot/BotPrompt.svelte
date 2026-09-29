<script lang="ts">
    import { ArrowDownIcon, ArrowUpIcon, ChevronRightIcon, GripVerticalIcon, PlusIcon, TriangleAlertIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSegmented from 'src/lib/MobileChat/Form/FormSegmented.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { alertConfirm } from 'src/ts/alert'
    import { tokenizePreset } from 'src/ts/process/prompt'
    import { templateCheck } from 'src/ts/process/templates/templateCheck'
    import { DBState } from 'src/ts/stores.svelte'
    import { tokenizeAccurate } from 'src/ts/tokenizer'
    import { botPage } from './botPage.svelte'
    import { promptItemMeta, promptItemName, promptTypeColor, promptTypeLabel } from './promptTypes'

    // Mockup "Промпт · шаблон": simple prompts or the prompt template. Template blocks are
    // reordered by dragging the grip; tapping a block opens its editor page.

    const t = $derived(language.mobileBot)

    let template = $derived(DBState.db.promptTemplate)
    let mode = $derived(template ? 'template' : 'simple')

    async function setMode(next: string | number) {
        if (next === 'template') {
            DBState.db.promptTemplate = []
        } else if (await alertConfirm(t.dropTemplateConfirm)) {
            DBState.db.promptTemplate = null
        }
    }

    // Token counts, recomputed when the prompts change.
    let fixedTokens = $state(0)
    let simpleTokens = $state({ main: 0, jailbreak: 0, note: 0 })
    $effect(() => {
        const list = $state.snapshot(DBState.db.promptTemplate)
        if (list) tokenizePreset(list, true).then((n) => { fixedTokens = n })
    })
    $effect(() => {
        if (template) return
        const [main, jailbreak, note] = [DBState.db.mainPrompt, DBState.db.jailbreak, DBState.db.globalNote]
        Promise.all([tokenizeAccurate(main, true), tokenizeAccurate(jailbreak, true), tokenizeAccurate(note, true)]).then(([a, b, c]) => {
            simpleTokens = { main: a, jailbreak: b, note: c }
        })
    })
    let warnings = $derived(template ? templateCheck(DBState.db) : [])

    function openItem(i: number) {
        botPage.promptIndex = i
        botPage.current = 'promptItem'
    }

    function addBlock() {
        DBState.db.promptTemplate.push({ type: 'plain', text: '', role: 'system', type2: 'normal' })
        openItem(DBState.db.promptTemplate.length - 1)
    }

    // Drag to reorder: the grip captures the pointer, the row follows it and the rows it
    // passes slide out of the way; the move is applied on release.
    let listEl: HTMLElement | null = $state(null)
    let drag: { from: number; to: number; startY: number; dy: number; centers: number[]; height: number } | null = $state(null)

    function dragStart(e: PointerEvent, i: number) {
        if (!listEl) return
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        const rows = Array.from(listEl.children) as HTMLElement[]
        const rects = rows.map((r) => r.getBoundingClientRect())
        drag = { from: i, to: i, startY: e.clientY, dy: 0, centers: rects.map((r) => r.top + r.height / 2), height: rects[i].height }
    }

    function dragMove(e: PointerEvent) {
        if (!drag) return
        drag.dy = e.clientY - drag.startY
        const center = drag.centers[drag.from] + drag.dy
        let to = drag.from
        while (to < drag.centers.length - 1 && center > drag.centers[to + 1]) to++
        while (to > 0 && center < drag.centers[to - 1]) to--
        drag.to = to
    }

    function dragEnd() {
        if (!drag) return
        const { from, to } = drag
        drag = null
        if (from === to) return
        const list = DBState.db.promptTemplate
        const [moved] = list.splice(from, 1)
        list.splice(to, 0, moved)
    }

    function shift(i: number): number {
        if (!drag || i === drag.from) return drag?.dy ?? 0
        if (drag.from < drag.to && i > drag.from && i <= drag.to) return -drag.height
        if (drag.from > drag.to && i < drag.from && i >= drag.to) return drag.height
        return 0
    }

    function moveOrder(i: number, delta: number) {
        const order = DBState.db.formatingOrder
        const j = i + delta
        if (j < 0 || j >= order.length) return
        ;[order[i], order[j]] = [order[j], order[i]]
    }
</script>

<div class="flex flex-col gap-4">
    <div class="-mx-4 -my-3">
        <FormSegmented label={t.promptMode} value={mode} options={[{ value: 'simple', label: t.modeSimple }, { value: 'template', label: t.modeTemplate }]} onchange={setMode} />
    </div>

    {#if template}
        <div class="grid grid-cols-2 gap-2">
            <span class="flex flex-col gap-0.5 rounded-2xl px-3 py-2.5" style="background: var(--mc-group);"><span class="text-[18px] font-bold tabular-nums">{fixedTokens.toLocaleString()}</span><span class="text-[12px] text-(--mc-text2)">{language.fixedTokens}</span></span>
            <span class="flex flex-col gap-0.5 rounded-2xl px-3 py-2.5" style="background: var(--mc-group);"><span class="text-[18px] font-bold tabular-nums">{template.length}</span><span class="text-[12px] text-(--mc-text2)">{t.blocks}</span></span>
        </div>

        {#each warnings as warning, i (i)}
            <div class="flex gap-2.5 rounded-2xl border px-3 py-2.5 text-[13px] leading-[18px]" style="background: rgb(245 158 11 / 0.1); border-color: rgb(245 158 11 / 0.3); color: #f5d08a;">
                <TriangleAlertIcon size={18} class="shrink-0" />{warning}
            </div>
        {/each}

        {#if template.length > 0}
            <div bind:this={listEl} class="risu-mc-prompt-list flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {#each template as item, i (i)}
                    {@const color = promptTypeColor(item.type)}
                    {@const meta = promptItemMeta(item)}
                    <div class="relative flex min-h-[60px] items-center" style="transform: translateY({shift(i)}px); transition: {drag && i !== drag.from ? 'transform 150ms' : 'none'}; z-index: {drag?.from === i ? 2 : 1}; background: var(--mc-group); {drag?.from === i ? 'box-shadow: 0 8px 24px rgb(0 0 0 / 0.4);' : ''}">
                        <button type="button" class="flex h-[60px] w-10 shrink-0 touch-none items-center justify-center text-(--mc-text2) opacity-60" aria-label={t.dragBlock} onpointerdown={(e) => dragStart(e, i)} onpointermove={dragMove} onpointerup={dragEnd} onpointercancel={dragEnd}>
                            <GripVerticalIcon size={18} />
                        </button>
                        <button type="button" class="flex min-h-[60px] min-w-0 flex-1 items-center gap-2.5 pr-4 text-left" onclick={() => openItem(i)}>
                            <span class="h-8 w-1 shrink-0 rounded-full" style="background: {color};"></span>
                            <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span class="truncate text-[15px] font-semibold">{promptItemName(item)}</span>
                                <span class="truncate text-[12px] text-(--mc-text2)"><span class="font-semibold" style="color: {color};">{promptTypeLabel(item.type)}</span>{meta ? ` · ${meta}` : ''}</span>
                            </span>
                            <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
                        </button>
                    </div>
                {/each}
            </div>
        {:else}
            <span class="py-6 text-center text-[15px] text-(--mc-text2)">{t.noBlocks}</span>
        {/if}

        <div class="grid grid-cols-2 gap-2">
            <button type="button" class="flex h-[46px] items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed text-[15px] font-semibold" style="border-color: var(--mc-line); color: var(--mc-accent);" onclick={addBlock}><PlusIcon size={18} />{t.addBlock}</button>
            <button type="button" class="h-[46px] truncate rounded-[14px] px-2 text-[15px] font-semibold" style="background: var(--mc-line);" onclick={() => { botPage.current = 'promptSettings' }}>{t.page_promptSettings}</button>
        </div>
    {:else}
        <CodeField label="{language.mainPrompt} · {t.tokensCount.replace('{}', String(simpleTokens.main))}" bind:value={DBState.db.mainPrompt} minRows={6} wrap />
        <CodeField label="{language.jailbreakPrompt} · {t.tokensCount.replace('{}', String(simpleTokens.jailbreak))}" bind:value={DBState.db.jailbreak} minRows={4} wrap />
        <CodeField label="{language.globalNote} · {t.tokensCount.replace('{}', String(simpleTokens.note))}" bind:value={DBState.db.globalNote} minRows={3} wrap />
        <FormGroup label={language.formatingOrder}>
            {#each DBState.db.formatingOrder as key, i (key)}
                <div class="flex min-h-[48px] items-center gap-1 pl-4 pr-1.5">
                    <span class="flex-1 text-[15px]">{language.formating[key as keyof typeof language.formating] ?? key}</span>
                    <button type="button" class="flex h-10 w-10 items-center justify-center rounded-full text-(--mc-text2) disabled:opacity-30" aria-label={t.moveUp} disabled={i === 0} onclick={() => moveOrder(i, -1)}><ArrowUpIcon size={18} /></button>
                    <button type="button" class="flex h-10 w-10 items-center justify-center rounded-full text-(--mc-text2) disabled:opacity-30" aria-label={t.moveDown} disabled={i === DBState.db.formatingOrder.length - 1} onclick={() => moveOrder(i, 1)}><ArrowDownIcon size={18} /></button>
                </div>
            {/each}
        </FormGroup>
        <FormGroup>
            <FormToggle label={language.promptPreprocess} bind:checked={DBState.db.promptPreprocess} />
        </FormGroup>
    {/if}
</div>

<style>
    .risu-mc-prompt-list > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
