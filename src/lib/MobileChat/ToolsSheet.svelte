<script lang="ts">
    import {
        BrainIcon, CameraIcon, DatabaseIcon, DicesIcon, ImagePlusIcon, LanguagesIcon, LaughIcon, LoaderCircleIcon,
        MessageCircleReplyIcon, MicOffIcon, PackageIcon, RefreshCwIcon, ReplyIcon, SparkleIcon, StepForwardIcon,
    } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { showHypaV2Alert } from 'src/ts/alert'
    import { postChatFile } from 'src/ts/process/files/multisend'
    import { stopTTS } from 'src/ts/process/tts'
    import { DBState, additionalChatMenu, easyPanelStore, hypaV3ModalOpen } from 'src/ts/stores.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'
    import { canContinue, continueResponse, generate, requestAutoReply, toggleGroupAutoMode } from 'src/ts/chatCore/sendPipeline'
    import { reroll } from 'src/ts/chatCore/alternatives.svelte'
    import { getDraft } from 'src/ts/chatCore/composerDraft.svelte'
    import { generationStatus } from 'src/ts/chatCore/generationStatus.svelte'
    import PluginDefinedIcon from '../Others/PluginDefinedIcon.svelte'
    import Sheet from './Sheet.svelte'
    import SheetTile from './SheetTile.svelte'
    import SheetRow from './SheetRow.svelte'
    import SheetGroup from './SheetGroup.svelte'

    // The "+" sheet (spec §5.4): replaces the ≡ menu of DefaultChatScreen with the same
    // visibility conditions.

    interface Props {
        onclose: () => void
        onstickers: () => void
        onchatlist: () => void
        onmodules: () => void
        onscreenshot: () => void
    }

    let { onclose, onstickers, onchatlist, onmodules, onscreenshot }: Props = $props()

    let char = $derived(session.getCharacter())
    let chat = $derived(session.getChat())
    let group = $derived(char?.type === 'group')
    let continueAllowed = $derived(canContinue())
    let showMemory = $derived(DBState.db.showMenuHypaMemoryModal && ((DBState.db.supaModelType !== 'none' && DBState.db.hypav2) || DBState.db.hypaV3))
    let canStopTts = $derived(char?.ttsMode === 'webspeech' || char?.ttsMode === 'elevenlab')

    function run(action: () => unknown) {
        onclose()
        action()
    }

    async function postFile() {
        const draft = getDraft(session.getChatKey())
        onclose()
        const results = await postChatFile(draft.text)
        if (!results) {
            return
        }
        for (const result of results) {
            if (result?.type === 'asset') {
                draft.attachments.push(result.data)
            }
            if (result?.type === 'text') {
                draft.text += `{{file::${result.name}::${result.data}}}`
            }
        }
    }

    async function autoReply() {
        const draft = getDraft(session.getChatKey())
        const reply = await requestAutoReply()
        if (reply) {
            draft.text = reply
            onclose()
        }
    }

    function openMemory() {
        if (DBState.db.hypav2) {
            chat.hypaV2Data ??= { lastMainChunkID: 0, mainChunks: [], chunks: [] }
            showHypaV2Alert()
        } else if (DBState.db.hypaV3) {
            hypaV3ModalOpen.set(true)
        }
    }

    function openModules() {
        chat.modules ??= []
        onmodules()
    }
</script>

<Sheet open={true} label={language.mobileChat.tools} {onclose}>
    <div class="flex gap-2">
        <SheetTile label={language.mobileChat.file} onclick={postFile}><ImagePlusIcon size={20} /></SheetTile>
        {#if DBState.db.useChatSticker && !group}
            <SheetTile label={language.mobileChat.stickers} onclick={() => run(onstickers)}><LaughIcon size={20} /></SheetTile>
        {/if}
        <SheetTile label={language.mobileChat.continue} disabled={!continueAllowed} onclick={() => run(continueResponse)}><StepForwardIcon size={20} /></SheetTile>
        <SheetTile label={language.autoReply} disabled={generationStatus.autoReplyPending} onclick={autoReply}>
            {#if generationStatus.autoReplyPending}<LoaderCircleIcon size={20} class="animate-spin" />{:else}<MessageCircleReplyIcon size={20} />{/if}
        </SheetTile>
    </div>

    <SheetGroup>
        <SheetRow label={language.mobileChat.suggestions} toggle={DBState.db.useAutoSuggestions} onclick={() => { DBState.db.useAutoSuggestions = !DBState.db.useAutoSuggestions }}><ReplyIcon size={19} /></SheetRow>
        {#if DBState.db.translator !== ''}
            <SheetRow label={language.mobileChat.translateInput} toggle={DBState.db.useAutoTranslateInput} onclick={() => { DBState.db.useAutoTranslateInput = !DBState.db.useAutoTranslateInput }}><LanguagesIcon size={19} /></SheetRow>
        {/if}
        {#if group}
            <SheetRow label={language.autoMode} toggle={generationStatus.autoMode} onclick={() => run(toggleGroupAutoMode)}><DicesIcon size={19} /></SheetRow>
        {/if}
    </SheetGroup>

    <SheetGroup>
        {#if showMemory}
            <SheetRow label={language.mobileChat.memory} onclick={() => run(openMemory)}><BrainIcon size={19} /></SheetRow>
        {/if}
        <SheetRow label={language.mobileChat.chatModules} trailing={chat?.modules?.length ? String(chat.modules.length) : ''} onclick={() => run(openModules)}><PackageIcon size={19} /></SheetRow>
        {#if DBState.db.showMenuChatList}
            <SheetRow label={language.chatList} onclick={() => run(onchatlist)}><DatabaseIcon size={19} /></SheetRow>
        {/if}
        <SheetRow label={language.screenshot} onclick={() => run(onscreenshot)}><CameraIcon size={19} /></SheetRow>
        {#if DBState.db.enableRisuaiProTools}
            <SheetRow label={language.easyPanel} onclick={() => run(() => { easyPanelStore.open = !easyPanelStore.open })}><SparkleIcon size={19} /></SheetRow>
        {/if}
        {#if canStopTts}
            <SheetRow label={language.ttsStop} onclick={() => run(stopTTS)}><MicOffIcon size={19} /></SheetRow>
        {/if}
        {#if DBState.db.sideMenuRerollButton}
            <SheetRow label={language.reroll} onclick={() => run(() => reroll(() => generate()))}><RefreshCwIcon size={19} /></SheetRow>
        {/if}
    </SheetGroup>

    {#if additionalChatMenu.length > 0}
        <SheetGroup label={language.mobileChat.plugins}>
            {#each additionalChatMenu as menu (menu)}
                <SheetRow label={menu.name} onclick={() => run(menu.callback)}><PluginDefinedIcon ico={menu} /></SheetRow>
            {/each}
        </SheetGroup>
    {/if}
</Sheet>
