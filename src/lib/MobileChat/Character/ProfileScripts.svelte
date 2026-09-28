<script lang="ts">
    import { ArrowDownIcon, ArrowUpIcon, BookOpenIcon, CopyIcon, DownloadIcon, EllipsisIcon, ExternalLinkIcon, PlusIcon, SearchIcon, Trash2Icon, UploadIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertConfirm } from 'src/ts/alert'
    import { hubURL } from 'src/ts/characterCards'
    import { openURL } from 'src/ts/globalApi.svelte'
    import { exportRegex, importRegex } from 'src/ts/process/scripts'
    import type { character, customscript, triggerscript } from 'src/ts/storage/database.svelte'
    import { DBState, ReloadGUIPointer } from 'src/ts/stores.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'
    import TriggerV2List from '../../SideBars/Scripts/TriggerV2List.svelte'
    import Sheet from '../Sheet.svelte'
    import SheetRow from '../SheetRow.svelte'
    import SheetGroup from '../SheetGroup.svelte'
    import CodeField from './CodeField.svelte'

    // Scripts page of the profile (mockups "Скрипты"): regex list, trigger type with a
    // Lua editor, background HTML and Char JS. The V2 visual trigger editor is the
    // existing TriggerV2List inside the new frame.

    let { onopen }: { onopen: (script: customscript) => void } = $props()

    let tab: 'regex' | 'triggers' | 'background' = $state('regex')
    let query = $state('')
    let moreOpen = $state(false)
    let actionsFor: customscript | null = $state(null)

    let char = $derived(session.getCharacter() as character | undefined)
    let scripts = $derived(char?.customscript ?? [])
    let visible = $derived(scripts.filter((s) => {
        const q = query.trim().toLocaleLowerCase()
        return !q || [s.comment, s.in, s.out].some((v) => (v ?? '').toLocaleLowerCase().includes(q))
    }))

    const TYPE_COLORS: Record<string, string> = {
        editinput: '#3b82f6', editoutput: '#22c55e', editprocess: '#a855f7', editdisplay: '#f59e0b', edittrans: '#ec4899', disabled: '#6b7280',
    }

    function typeLabel(type: string): string {
        const labels: Record<string, string> = {
            editinput: language.mobileScripts.typeInput, editoutput: language.mobileScripts.typeOutput, editprocess: language.mobileScripts.typeProcess,
            editdisplay: language.mobileScripts.typeDisplay, edittrans: language.mobileScripts.typeTrans, disabled: language.mobileScripts.typeDisabled,
        }
        return labels[type] ?? type
    }

    function addScript() {
        if (!char) {
            return
        }
        const script: customscript = { comment: '', in: '', out: '', type: 'editinput' }
        char.customscript.push(script)
        char.customscript = char.customscript
        onopen(char.customscript[char.customscript.length - 1])
    }

    function move(script: customscript, delta: number) {
        actionsFor = null
        if (!char) {
            return
        }
        const list = char.customscript
        const from = list.indexOf(script)
        const to = from + delta
        if (from === -1 || to < 0 || to >= list.length) {
            return
        }
        const [item] = list.splice(from, 1)
        list.splice(to, 0, item)
        char.customscript = list
        ReloadGUIPointer.update((v) => v + 1)
    }

    function duplicate(script: customscript) {
        actionsFor = null
        if (!char) {
            return
        }
        const copy = $state.snapshot(script) as customscript
        copy.comment = `${script.comment || language.mobileScripts.unnamed} ${language.mobileScripts.copySuffix}`
        char.customscript.splice(char.customscript.indexOf(script) + 1, 0, copy)
        char.customscript = char.customscript
    }

    async function remove(script: customscript) {
        actionsFor = null
        if (!char || !(await alertConfirm(language.removeConfirm + (script.comment || language.mobileScripts.unnamed)))) {
            return
        }
        char.customscript = char.customscript.filter((s) => s !== script)
        ReloadGUIPointer.update((v) => v + 1)
    }

    // --- Triggers (TriggerList.svelte) --------------------------------------------

    let triggers = $derived((char?.triggerscript ?? []) as triggerscript[])
    let triggerKind = $derived.by(() => {
        const type = triggers?.[0]?.effect?.[0]?.type
        return type === 'triggerlua' ? 'lua' : type === 'v2Header' ? 'v2' : type === 'triggercode' ? 'code' : 'v1'
    })
    let showV1 = $derived(triggerKind === 'v1' && triggers.length > 0 || !!DBState.db.showDeprecatedTriggerV1)
    const loadTriggerV1List = () => import('../../SideBars/Scripts/TriggerV1List.svelte').then((m) => m.default)

    async function switchTriggers(kind: 'v1' | 'v2' | 'lua') {
        if (!char || kind === triggerKind) {
            return
        }
        if (triggers.length > 0 && !(await alertConfirm(language.triggerSwitchWarn))) {
            return
        }
        if (kind === 'v1') {
            char.triggerscript = []
        } else if (kind === 'v2') {
            char.triggerscript = [
                { comment: '', type: 'manual', conditions: [], effect: [{ type: 'v2Header', code: '', indent: 0 } as never] },
                { comment: 'New Event', type: 'manual', conditions: [], effect: [] },
            ]
        } else {
            char.triggerscript = [{ comment: '', type: 'start', conditions: [], effect: [{ type: 'triggerlua', code: '' } as never] }]
        }
    }
