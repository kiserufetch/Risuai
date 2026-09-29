<script lang="ts">
    import { CheckIcon, CopyIcon, EllipsisIcon, FileImageIcon, GripVerticalIcon, PencilIcon, PlusIcon, Share2Icon, Trash2Icon, UserIcon, ChevronRightIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import Sheet from 'src/lib/MobileChat/Sheet.svelte'
    import SheetGroup from 'src/lib/MobileChat/SheetGroup.svelte'
    import SheetRow from 'src/lib/MobileChat/SheetRow.svelte'
    import { changeUserPersona, importUserPersona } from 'src/ts/persona'
    import { DBState } from 'src/ts/stores.svelte'
    import { tokenizeAccurate } from 'src/ts/tokenizer'
    import PersonaAvatar from './PersonaAvatar.svelte'
    import { boundChats, createPersona, duplicatePersona, exportPersona, getField, movePersona, openPersona, removePersona } from './personas.svelte'

    // Mockup "Персоны · список": the active persona up top, every persona as a row with
    // description, tokens and bound chats; grip to reorder, ⋯ for actions.

    const t = $derived(language.mobilePersona)

    let actionsFor: number | null = $state(null)
    let creating = $state(false)

    let tokens: number[] = $state([])
    $effect(() => {
        const prompts = DBState.db.personas.map((_, i) => getField(i, 'personaPrompt'))
        Promise.all(prompts.map((p) => tokenizeAccurate(p, true))).then((n) => { tokens = n })
    })

    function meta(i: number): string {
        const parts = [t.tokens.replace('{}', String(tokens[i] ?? 0))]
        const chats = boundChats(i)
        if (chats) parts.push(t.chats.replace('{}', String(chats)))
        return parts.join(' · ')
    }

    // Drag to reorder by the grip, as in the prompt template list.
    let listEl: HTMLElement | null = $state(null)
    let drag: { from: number; to: number; startY: number; dy: number; centers: number[]; height: number } | null = $state(null)
    function dragStart(e: PointerEvent, i: number) {
        if (!listEl) return
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        const rects = (Array.from(listEl.children) as HTMLElement[]).map((r) => r.getBoundingClientRect())
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
        movePersona(from, to)
    }
    function shift(i: number): number {
        if (!drag || i === drag.from) return drag?.dy ?? 0
        if (drag.from < drag.to && i > drag.from && i <= drag.to) return -drag.height
        if (drag.from > drag.to && i < drag.from && i >= drag.to) return drag.height
        return 0
    }

    async function act(fn: () => unknown) {
        actionsFor = null
        await fn()
    }
</script>

<div class="flex flex-col gap-4">
    <button type="button" class="flex items-center gap-3.5 rounded-[20px] border p-4 text-left" style="border-color: color-mix(in oklab, var(--mc-accent) 35%, var(--mc-line)); background: linear-gradient(135deg, color-mix(in oklab, var(--mc-accent) 22%, transparent), color-mix(in oklab, var(--mc-accent) 5%, transparent));" onclick={() => openPersona(DBState.db.selectedPersona)}>
        <PersonaAvatar icon={DBState.db.userIcon} size={72} radius={20} />
        <span class="flex min-w-0 flex-1 flex-col gap-1">
            <span class="text-[12px] font-semibold uppercase" style="color: var(--mc-accent);">{t.writingAs}</span>
            <span class="truncate text-[20px] font-bold">{DBState.db.username || 'User'}</span>
            <span class="text-[12px] text-(--mc-text2)">{t.writingAsHint}</span>
        </span>
    </button>

    <div bind:this={listEl} class="risu-mc-personas flex flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {#each DBState.db.personas as _, i (i)}
            {@const active = i === DBState.db.selectedPersona}
            {@const prompt = getField(i, 'personaPrompt')}
            <div class="relative flex min-h-[72px] items-center pr-1" style="transform: translateY({shift(i)}px); transition: {drag && i !== drag.from ? 'transform 150ms' : 'none'}; z-index: {drag?.from === i ? 2 : 1}; background: {active ? 'color-mix(in oklab, var(--mc-accent) 8%, var(--mc-group))' : 'var(--mc-group)'}; {drag?.from === i ? 'box-shadow: 0 8px 24px rgb(0 0 0 / 0.4);' : ''}">
                <button type="button" class="flex h-[72px] w-9 shrink-0 touch-none items-center justify-center text-(--mc-text2) opacity-60" aria-label={language.mobileBot.dragBlock} onpointerdown={(e) => dragStart(e, i)} onpointermove={dragMove} onpointerup={dragEnd} onpointercancel={dragEnd}><GripVerticalIcon size={18} /></button>
                <button type="button" class="flex min-h-[72px] min-w-0 flex-1 items-center gap-3 py-2 text-left" onclick={() => openPersona(i)}>
                    <PersonaAvatar icon={getField(i, 'icon')} />
                    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span class="flex items-center gap-1.5 text-[15px] font-semibold">
                            <span class="truncate">{getField(i, 'name') || 'User'}</span>
                            {#if active}<span class="shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style="background: var(--mc-accent-soft); color: var(--mc-accent);">{t.active}</span>{/if}
                        </span>
                        <span class="truncate text-[12px] text-(--mc-text2)">{prompt.trim() || t.noDescription}</span>
                        <span class="text-[11px] text-(--mc-text2) opacity-80">{meta(i)}</span>
                    </span>
                </button>
                <button type="button" class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label={language.mobileBot.actions} onclick={() => { actionsFor = i }}><EllipsisIcon size={20} /></button>
            </div>
        {/each}
    </div>

    <button type="button" class="flex h-12 items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed text-[15px] font-semibold" style="border-color: var(--mc-line); color: var(--mc-accent);" onclick={() => { creating = true }}><PlusIcon size={18} />{t.newPersona}</button>
    <span class="text-center text-[12px] text-(--mc-text2)">{t.listHint}</span>
</div>

<Sheet open={actionsFor !== null} label={language.mobileBot.actions} onclose={() => { actionsFor = null }}>
    {#if actionsFor !== null && DBState.db.personas[actionsFor]}
        {@const i = actionsFor}
        <div class="flex shrink-0 items-center gap-3 px-1 pb-1">
            <PersonaAvatar icon={getField(i, 'icon')} />
            <span class="flex min-w-0 flex-col gap-0.5"><span class="truncate text-[16px] font-semibold">{getField(i, 'name') || 'User'}</span><span class="text-[12px] text-(--mc-text2)">{meta(i)}</span></span>
        </div>
        <SheetGroup>
            {#if i !== DBState.db.selectedPersona}
                <SheetRow label={t.makeActive} onclick={() => act(() => changeUserPersona(i))}><CheckIcon size={20} /></SheetRow>
            {/if}
            <SheetRow label={t.edit} onclick={() => act(() => openPersona(i))}><PencilIcon size={20} /></SheetRow>
            <SheetRow label={t.duplicate} onclick={() => act(() => duplicatePersona(i))}><CopyIcon size={20} /></SheetRow>
            <SheetRow label={t.exportPng} onclick={() => act(() => exportPersona(i))}><Share2Icon size={20} /></SheetRow>
        </SheetGroup>
        <SheetGroup>
            <SheetRow label={language.mobileBot.remove} danger onclick={() => act(() => removePersona(i))}><Trash2Icon size={20} /></SheetRow>
        </SheetGroup>
    {/if}
</Sheet>

<Sheet open={creating} label={t.newPersona} onclose={() => { creating = false }}>
    <span class="shrink-0 px-1 text-[18px] font-bold">{t.newPersona}</span>
    <div class="risu-mc-personas flex shrink-0 flex-col overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {#each [{ icon: UserIcon, color: 'var(--mc-accent)', title: t.fromScratch, hint: t.fromScratchHint, run: createPersona }, { icon: FileImageIcon, color: '#0ea5e9', title: t.fromPng, hint: t.fromPngHint, run: importUserPersona }] as option (option.title)}
            {@const Icon = option.icon}
            <button type="button" class="flex min-h-[72px] w-full items-center gap-3 px-4 text-left" onclick={() => { creating = false; option.run() }}>
                <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-white" style="background: {option.color};"><Icon size={22} /></span>
                <span class="flex min-w-0 flex-1 flex-col gap-0.5"><span class="text-[15px] font-semibold">{option.title}</span><span class="text-[12px] text-(--mc-text2)">{option.hint}</span></span>
                <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
            </button>
        {/each}
    </div>
</Sheet>

<style>
    .risu-mc-personas > :global(* + *) {
        border-top: 1px solid var(--mc-line);
    }
</style>
