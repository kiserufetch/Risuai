<script lang="ts">
    import { FileIcon, FlameIcon, GlobeIcon, UserIcon, UsersIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { importCharacter } from 'src/ts/characterCards'
    import { changeChar, createNewCharacter, createNewGroup } from 'src/ts/characters'
    import { openWithDrawer } from 'src/ts/dialogsActions.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { MobileGUIStack, OpenRealmStore, OpenSpicyChatStore } from 'src/ts/stores.svelte'
    import Sheet from '../../MobileChat/Sheet.svelte'
    import SheetRow from '../../MobileChat/SheetRow.svelte'
    import SheetGroup from '../../MobileChat/SheetGroup.svelte'

    // The "+" of "Диалоги" (mockup "Кнопка «+»"): the same choices as the
    // desktop add-character dialog, with the catalog one tap away.

    let { onclose }: { onclose: () => void } = $props()

    function run(action: () => unknown) {
        onclose()
        action()
    }

    /** A new character or group opens straight into its settings, like the desktop flow. */
    function createAndEdit(create: () => number) {
        openWithDrawer(create(), 2)
    }

    async function importFromFile() {
        const before = DBState.db.characters.length
        await importCharacter()
        if (DBState.db.characters.length > before) {
            changeChar(DBState.db.characters.length - 1)
        }
    }

    function openCatalog(spicy: boolean) {
        OpenRealmStore.set(false)
        OpenSpicyChatStore.set(spicy)
        MobileGUIStack.set(0)
    }
</script>

<Sheet open={true} label={language.mobileDialogs.newDialog} {onclose}>
    <h2 class="px-1 text-[20px] font-bold">{language.mobileDialogs.newDialog}</h2>
    <div class="grid grid-cols-2 gap-2.5">
        <button type="button" class="flex flex-col items-start gap-2.5 rounded-[18px] p-3.5 text-left active:scale-[.98]" style="background: var(--mc-group);" onclick={() => run(() => createAndEdit(createNewCharacter))}>
            <span class="flex h-10 w-10 items-center justify-center rounded-xl" style="background: var(--mc-accent-soft); color: var(--mc-accent);"><UserIcon size={21} /></span>
            <span class="text-[15px] font-semibold">{language.mobileDialogs.character}</span>
            <span class="text-[12px] leading-4 text-(--mc-text2)">{language.mobileDialogs.characterHint}</span>
        </button>
        <button type="button" class="flex flex-col items-start gap-2.5 rounded-[18px] p-3.5 text-left active:scale-[.98]" style="background: var(--mc-group);" onclick={() => run(() => createAndEdit(createNewGroup))}>
            <span class="flex h-10 w-10 items-center justify-center rounded-xl" style="background: var(--mc-accent-soft); color: var(--mc-accent);"><UsersIcon size={21} /></span>
            <span class="text-[15px] font-semibold">{language.mobileDialogs.group}</span>
            <span class="text-[12px] leading-4 text-(--mc-text2)">{language.mobileDialogs.groupHint}</span>
        </button>
    </div>
    <SheetGroup>
        <SheetRow label={language.mobileDialogs.importFile} trailing={language.mobileDialogs.importFormats} onclick={() => run(importFromFile)}><FileIcon size={19} /></SheetRow>
        <SheetRow label={language.mobileDialogs.findRealm} onclick={() => run(() => openCatalog(false))}><GlobeIcon size={19} /></SheetRow>
        <SheetRow label={language.mobileDialogs.findSpicy} onclick={() => run(() => openCatalog(true))}><FlameIcon size={19} /></SheetRow>
    </SheetGroup>
</Sheet>
