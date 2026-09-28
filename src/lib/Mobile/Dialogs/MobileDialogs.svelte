<script lang="ts">
    import '../../MobileChat/mobileChat.css'
    import { PlusIcon, SearchIcon, UsersIcon, XIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { changeChar, getCharImage } from 'src/ts/characters'
    import { applySchemeTokens } from 'src/ts/chatCore/schemeTokens'
    import { ColorSchemeTypeStore } from 'src/ts/gui/colorscheme'
    import { haptic } from 'src/ts/gui/haptics'
    import { longpress } from 'src/ts/gui/longtouch'
    import type { character, groupChat } from 'src/ts/storage/database.svelte'
    import { DBState, MobileSearch } from 'src/ts/stores.svelte'
    import { getFolders } from 'src/ts/dialogsActions.svelte'
    import DialogActionsSheet from './DialogActionsSheet.svelte'
    import NewDialogSheet from './NewDialogSheet.svelte'

    // "Диалоги" tab (mockups "Мобильные диалоги"): conversations sorted by last
    // interaction, search, type and folder filters, long press for actions.

    type Filter = 'all' | 'characters' | 'groups' | `folder:${string}`

    let root: HTMLElement | null = $state(null)
    let filter: Filter = $state('all')
    let actionsFor: number | null = $state(null)
    let addOpen = $state(false)

    const agoFormatter = new Intl.RelativeTimeFormat(navigator.languages, { style: 'short' })
    const nowFormatter = new Intl.RelativeTimeFormat(navigator.languages, { style: 'short', numeric: 'auto' })

    $effect(() => {
        if (!root) {
            return
        }
        void JSON.stringify(DBState.db.colorScheme)
        const borderc = getComputedStyle(document.documentElement).getPropertyValue('--risu-theme-borderc').trim()
        applySchemeTokens(root, { borderc, type: $ColorSchemeTypeStore })
    })

    function ago(time: number): string {
        if (!time) {
            return ''
        }
        const diff = Date.now() - time
        const steps: [number, Intl.RelativeTimeFormatUnit][] = [
            [31536000000, 'year'], [2592000000, 'month'], [604800000, 'week'], [86400000, 'day'], [3600000, 'hour'], [60000, 'minute'],
        ]
        for (const [size, unit] of steps) {
            if (diff >= size) {
                return agoFormatter.format(-Math.floor(diff / size), unit)
            }
        }
        return nowFormatter.format(0, 'second')
    }

    /** Plain-text head of the latest message (MobileCharacters.makePreview). */
    function preview(c: character | groupChat): string {
        const chat = c.chats?.[c.chatPage] ?? c.chats?.[0]
        let text = chat?.message?.at(-1)?.data ?? ''
        if (!text && c.type !== 'group') {
            text = c.firstMessage ?? ''
        }
        return text
            .slice(0, 600)
            .replace(/{{[\s\S]*?}}/g, '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/[*_#>`~|]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 140)
    }

    function normalize(value: string): string {
        return value.replace(/ /g, '').toLocaleLowerCase()
    }

    let folders = $derived(getFolders())
    let entries = $derived(
        DBState.db.characters
            .map((c, i) => ({ c, i }))
            .filter(({ c }) => c && !c.trashTime)
            .map(({ c, i }) => ({
                i,
                id: c.chaId,
                name: c.name || 'Unnamed',
                image: c.image ?? '',
                group: c.type === 'group',
                preview: preview(c),
                interaction: c.lastInteraction || 0,
            }))
            .sort((a, b) => (b.interaction - a.interaction) || a.name.localeCompare(b.name)),
    )
    let visible = $derived.by(() => {
        const query = normalize($MobileSearch)
        const folder = filter.startsWith('folder:') ? folders.find((f) => f.id === filter.slice(7)) : null
        return entries.filter((entry) => {
            if (query && !normalize(entry.name).includes(query)) return false
            if (filter === 'characters') return !entry.group
            if (filter === 'groups') return entry.group
            if (folder) return folder.data.includes(entry.id)
            return true
        })
    })

    function open(index: number) {
        haptic(4)
        changeChar(index)
    }
</script>

<div bind:this={root} class="risu-mc-screen risu-mc-dialogs absolute inset-0 flex flex-col" data-scheme={$ColorSchemeTypeStore}>
    <div class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain" style="padding-top: var(--safe-top, 0px);">
        <header class="flex flex-col gap-3 px-4 pb-2 pt-4">
            <div class="flex items-center justify-between">
                <h1 class="text-[30px] font-bold tracking-tight">{language.mobileDialogs.title}</h1>
                <button type="button" class="flex h-11 w-11 items-center justify-center rounded-full active:scale-95" style="background: var(--mc-accent); color: var(--mc-on-accent);" aria-label={language.mobileDialogs.newDialog} onclick={() => { haptic(6); addOpen = true }}>
                    <PlusIcon size={22} strokeWidth={2.4} />
                </button>
            </div>
            <label class="flex h-[42px] items-center gap-2.5 rounded-full px-3.5" style="background: var(--mc-surface);">
                <SearchIcon size={18} class="shrink-0 text-(--mc-text2)" />
                <input type="search" bind:value={$MobileSearch} placeholder={language.mobileDialogs.search} aria-label={language.mobileDialogs.searchLabel} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
                {#if $MobileSearch}
                    <button type="button" class="-mr-2 flex h-9 w-9 items-center justify-center text-(--mc-text2)" aria-label={language.mobileCatalog.reset} onclick={() => MobileSearch.set('')}><XIcon size={16} /></button>
                {/if}
            </label>
            <div class="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar">
                {#each [['all', language.mobileDialogs.all], ['characters', language.mobileDialogs.characters], ['groups', language.mobileDialogs.groups]] as [key, label] (key)}
                    <button type="button" class="flex h-[34px] shrink-0 items-center rounded-full border px-3.5 text-[14px] font-medium" style={filter === key ? 'background: var(--mc-text); border-color: var(--mc-text); color: var(--mc-bg);' : 'background: var(--mc-surface); border-color: var(--mc-line);'} aria-pressed={filter === key} onclick={() => { filter = key as Filter }}>{label}</button>
                {/each}
                {#each folders as folder (folder.id)}
                    {@const key = `folder:${folder.id}` as Filter}
                    <button type="button" class="flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium" style={filter === key ? 'background: var(--mc-text); border-color: var(--mc-text); color: var(--mc-bg);' : 'background: var(--mc-surface); border-color: var(--mc-line);'} aria-pressed={filter === key} onclick={() => { filter = key }}>
                        <span class="h-2 w-2 rounded-full" style="background: {folder.color || 'var(--mc-text2)'};"></span>
                        {folder.name || language.mobileDialogs.unnamedFolder}
                    </button>
                {/each}
            </div>
        </header>

        {#if entries.length === 0}
            <div class="flex flex-col items-center gap-2 px-8 py-16 text-center">
                <span class="text-[17px] font-semibold">{language.mobileDialogs.empty}</span>
                <span class="text-[14px] text-(--mc-text2)">{language.mobileDialogs.emptyHint}</span>
            </div>
        {:else if visible.length === 0}
            <div class="py-16 text-center text-[15px] text-(--mc-text2)">{language.mobileDialogs.nothingFound}</div>
        {/if}

        <ul class="flex flex-col">
            {#each visible as entry (entry.i)}
                <li>
                    <button type="button" class="flex min-h-[72px] w-full items-center gap-3 px-4 py-2 text-left select-none active:bg-(--mc-surface)" style="-webkit-touch-callout: none;" onclick={() => open(entry.i)} use:longpress={() => { actionsFor = entry.i }}>
                        {#await getCharImage(entry.image, 'css')}
                            <span class="h-[52px] w-[52px] shrink-0 rounded-full" style="background: var(--mc-surface);"></span>
                        {:then css}
                            {#if css}
                                <span class="h-[52px] w-[52px] shrink-0 rounded-full bg-cover bg-center" style={css}></span>
                            {:else}
                                <span class="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-[20px] font-bold text-(--mc-text2)" style="background: var(--mc-surface);">{entry.name.slice(0, 1).toLocaleUpperCase()}</span>
                            {/if}
                        {/await}
                        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span class="flex items-baseline gap-2">
                                <span class="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[16px] font-semibold">
                                    {#if entry.group}<UsersIcon size={14} class="shrink-0 text-(--mc-text2)" />{/if}
                                    <span class="truncate">{entry.name}</span>
                                </span>
                                <span class="shrink-0 text-[12px] text-(--mc-text2)">{ago(entry.interaction)}</span>
                            </span>
                            <span class="line-clamp-2 text-[14px] leading-[19px] text-(--mc-text2)">{entry.preview || language.noMessage}</span>
                        </span>
                    </button>
                </li>
            {/each}
        </ul>
        <!-- Room for the floating tab bar -->
        <div aria-hidden="true" style="height: calc(104px + var(--safe-bottom, 0px));"></div>
    </div>
    {#if actionsFor !== null && DBState.db.characters[actionsFor]}
        <DialogActionsSheet index={actionsFor} onclose={() => { actionsFor = null }} />
    {/if}
    {#if addOpen}
        <NewDialogSheet onclose={() => { addOpen = false }} />
    {/if}
</div>
