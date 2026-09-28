<script lang="ts">
    import { BookmarkIcon, ChevronDownIcon, ChevronRightIcon, DownloadIcon, EllipsisIcon, FolderPlusIcon, GitBranchIcon, PlusIcon, SearchIcon, UploadIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertStore } from 'src/ts/alert'
    import { exportAllChats, importChat } from 'src/ts/characters'
    import { bookmarkListOpen } from 'src/ts/stores.svelte'
    import type { Chat } from 'src/ts/storage/database.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'
    import { createNewChat } from 'src/ts/chatCore/newChat'
    import { createChatFolder, folderColor, messagesLabel, relativeTime, selectChat } from 'src/ts/chatCore/chatList.svelte'
    import Sheet from '../Sheet.svelte'
    import SheetRow from '../SheetRow.svelte'
    import SheetGroup from '../SheetGroup.svelte'
    import ChatActionsSheet from './ChatActionsSheet.svelte'
    import ChatFolderSheet from './ChatFolderSheet.svelte'

    // Chats of the current character (mockup "Чаты"): search, folders, current chat
    // highlighted, ⋯ for chat actions. Replaces the in-chat SideChatList drawer.

    let { onclose }: { onclose: () => void } = $props()

    let query = $state('')
    let moreOpen = $state(false)
    let actionsFor: number | null = $state(null)
    let folderFor: string | null = $state(null)

    let char = $derived(session.getCharacter())
    let chats = $derived(char?.chats ?? [])
    let folders = $derived(char?.chatFolders ?? [])
    let current = $derived(char?.chatPage ?? 0)
    let search = $derived(query.trim().toLocaleLowerCase())
    let entries = $derived(
        chats
            .map((chat, index) => ({ chat, index }))
            .filter(({ chat }) => !search || chat.name.toLocaleLowerCase().includes(search)),
    )
    let loose = $derived(entries.filter(({ chat }) => !chat.folderId || !folders.some((f) => f.id === chat.folderId)))

    function meta(chat: Chat): string {
        const parts = [messagesLabel(chat.message?.length ?? 0)]
        const when = relativeTime(chat.message?.at(-1)?.time)
        if (when) {
            parts.push(when)
        }
        return parts.join(' · ')
    }

    function open(index: number) {
        selectChat(index)
        onclose()
    }

    function newChat() {
        createNewChat()
        onclose()
    }

    function newFolder() {
        const id = createChatFolder()
        if (id) {
            folderFor = id
        }
    }
</script>

