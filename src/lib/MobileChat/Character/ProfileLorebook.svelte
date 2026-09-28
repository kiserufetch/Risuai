<script lang="ts">
    import {
        ChevronDownIcon, ChevronRightIcon, CopyIcon, DownloadIcon, EllipsisIcon, FolderIcon, FolderOpenIcon,
        FolderPlusIcon, KeyRoundIcon, LinkIcon, PlusIcon, SearchIcon, SunIcon, Trash2Icon, UploadIcon,
    } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertConfirm, alertMd, alertSelect } from 'src/ts/alert'
    import { addLorebook, addLorebookFolder, exportLoreBook, importLoreBook } from 'src/ts/process/lorebook.svelte'
    import type { character, loreBook } from 'src/ts/storage/database.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'
    import Sheet from '../Sheet.svelte'
    import SheetRow from '../SheetRow.svelte'
    import SheetGroup from '../SheetGroup.svelte'

    // Lorebook page of the profile (mockups "Лорбук · список / настройки / ⋯"), over the
    // same data as LoreBookSetting/LoreBookList: character globalLore, chat localLore,
    // folders as mode 'folder' entries whose key the children reference in `folder`.

    let { onopen }: { onopen: (book: loreBook, list: loreBook[]) => void } = $props()

    let tab: 0 | 1 | 2 = $state(0)
    let query = $state('')
    let expanded = $state(new Set<string>())
    let moreOpen = $state(false)
    let entryFor: loreBook | null = $state(null)
    let folderFor: loreBook | null = $state(null)

    let char = $derived(session.getCharacter())
    let chat = $derived(session.getChat())
    let list = $derived((tab === 0 ? char?.globalLore : chat?.localLore) ?? [])
    let settingsChar = $derived(char as character | undefined)
    let lorePlus = $derived(tab === 0 && !!(char as character | undefined)?.lorePlus)
    let search = $derived(query.trim().toLocaleLowerCase())
    let folders = $derived(list.filter((b) => b.mode === 'folder'))
    let matches = (book: loreBook) =>
        !search || [book.comment, book.key, book.secondkey, book.content].some((v) => (v ?? '').toLocaleLowerCase().includes(search))
    let loose = $derived(list.filter((b) => b.mode !== 'folder' && (!b.folder || !folders.some((f) => f.key === b.folder)) && matches(b)))

    function title(book: loreBook): string {
        if (book.mode === 'child') {
            return parentName(book)
        }
        return book.comment || book.key || language.mobileLore.unnamed
    }

    function parentName(book: loreBook): string {
        const parent = char?.globalLore.find((b) => b.id === book.id)
        return parent ? parent.comment || parent.key || language.mobileLore.unnamed : language.mobileLore.unnamed
    }

    function subtitle(book: loreBook): string {
        if (book.mode === 'child') {
            return language.mobileLore.childEntry
        }
        const keys = book.alwaysActive ? language.mobileLore.always : (book.key || '').split(',').map((k) => k.trim()).filter(Boolean).join(', ') || language.mobileLore.noKeys
        return keys
    }

    function toggleFolder(key: string) {
        const next = new Set(expanded)
        next.has(key) ? next.delete(key) : next.add(key)
        expanded = next
    }

    function addEntry() {
        addLorebook(tab)
        const target = tab === 0 ? char?.globalLore : chat?.localLore
        const book = target?.at(-1)
        if (book && target) {
            onopen(book, target)
        }
    }

    function removeLocalChild(book: loreBook) {
        if (book.id && chat) {
            chat.localLore = chat.localLore.filter((b) => !(b.mode === 'child' && b.id === book.id))
        }
    }

    async function deleteEntry(book: loreBook) {
        entryFor = null
        if (!(await alertConfirm(language.removeConfirm + title(book)))) {
            return
        }
        // Splice first: reassigning localLore in removeLocalChild would detach `list`.
        const index = list.indexOf(book)
        if (index !== -1) {
            list.splice(index, 1)
        }
        if (book.mode !== 'child') {
            removeLocalChild(book)
        }
    }

    function duplicateEntry(book: loreBook) {
        entryFor = null
        const copy = $state.snapshot(book) as loreBook
        delete copy.id
        copy.comment = `${title(book)} ${language.mobileLore.copySuffix}`
        list.splice(list.indexOf(book) + 1, 0, copy)
    }

    async function moveEntry(book: loreBook) {
        entryFor = null
        const options = [language.mobileDialogs.noFolder, ...folders.map((f) => f.comment || language.mobileLore.unnamedFolder)]
        const picked = Number(await alertSelect(options, language.mobileLore.moveToFolder))
        if (!Number.isInteger(picked) || picked < 0 || picked >= options.length) {
            return
        }
        if (picked === 0) {
            delete book.folder
        } else {
            book.folder = folders[picked - 1].key
        }
    }

    function setFolderAlways(folder: loreBook, on: boolean) {
        folder.alwaysActive = on
        for (const book of list) {
            if (book.folder === folder.key) {
                book.alwaysActive = on
            }
        }
    }

    async function deleteFolder(folder: loreBook) {
        const hasChildren = list.some((b) => b.folder === folder.key)
        if (hasChildren && !(await alertConfirm(language.folderRemoveConfirm))) {
            return
        }
        if (!(await alertConfirm(language.removeConfirm + (folder.comment || language.mobileLore.unnamedFolder)))) {
            return
        }
        folderFor = null
        const kept = list.filter((b) => b !== folder && b.folder !== folder.key)
        if (tab === 0 && char) {
            char.globalLore = kept
        } else if (chat) {
            chat.localLore = kept
        }
    }

    function setAll(always: boolean) {
        moreOpen = false
        for (const book of list) {
            book.alwaysActive = always
        }
    }

    function stepper(value: number, delta: number, min: number, max: number) {
        return Math.min(max, Math.max(min, (Number(value) || 0) + delta))
    }
