<script lang="ts">
    import { KeyRoundIcon, SunIcon, XIcon } from '@lucide/svelte'
    import { v4 } from 'uuid'
    import { language } from 'src/lang'
    import type { character, loreBook } from 'src/ts/storage/database.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'
    import ProfileField from './ProfileField.svelte'

    // One lorebook entry (mockup "Лорбук · запись"), the fields of LoreBookData.svelte.
    // Plain keys become chips; regex keys stay free text so commas inside them survive.

    let { book }: { book: loreBook } = $props()

    let draftKey = $state('')
    let draftSecond = $state('')

    let char = $derived(session.getCharacter())
    let chat = $derived(session.getChat())
    let lorePlus = $derived(!!(char as character | undefined)?.lorePlus && !!char?.globalLore.includes(book))
    let inGlobal = $derived(!!char?.globalLore.includes(book))
    let locallyActive = $derived(!!book.id && !!chat?.localLore.some((b) => b.id === book.id))

    function splitKeys(value: string | undefined): string[] {
        return (value ?? '').split(',').map((k) => k.trim()).filter(Boolean)
    }

    function addKey(field: 'key' | 'secondkey', raw: string): boolean {
        const parts = splitKeys(raw)
        if (parts.length === 0) {
            return false
        }
        book[field] = [...splitKeys(book[field]), ...parts].join(', ')
        return true
    }

    function removeKey(field: 'key' | 'secondkey', index: number) {
        const keys = splitKeys(book[field])
        keys.splice(index, 1)
        book[field] = keys.join(', ')
    }

    function keyInput(field: 'key' | 'secondkey', event: KeyboardEvent) {
        const input = event.currentTarget as HTMLInputElement
        if ((event.key === 'Enter' || event.key === ',') && input.value.trim()) {
            event.preventDefault()
            if (addKey(field, input.value)) {
                if (field === 'key') draftKey = ''
                else draftSecond = ''
            }
        } else if (event.key === 'Backspace' && !input.value) {
            const keys = splitKeys(book[field])
            if (keys.length > 0) {
                removeKey(field, keys.length - 1)
            }
        }
    }

    function commitDraft(field: 'key' | 'secondkey') {
        if (field === 'key' && addKey('key', draftKey)) draftKey = ''
        if (field === 'secondkey' && addKey('secondkey', draftSecond)) draftSecond = ''
    }

    /** LoreBookData.toggleLocalActive: a 'child' entry in the chat's local lore. */
    function toggleLocal() {
        if (!chat) {
            return
        }
        if (locallyActive) {
            chat.localLore = chat.localLore.filter((b) => b.id !== book.id)
            return
        }
        book.id ??= v4()
        chat.localLore.push({ key: '', comment: '', content: '', mode: 'child', insertorder: 100, alwaysActive: true, secondkey: '', selective: false, id: book.id })
    }

    function clampPercent() {
        const v = Number(book.activationPercent)
        book.activationPercent = !v || v < 0 || isNaN(v) ? 0 : v > 100 ? 100 : v
    }
</script>

