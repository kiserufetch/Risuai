<script lang="ts">
    import { Trash2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import * as session from 'src/ts/chatCore/session.svelte'
    import { FOLDER_COLORS, deleteChatFolder } from 'src/ts/chatCore/chatList.svelte'
    import Sheet from '../Sheet.svelte'
    import SheetRow from '../SheetRow.svelte'
    import SheetGroup from '../SheetGroup.svelte'

    // Folder settings (mockup "Папки чатов"): name, color, delete (chats stay).

    let { id, onclose }: { id: string; onclose: () => void } = $props()

    let folder = $derived(session.getCharacter()?.chatFolders?.find((f) => f.id === id))
    const swatches = Object.entries(FOLDER_COLORS)

    async function remove() {
        if (await deleteChatFolder(id)) {
            onclose()
        }
    }
</script>

{#if folder}
    <Sheet open={true} label={language.mobileChats.folderTitle.replace('{}', folder.name)} {onclose}>
        <h2 class="truncate px-1 text-[20px] font-bold">{language.mobileChats.folderTitle.replace('{}', folder.name)}</h2>
        <label class="flex flex-col gap-1.5 rounded-2xl px-3.5 py-3" style="background: var(--mc-group);">
            <span class="text-[12px] text-(--mc-text2)">{language.mobileChats.folderName}</span>
            <input bind:value={folder.name} class="border-0 bg-transparent text-base outline-none" style="color: var(--mc-text);" />
        </label>
        <div class="flex flex-col gap-2">
            <span class="px-2 text-[12px] font-semibold uppercase tracking-wide text-(--mc-text2)">{language.mobileChats.folderColor}</span>
            <div class="flex flex-wrap gap-2 px-1" role="radiogroup" aria-label={language.mobileChats.folderColor}>
                {#each swatches as [name, hex] (name)}
                    {@const selected = (folder.color ?? 'default') === name}
                    <button type="button" role="radio" aria-checked={selected} aria-label={name} class="h-9 w-9 rounded-full" style="background: {hex}; box-shadow: {selected ? '0 0 0 3px var(--mc-surface), 0 0 0 5px var(--mc-text)' : 'none'};" onclick={() => { folder.color = name }}></button>
                {/each}
            </div>
        </div>
        <SheetGroup>
            <SheetRow label={language.mobileChats.deleteFolder} danger onclick={remove}><Trash2Icon size={19} /></SheetRow>
        </SheetGroup>
    </Sheet>
{/if}