{#snippet chatRow(chat: Chat, index: number)}
    {@const isCurrent = index === current}
    <div class="flex min-h-[60px] items-center gap-2.5 rounded-[14px] border pl-3 pr-1" style={isCurrent ? 'background: var(--mc-accent-soft); border-color: color-mix(in oklab, var(--mc-accent) 55%, transparent);' : 'border-color: transparent;'}>
        <span aria-hidden="true" class="h-2 w-2 shrink-0 rounded-full" style={isCurrent ? 'background: var(--mc-accent);' : ''}></span>
        <button type="button" class="flex min-w-0 flex-1 flex-col gap-0.5 py-2 text-left" aria-current={isCurrent ? 'true' : undefined} onclick={() => open(index)}>
            <span class="truncate text-[15px] font-semibold">{chat.name}</span>
            <span class="truncate text-[13px] text-(--mc-text2)">{meta(chat)}</span>
        </button>
        <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label="{language.mobileChats.chatActions}: {chat.name}" onclick={() => { actionsFor = index }}>
            <EllipsisIcon size={20} />
        </button>
    </div>
{/snippet}

<Sheet open={true} label={language.mobileChats.title} {onclose} class="min-h-[70dvh]">
    <div class="flex items-center justify-between px-1">
        <h2 class="text-[20px] font-bold">{language.mobileChats.title}</h2>
        <span class="flex">
            <button type="button" class="flex h-11 w-11 items-center justify-center rounded-full text-(--mc-text2)" aria-label={language.mobileChats.bookmarks} onclick={() => { onclose(); bookmarkListOpen.set(true) }}><BookmarkIcon size={20} /></button>
            <button type="button" class="flex h-11 w-11 items-center justify-center rounded-full text-(--mc-text2)" aria-label={language.mobileChats.newFolder} onclick={newFolder}><FolderPlusIcon size={20} /></button>
            <button type="button" class="flex h-11 w-11 items-center justify-center rounded-full" style={moreOpen ? 'color: var(--mc-accent);' : 'color: var(--mc-text2);'} aria-label={language.mobileChats.more} aria-expanded={moreOpen} onclick={() => { moreOpen = !moreOpen }}><EllipsisIcon size={20} /></button>
        </span>
    </div>

    {#if moreOpen}
        <SheetGroup>
            <SheetRow label={language.mobileChats.importChat} onclick={() => importChat()}><UploadIcon size={19} /></SheetRow>
            <SheetRow label={language.mobileChats.exportAll} onclick={() => exportAllChats()}><DownloadIcon size={19} /></SheetRow>
            <SheetRow label={language.mobileChats.branches} onclick={() => { onclose(); alertStore.set({ type: 'branches', msg: '' }) }}><GitBranchIcon size={19} /></SheetRow>
        </SheetGroup>
    {/if}

    <div class="flex gap-2">
        <label class="flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-full px-3.5" style="background: var(--mc-group);">
            <SearchIcon size={17} class="shrink-0 text-(--mc-text2)" />
            <input type="search" bind:value={query} placeholder={language.mobileChats.search} aria-label={language.mobileChats.search} class="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
        </label>
        <button type="button" class="flex h-[42px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold active:scale-95" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={newChat}>
            <PlusIcon size={18} strokeWidth={2.4} />{language.mobileChats.newChat}
        </button>
    </div>

    <div class="flex flex-col gap-1.5">
        {#each folders as folder (folder.id)}
            {@const inFolder = entries.filter(({ chat }) => chat.folderId === folder.id)}
            {#if !search || inFolder.length > 0}
                {@const expanded = !!search || !folder.folded}
                <div class="flex flex-col gap-1">
                    <div class="flex items-center">
                        <button type="button" class="flex h-11 min-w-0 flex-1 items-center gap-2.5 px-3 text-[14px] font-semibold" aria-expanded={expanded} onclick={() => { folder.folded = !folder.folded }}>
                            <span class="h-2.5 w-2.5 shrink-0 rounded-[3px]" style="background: {folderColor(folder.color)};"></span>
                            <span class="min-w-0 flex-1 truncate text-left">{folder.name}</span>
                            <span class="text-[13px] font-medium text-(--mc-text2)">{inFolder.length}</span>
                            {#if expanded}<ChevronDownIcon size={18} class="text-(--mc-text2)" />{:else}<ChevronRightIcon size={18} class="text-(--mc-text2)" />{/if}
                        </button>
                        <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center text-(--mc-text2)" aria-label="{language.mobileChats.folderActions}: {folder.name}" onclick={() => { folderFor = folder.id }}>
                            <EllipsisIcon size={18} />
                        </button>
                    </div>
                    {#if expanded}
                        {#each inFolder as entry (entry.chat.id ?? entry.index)}
                            {@render chatRow(entry.chat, entry.index)}
                        {:else}
                            <span class="px-9 pb-1 text-[13px] text-(--mc-text2)">{language.mobileChats.empty}</span>
                        {/each}
                    {/if}
                </div>
            {/if}
        {/each}
        {#each loose as entry (entry.chat.id ?? entry.index)}
            {@render chatRow(entry.chat, entry.index)}
        {/each}
        {#if search && entries.length === 0}
            <span class="py-8 text-center text-[14px] text-(--mc-text2)">{language.mobileDialogs.nothingFound}</span>
        {/if}
    </div>
</Sheet>

{#if actionsFor !== null && chats[actionsFor]}
    <ChatActionsSheet index={actionsFor} onclose={() => { actionsFor = null }} />
{/if}
{#if folderFor !== null}
    <ChatFolderSheet id={folderFor} onclose={() => { folderFor = null }} />
{/if}
