<script lang="ts">
    import { CopyIcon, DownloadIcon, FolderIcon, PencilIcon, Trash2Icon, UserCheckIcon, WifiIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { exportChat } from 'src/ts/characters'
    import * as session from 'src/ts/chatCore/session.svelte'
    import {
        boundPersonaName,
        deleteChat,
        duplicateChat,
        messagesLabel,
        moveChatToFolder,
        openMultiuserRoom,
        relativeTime,
        renameChat,
        toggleChatPersona,
    } from 'src/ts/chatCore/chatList.svelte'
    import Sheet from '../Sheet.svelte'
    import SheetRow from '../SheetRow.svelte'
    import SheetGroup from '../SheetGroup.svelte'

    // ⋯ on a chat (mockup "Действия с чатом"): SideChatList's pencil, menu, export and
    // trash buttons in one list.

    let { index, onclose }: { index: number; onclose: () => void } = $props()

    let char = $derived(session.getCharacter())
    let chat = $derived(char?.chats[index])
    let folderName = $derived(chat?.folderId ? char?.chatFolders?.find((f) => f.id === chat.folderId)?.name ?? '' : '')
    let persona = $derived(boundPersonaName(index))
    let subtitle = $derived([
        messagesLabel(chat?.message?.length ?? 0),
        relativeTime(chat?.message?.at(-1)?.time),
        folderName ? language.mobileChats.inFolder.replace('{}', folderName) : '',
    ].filter(Boolean).join(' · '))

    function run(action: () => unknown) {
        onclose()
        action()
    }
</script>

<Sheet open={true} label={chat?.name ?? ''} {onclose}>
    <div class="flex flex-col gap-0.5 px-1">
        <span class="truncate text-[17px] font-semibold">{chat?.name}</span>
        <span class="text-[13px] text-(--mc-text2)">{subtitle}</span>
    </div>
    <SheetGroup>
        <SheetRow label={language.mobileChats.rename} onclick={() => run(() => renameChat(index))}><PencilIcon size={19} /></SheetRow>
        <SheetRow label={language.mobileChats.duplicate} onclick={() => run(() => duplicateChat(index))}><CopyIcon size={19} /></SheetRow>
        {#if (char?.chatFolders?.length ?? 0) > 0}
            <SheetRow label={language.mobileDialogs.moveToFolder} trailing={folderName} onclick={() => run(() => moveChatToFolder(index))}><FolderIcon size={19} /></SheetRow>
        {/if}
        <SheetRow label={persona ? language.mobileChats.unbindPersona : language.mobileChats.bindPersona} trailing={persona} onclick={() => run(() => toggleChatPersona(index))}><UserCheckIcon size={19} /></SheetRow>
    </SheetGroup>
    <SheetGroup>
        <SheetRow label={language.mobileChats.export} onclick={() => run(() => exportChat(index))}><DownloadIcon size={19} /></SheetRow>
        <SheetRow label={language.mobileChats.room} onclick={() => run(() => openMultiuserRoom(index))}><WifiIcon size={19} /></SheetRow>
    </SheetGroup>
    <SheetGroup>
        <SheetRow label={language.mobileChats.delete} danger onclick={() => run(() => deleteChat(index))}><Trash2Icon size={19} /></SheetRow>
    </SheetGroup>
</Sheet>
