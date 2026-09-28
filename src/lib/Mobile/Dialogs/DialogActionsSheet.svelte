<script lang="ts">
    import { CopyIcon, FolderIcon, ListIcon, SquarePenIcon, Trash2Icon, UserIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { getCharImage, removeChar } from 'src/ts/characters'
    import { DBState } from 'src/ts/stores.svelte'
    import { duplicateCharacter, getFolders, moveToFolder, openWithDrawer, openWithNewChat } from 'src/ts/dialogsActions.svelte'
    import Sheet from '../../MobileChat/Sheet.svelte'
    import SheetRow from '../../MobileChat/SheetRow.svelte'
    import SheetGroup from '../../MobileChat/SheetGroup.svelte'

    // Long press on a dialog (mockup "Долгое нажатие на диалог").

    let { index, onclose }: { index: number; onclose: () => void } = $props()

    let char = $derived(DBState.db.characters[index])
    let chatCount = $derived(char?.chats?.length ?? 0)
    let hasFolders = $derived(getFolders().length > 0)

    function run(action: () => unknown) {
        onclose()
        action()
    }
</script>

<Sheet open={true} label={char?.name ?? ''} {onclose}>
    <div class="flex items-center gap-3 px-1">
        {#await getCharImage(char?.image ?? '', 'css') then css}
            <span class="h-[52px] w-[52px] shrink-0 rounded-full bg-cover bg-center" style={css || 'background: var(--mc-group);'}></span>
        {/await}
        <span class="flex min-w-0 flex-col gap-0.5">
            <span class="truncate text-[16px] font-semibold">{char?.name || 'Unnamed'}</span>
            <span class="text-[13px] text-(--mc-text2)">{language.mobileDialogs.chatsCount.replace('{}', String(chatCount))}</span>
        </span>
    </div>
    <SheetGroup>
        <SheetRow label={language.mobileDialogs.newChat} onclick={() => run(() => openWithNewChat(index))}><SquarePenIcon size={19} /></SheetRow>
        <SheetRow label={language.mobileDialogs.allChats} trailing={String(chatCount)} onclick={() => run(() => openWithDrawer(index, 1))}><ListIcon size={19} /></SheetRow>
        <SheetRow label={language.mobileDialogs.settings} onclick={() => run(() => openWithDrawer(index, 2))}><UserIcon size={19} /></SheetRow>
        {#if hasFolders}
            <SheetRow label={language.mobileDialogs.moveToFolder} onclick={() => run(() => moveToFolder(index))}><FolderIcon size={19} /></SheetRow>
        {/if}
        <SheetRow label={language.mobileDialogs.duplicate} onclick={() => run(() => duplicateCharacter(index))}><CopyIcon size={19} /></SheetRow>
    </SheetGroup>
    <SheetGroup>
        <SheetRow label={language.mobileDialogs.trash} danger onclick={() => run(() => removeChar(index, char?.name ?? '', 'normal'))}><Trash2Icon size={19} /></SheetRow>
    </SheetGroup>
</Sheet>