</script>

{#snippet entryRow(book: loreBook)}
    <li class="flex min-h-[60px] items-center gap-3 py-1.5 pl-3.5 pr-2">
        {#if book.mode === 'child'}
            <button type="button" class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]" style="background: var(--mc-accent-soft); color: var(--mc-accent);" aria-label={language.mobileLore.childEntry} onclick={() => alertMd(language.childLoreDesc)}><LinkIcon size={18} /></button>
        {:else}
            <button type="button" class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]" style={book.alwaysActive ? 'background: color-mix(in oklab, #f59e0b 16%, transparent); color: #f59e0b;' : 'background: var(--mc-accent-soft); color: var(--mc-accent);'} aria-label={book.alwaysActive ? language.mobileLore.modeAlways : language.mobileLore.modeKeys} aria-pressed={book.alwaysActive} onclick={() => { book.alwaysActive = !book.alwaysActive }}>
                {#if book.alwaysActive}<SunIcon size={18} />{:else}<KeyRoundIcon size={18} />{/if}
            </button>
        {/if}
        <button type="button" class="flex min-w-0 flex-1 flex-col gap-0.5 text-left" onclick={() => (book.mode === 'child' ? alertMd(language.childLoreDesc) : onopen(book, list))}>
            <span class="truncate text-[15px] font-semibold">{title(book)}</span>
            <span class="truncate text-[13px] text-(--mc-text2)">{subtitle(book)}</span>
        </button>
        <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label={language.mobileLore.entryActions.replace('{}', title(book))} onclick={() => { entryFor = book }}>
            <EllipsisIcon size={18} />
        </button>
    </li>
{/snippet}

<div class="sticky top-0 z-10 -mx-4 mb-3 px-4 pb-1 pt-1" style="background: var(--mc-bg);">
    <div role="tablist" aria-label={language.mobileProfile.lorebook} class="grid grid-cols-3 gap-1 rounded-[14px] p-1" style="background: var(--mc-surface);">
        {#each [[0, char?.type === 'group' ? language.mobileLore.tabGroup : language.mobileLore.tabCharacter], [1, language.mobileLore.tabChat], [2, language.mobileLore.tabSettings]] as [key, label] (key)}
            <button type="button" role="tab" aria-selected={tab === key} class="h-9 rounded-[10px] text-[14px] font-semibold" style={tab === key ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => { tab = key as 0 | 1 | 2 }}>{label}</button>
        {/each}
    </div>
</div>

{#if tab !== 2}
    <div class="flex flex-col gap-3">
        <div class="flex items-start gap-2 px-1">
            <span class="flex-1 text-[13px] leading-[18px] text-(--mc-text2)">{tab === 0 ? (char?.type === 'group' ? language.groupLoreInfo : language.globalLoreInfo) : language.localLoreInfo}</span>
            <button type="button" class="-mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label={language.mobileLore.more} onclick={() => { moreOpen = true }}><EllipsisIcon size={20} /></button>
        </div>
        <div class="flex gap-2">
            <label class="flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-full px-3.5" style="background: var(--mc-group);">
                <SearchIcon size={17} class="shrink-0 text-(--mc-text2)" />
                <input type="search" bind:value={query} placeholder={language.mobileLore.search} aria-label={language.mobileLore.search} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
            </label>
            <button type="button" class="flex h-[42px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={addEntry}>
                <PlusIcon size={18} strokeWidth={2.4} />{language.mobileLore.addEntry}
            </button>
        </div>

        {#each folders as folder (folder.key)}
            {@const children = list.filter((b) => b.folder === folder.key && matches(b))}
            {#if !search || children.length > 0}
                {@const open = !!search || expanded.has(folder.key)}
                <div class="overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                    <div class="flex min-h-[52px] items-center gap-3 pl-3.5 pr-2">
                        <span class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]" style="background: var(--mc-accent-soft); color: var(--mc-accent);">
                            {#if open}<FolderOpenIcon size={18} />{:else}<FolderIcon size={18} />{/if}
                        </span>
                        <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left text-[15px] font-semibold" aria-expanded={open} onclick={() => toggleFolder(folder.key)}>
                            <span class="min-w-0 flex-1 truncate">{folder.comment || language.mobileLore.unnamedFolder}</span>
                            <span class="text-[13px] font-medium text-(--mc-text2)">{list.filter((b) => b.folder === folder.key).length}</span>
                            {#if open}<ChevronDownIcon size={18} class="text-(--mc-text2)" />{:else}<ChevronRightIcon size={18} class="text-(--mc-text2)" />{/if}
                        </button>
                        <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label={language.mobileLore.folderActions.replace('{}', folder.comment || language.mobileLore.unnamedFolder)} onclick={() => { folderFor = folder }}><EllipsisIcon size={18} /></button>
                    </div>
                    {#if open}
                        <ul class="risu-mc-lore-list" style="border-top: 1px solid var(--mc-line);">
                            {#each children as book (book)}
                                {@render entryRow(book)}
                            {/each}
                        </ul>
                    {/if}
                </div>
            {/if}
        {/each}

        {#if loose.length > 0}
            <ul class="risu-mc-lore-list overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {#each loose as book (book)}
                    {@render entryRow(book)}
                {/each}
            </ul>
        {:else if folders.length === 0}
            <span class="py-10 text-center text-[15px] text-(--mc-text2)">{search ? language.mobileDialogs.nothingFound : language.mobileLore.empty}</span>
        {/if}
    </div>
{:else if settingsChar}
    <div class="flex flex-col gap-3.5">
        {#snippet sw(label: string, hint: string, on: boolean, onchange: () => void)}
            <button type="button" role="switch" aria-checked={on} class="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left" onclick={onchange}>
                <span class="flex flex-1 flex-col gap-0.5"><span class="text-[15px]">{label}</span>{#if hint}<span class="text-[12px] text-(--mc-text2)">{hint}</span>{/if}</span>
                <span class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {on ? 'var(--mc-accent)' : 'var(--mc-line)'};"><span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {on ? '21px' : '3px'};"></span></span>
            </button>
        {/snippet}
        {#snippet num(label: string, hint: string, value: number, min: number, max: number, step: number, set: (v: number) => void)}
            <div class="flex min-h-[60px] items-center gap-3 px-4 py-2">
                <span class="flex flex-1 flex-col gap-0.5"><span class="text-[15px]">{label}</span><span class="text-[12px] text-(--mc-text2)">{hint}</span></span>
                <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full text-[18px]" style="background: var(--mc-line);" aria-label={language.mobileLore.decrease} onclick={() => set(stepper(value, -step, min, max))}>−</button>
                <input type="number" inputmode="numeric" {min} {max} value={value} aria-label={label} class="w-14 border-0 bg-transparent text-center text-[15px] tabular-nums outline-none" style="color: var(--mc-text);" onchange={(e) => set(stepper(Number((e.currentTarget as HTMLInputElement).value), 0, min, max))} />
                <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full text-[18px]" style="background: var(--mc-line);" aria-label={language.mobileLore.increase} onclick={() => set(stepper(value, step, min, max))}>+</button>
            </div>
        {/snippet}
        <div class="overflow-hidden rounded-2xl" style="background: var(--mc-group);">
            {@render sw(language.mobileLore.useGlobal, language.mobileLore.useGlobalHint, !settingsChar.loreSettings, () => {
                settingsChar.loreSettings = settingsChar.loreSettings
                    ? undefined
                    : { tokenBudget: DBState.db.loreBookToken, scanDepth: DBState.db.loreBookDepth, recursiveScanning: false }
            })}
        </div>
        {#if settingsChar.loreSettings}
            {@const settings = settingsChar.loreSettings}
            <div class="risu-mc-lore-list overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {@render num(language.mobileLore.depth, language.mobileLore.depthHint, settings.scanDepth, 0, 20, 1, (v) => { settings.scanDepth = v })}
                <div class="h-px" style="background: var(--mc-line);"></div>
                {@render num(language.mobileLore.budget, language.mobileLore.budgetHint, settings.tokenBudget, 0, 4096, 50, (v) => { settings.tokenBudget = v })}
            </div>
            <div class="overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {@render sw(language.mobileLore.recursive, language.mobileLore.recursiveHint, !!settings.recursiveScanning, () => { settings.recursiveScanning = !settings.recursiveScanning })}
                <div class="h-px" style="background: var(--mc-line);"></div>
                {@render sw(language.mobileLore.fullWord, language.mobileLore.fullWordHint, !!settings.fullWordMatching, () => { settings.fullWordMatching = !settings.fullWordMatching })}
            </div>
        {/if}
        {#if DBState.db.useExperimental}
            <div class="overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {@render sw(language.mobileLore.lorePlus, '', !!settingsChar.lorePlus, () => { settingsChar.lorePlus = !settingsChar.lorePlus })}
            </div>
        {/if}
    </div>
{/if}

{#if moreOpen}
    <Sheet open={true} label={language.mobileLore.listActions} onclose={() => { moreOpen = false }}>
        <SheetGroup label={language.mobileLore.listActions}>
            <SheetRow label={language.mobileLore.newFolder} onclick={() => { moreOpen = false; addLorebookFolder(tab) }}><FolderPlusIcon size={19} /></SheetRow>
            <SheetRow label={language.mobileLore.import} onclick={() => { moreOpen = false; importLoreBook(tab === 0 ? 'global' : 'local') }}><UploadIcon size={19} /></SheetRow>
            <SheetRow label={language.mobileLore.export} onclick={() => { moreOpen = false; exportLoreBook(tab === 0 ? 'global' : 'local') }}><DownloadIcon size={19} /></SheetRow>
        </SheetGroup>
        {#if DBState.db.bulkEnabling}
            <SheetGroup>
                <SheetRow label={language.mobileLore.allAlways} onclick={() => setAll(true)}><SunIcon size={19} /></SheetRow>
                <SheetRow label={language.mobileLore.allKeys} onclick={() => setAll(false)}><KeyRoundIcon size={19} /></SheetRow>
            </SheetGroup>
        {/if}
    </Sheet>
{/if}

{#if entryFor}
    {@const book = entryFor}
    <Sheet open={true} label={language.mobileLore.entryActions.replace('{}', title(book))} onclose={() => { entryFor = null }}>
        <SheetGroup label={language.mobileLore.entryActions.replace('{}', title(book))}>
            {#if book.mode !== 'child'}
                {#if folders.length > 0}
                    <SheetRow label={language.mobileLore.moveToFolder} trailing={folders.find((f) => f.key === book.folder)?.comment ?? ''} onclick={() => moveEntry(book)}><FolderIcon size={19} /></SheetRow>
                {/if}
                <SheetRow label={language.mobileLore.duplicate} onclick={() => duplicateEntry(book)}><CopyIcon size={19} /></SheetRow>
            {/if}
            <SheetRow label={language.mobileLore.deleteEntry} danger onclick={() => deleteEntry(book)}><Trash2Icon size={19} /></SheetRow>
        </SheetGroup>
    </Sheet>
{/if}

{#if folderFor}
    {@const folder = folderFor}
    <Sheet open={true} label={language.mobileLore.folderActions.replace('{}', folder.comment || language.mobileLore.unnamedFolder)} onclose={() => { folderFor = null }}>
        <label class="flex flex-col gap-1.5 rounded-2xl px-3.5 py-3" style="background: var(--mc-group);">
            <span class="text-[12px] text-(--mc-text2)">{language.mobileLore.folderName}</span>
            <input bind:value={folder.comment} class="border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
        </label>
        <SheetGroup>
            <SheetRow label={language.mobileLore.folderAlways} toggle={!!folder.alwaysActive} onclick={() => setFolderAlways(folder, !folder.alwaysActive)}><SunIcon size={19} /></SheetRow>
            <SheetRow label={language.mobileLore.deleteFolder} danger onclick={() => deleteFolder(folder)}><Trash2Icon size={19} /></SheetRow>
        </SheetGroup>
    </Sheet>
{/if}

<style>
    .risu-mc-lore-list > :global(li + li) {
        border-top: 1px solid var(--mc-line);
    }
</style>