{#snippet chips(field: 'key' | 'secondkey', label: string)}
    <div class="flex flex-col gap-1.5 rounded-2xl px-3.5 py-3" style="background: var(--mc-group);">
        <span class="text-[12px] text-(--mc-text2)">{label}</span>
        {#if book.useRegex}
            <input bind:value={book[field]} autocomplete="off" autocapitalize="off" spellcheck="false" class="border-0 bg-transparent font-mono text-[15px] outline-none" style="color: var(--mc-text);" />
            <span class="text-[12px] text-(--mc-text2)">{language.mobileLore.regexHint}</span>
        {:else}
            <div class="flex flex-wrap items-center gap-1.5">
                {#each splitKeys(book[field]) as key, i (key + i)}
                    <span class="flex h-[30px] items-center gap-1 rounded-full pl-3 pr-1 text-[13px] font-medium" style="background: var(--mc-accent-soft); color: var(--mc-text);">
                        {key}
                        <button type="button" class="flex h-6 w-6 items-center justify-center rounded-full" style="color: var(--mc-accent);" aria-label={language.mobileLore.removeKey.replace('{}', key)} onclick={() => removeKey(field, i)}><XIcon size={13} strokeWidth={2.4} /></button>
                    </span>
                {/each}
                {#if field === 'key'}
                    <input bind:value={draftKey} placeholder={language.mobileLore.addKey} aria-label={label} enterkeyhint="done" autocapitalize="off" class="min-w-20 flex-1 border-0 bg-transparent text-[15px] outline-none" style="color: var(--mc-text);" onkeydown={(e) => keyInput('key', e)} onblur={() => commitDraft('key')} />
                {:else}
                    <input bind:value={draftSecond} placeholder={language.mobileLore.addKey} aria-label={label} enterkeyhint="done" autocapitalize="off" class="min-w-20 flex-1 border-0 bg-transparent text-[15px] outline-none" style="color: var(--mc-text);" onkeydown={(e) => keyInput('secondkey', e)} onblur={() => commitDraft('secondkey')} />
                {/if}
            </div>
            <span class="text-[12px] text-(--mc-text2)">{language.mobileLore.keysHint}</span>
        {/if}
    </div>
{/snippet}

{#snippet sw(label: string, hint: string, on: boolean, onchange: () => void)}
    <button type="button" role="switch" aria-checked={on} class="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left" onclick={onchange}>
        <span class="flex flex-1 flex-col gap-0.5"><span class="text-[15px]">{label}</span>{#if hint}<span class="text-[12px] text-(--mc-text2)">{hint}</span>{/if}</span>
        <span class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {on ? 'var(--mc-accent)' : 'var(--mc-line)'};"><span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {on ? '21px' : '3px'};"></span></span>
    </button>
{/snippet}

<div class="flex flex-col gap-3 pt-1">
    <label class="flex flex-col gap-1.5 rounded-2xl px-3.5 py-3" style="background: var(--mc-group);">
        <span class="text-[12px] text-(--mc-text2)">{language.mobileLore.name}</span>
        <input bind:value={book.comment} class="border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
    </label>

    <div role="radiogroup" aria-label={language.mobileLore.whenActive} class="grid grid-cols-2 gap-1 rounded-[14px] p-1" style="background: var(--mc-surface);">
        <button type="button" role="radio" aria-checked={!book.alwaysActive} class="flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-semibold" style={!book.alwaysActive ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => { book.alwaysActive = false }}>
            <KeyRoundIcon size={16} />{language.mobileLore.modeKeys}
        </button>
        <button type="button" role="radio" aria-checked={book.alwaysActive} class="flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-[14px] font-semibold" style={book.alwaysActive ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => { book.alwaysActive = true }}>
            <SunIcon size={16} />{language.mobileLore.modeAlways}
        </button>
    </div>

    {#if !lorePlus && !book.alwaysActive}
        {@render chips('key', language.mobileLore.keys)}
        {#if book.selective && !book.useRegex}
            {@render chips('secondkey', language.mobileLore.secondKeys)}
        {/if}
    {/if}

    <ProfileField label={language.mobileLore.content} bind:value={book.content} minRows={5} />

    <div class="overflow-hidden rounded-2xl" style="background: var(--mc-group);">
        {#if !lorePlus && !book.useRegex && !book.alwaysActive}
            {@render sw(language.mobileLore.selective, language.mobileLore.selectiveHint, !!book.selective, () => { book.selective = !book.selective; book.secondkey ??= '' })}
            <div class="h-px" style="background: var(--mc-line);"></div>
        {/if}
        {#if !lorePlus && !book.alwaysActive}
            {@render sw(language.mobileLore.useRegex, '', !!book.useRegex, () => { book.useRegex = !book.useRegex })}
            <div class="h-px" style="background: var(--mc-line);"></div>
        {/if}
        {#if !book.alwaysActive && inGlobal && DBState.db.localActivationInGlobalLorebook}
            {@render sw(language.mobileLore.activeInChat, '', locallyActive, toggleLocal)}
            <div class="h-px" style="background: var(--mc-line);"></div>
        {/if}
        {#if !lorePlus}
            <label class="flex min-h-[52px] items-center gap-3 px-4">
                <span class="flex-1 text-[15px]">{language.mobileLore.insertOrder}</span>
                <input type="number" inputmode="numeric" min="0" max="1000" bind:value={book.insertorder} class="w-20 border-0 bg-transparent text-right text-[15px] tabular-nums outline-none" style="color: var(--mc-text);" />
            </label>
        {/if}
        {#if !lorePlus && !(book.activationPercent === undefined || book.activationPercent === null)}
            <div class="h-px" style="background: var(--mc-line);"></div>
            <label class="flex min-h-[52px] items-center gap-3 px-4">
                <span class="flex-1 text-[15px]">{language.mobileLore.probability}</span>
                <input type="number" inputmode="numeric" min="0" max="100" bind:value={book.activationPercent} onchange={clampPercent} class="w-20 border-0 bg-transparent text-right text-[15px] tabular-nums outline-none" style="color: var(--mc-text);" />
            </label>
        {/if}
    </div>
</div>