</script>

<div class="sticky top-0 z-10 -mx-4 mb-3 px-4 pb-1 pt-1" style="background: var(--mc-bg);">
    <div role="tablist" aria-label={language.mobileProfile.scripts} class="grid grid-cols-3 gap-1 rounded-[14px] p-1" style="background: var(--mc-surface);">
        {#each [['regex', language.mobileScripts.tabRegex], ['triggers', language.mobileScripts.tabTriggers], ['background', language.mobileScripts.tabBackground]] as [key, label] (key)}
            <button type="button" role="tab" aria-selected={tab === key} class="h-9 rounded-[10px] text-[14px] font-semibold" style={tab === key ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => { tab = key as typeof tab }}>{label}</button>
        {/each}
    </div>
</div>

{#if !char}
    <!-- groups have no scripts -->
{:else if tab === 'regex'}
    <div class="flex flex-col gap-3">
        <div class="flex gap-2">
            <label class="flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-full px-3.5" style="background: var(--mc-group);">
                <SearchIcon size={17} class="shrink-0 text-(--mc-text2)" />
                <input type="search" bind:value={query} placeholder={language.mobileScripts.search} aria-label={language.mobileScripts.search} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
            </label>
            <button type="button" class="flex h-[42px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={addScript}>
                <PlusIcon size={18} strokeWidth={2.4} />{language.mobileScripts.addScript}
            </button>
            <button type="button" class="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-(--mc-text2)" style="background: var(--mc-group);" aria-label={language.mobileScripts.listActions} onclick={() => { moreOpen = true }}><EllipsisIcon size={19} /></button>
        </div>
        {#if visible.length === 0}
            <span class="py-10 text-center text-[15px] text-(--mc-text2)">{query ? language.mobileDialogs.nothingFound : language.mobileScripts.empty}</span>
        {:else}
            <ul class="risu-mc-script-list overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {#each visible as script (script)}
                    {@const color = TYPE_COLORS[script.type] ?? TYPE_COLORS.disabled}
                    <li class="flex min-h-16 items-center gap-2.5 py-1.5 pl-3.5 pr-1.5">
                        <button type="button" class="flex min-w-0 flex-1 flex-col gap-1 text-left" onclick={() => onopen(script)}>
                            <span class="flex min-w-0 items-center gap-2">
                                <span class="truncate text-[15px] font-semibold" class:opacity-60={script.type === 'disabled'}>{script.comment || language.mobileScripts.unnamed}</span>
                                <span class="shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-semibold" style="background: color-mix(in oklab, {color} 18%, transparent); color: {color};">{typeLabel(script.type)}</span>
                            </span>
                            <span class="truncate font-mono text-[12px] text-(--mc-text2)">{script.in || '—'}</span>
                        </button>
                        <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label={language.mobileScripts.scriptActions.replace('{}', script.comment || language.mobileScripts.unnamed)} onclick={() => { actionsFor = script }}><EllipsisIcon size={18} /></button>
                    </li>
                {/each}
            </ul>
            <span class="px-2 text-[13px] text-(--mc-text2)">{language.mobileScripts.orderHint}</span>
        {/if}
    </div>
{:else if tab === 'triggers'}
    <div class="flex flex-col gap-3">
        <div role="radiogroup" aria-label={language.mobileScripts.triggerType} class="grid gap-1 rounded-[14px] p-1" style="background: var(--mc-surface); grid-template-columns: repeat({showV1 ? 3 : 2}, minmax(0, 1fr));">
            {#if showV1}
                <button type="button" role="radio" aria-checked={triggerKind === 'v1'} class="h-[38px] rounded-[10px] text-[14px] font-semibold" style={triggerKind === 'v1' ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => switchTriggers('v1')}>{language.mobileScripts.legacyV1}</button>
            {/if}
            <button type="button" role="radio" aria-checked={triggerKind === 'v2'} class="h-[38px] rounded-[10px] text-[14px] font-semibold" style={triggerKind === 'v2' ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => switchTriggers('v2')}>{language.mobileScripts.visual}</button>
            <button type="button" role="radio" aria-checked={triggerKind === 'lua'} class="h-[38px] rounded-[10px] text-[14px] font-semibold" style={triggerKind === 'lua' ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => switchTriggers('lua')}>Lua</button>
        </div>
        <span class="px-1 text-[12px] text-(--mc-text2)">{language.mobileScripts.switchHint}</span>
        {#if triggerKind === 'lua'}
            {@const effect = char.triggerscript[0].effect[0] as { code: string }}
            <CodeField label="Lua" bind:value={effect.code} minRows={14} />
            <button type="button" class="flex min-h-[52px] items-center gap-3 rounded-2xl px-4 text-left text-[15px]" style="background: var(--mc-group);" onclick={() => openURL(hubURL + '/redirect/docs/lua')}>
                <BookOpenIcon size={20} class="text-(--mc-text2)" />
                <span class="flex-1">{language.mobileScripts.luaDocs}</span>
                <ExternalLinkIcon size={18} class="text-(--mc-text2)" />
            </button>
        {:else if triggerKind === 'v2'}
            <div class="risu-mc-legacy"><TriggerV2List bind:value={char.triggerscript} lowLevelAble={char.lowLevelAccess} /></div>
        {:else}
            {#if triggers.length > 0}
                <span class="px-1 text-[13px]" style="color: var(--mc-danger);">{language.triggerV1Warning}</span>
            {/if}
            {#await loadTriggerV1List() then TriggerV1List}
                <div class="risu-mc-legacy"><TriggerV1List bind:value={char.triggerscript} lowLevelAble={char.lowLevelAccess} /></div>
            {/await}
        {/if}
    </div>
{:else}
    <div class="flex flex-col gap-3">
        <span class="px-1 text-[13px] leading-[18px] text-(--mc-text2)">{language.mobileScripts.backgroundHint}</span>
        <CodeField label={language.mobileScripts.backgroundHtml} bind:value={char.backgroundHTML} minRows={10} onchange={() => ReloadGUIPointer.update((v) => v + 1)} />
        {#if char.virtualscript || DBState.db.showUnrecommended}
            <span class="mt-1 px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{language.mobileScripts.unrecommended}</span>
            <CodeField label={language.mobileScripts.charJs} bind:value={char.virtualscript} placeholder={language.mobileScripts.emptyCode} minRows={4} />
        {/if}
    </div>
{/if}

{#if moreOpen && char}
    <Sheet open={true} label={language.mobileScripts.listActions} onclose={() => { moreOpen = false }}>
        <SheetGroup label={language.mobileScripts.listActions}>
            <SheetRow label={language.mobileScripts.import} onclick={async () => { moreOpen = false; char.customscript = await importRegex(char.customscript) }}><UploadIcon size={19} /></SheetRow>
            <SheetRow label={language.mobileScripts.export} onclick={() => { moreOpen = false; exportRegex(char.customscript) }}><DownloadIcon size={19} /></SheetRow>
        </SheetGroup>
    </Sheet>
{/if}

{#if actionsFor}
    {@const script = actionsFor}
    {@const position = scripts.indexOf(script)}
    <Sheet open={true} label={language.mobileScripts.scriptActions.replace('{}', script.comment || language.mobileScripts.unnamed)} onclose={() => { actionsFor = null }}>
        <SheetGroup label={language.mobileScripts.scriptActions.replace('{}', script.comment || language.mobileScripts.unnamed)}>
            <SheetRow label={language.mobileScripts.moveUp} disabled={position <= 0} onclick={() => move(script, -1)}><ArrowUpIcon size={19} /></SheetRow>
            <SheetRow label={language.mobileScripts.moveDown} disabled={position === -1 || position >= scripts.length - 1} onclick={() => move(script, 1)}><ArrowDownIcon size={19} /></SheetRow>
            <SheetRow label={language.mobileScripts.duplicate} onclick={() => duplicate(script)}><CopyIcon size={19} /></SheetRow>
            <SheetRow label={language.mobileScripts.delete} danger onclick={() => remove(script)}><Trash2Icon size={19} /></SheetRow>
        </SheetGroup>
    </Sheet>
{/if}

<style>
    .risu-mc-script-list > :global(li + li) {
        border-top: 1px solid var(--mc-line);
    }
</style>
