<script lang="ts">
    import {
        BookmarkIcon, BotIcon, CopyIcon, EyeIcon, EyeOffIcon, LanguagesIcon, PencilIcon,
        RefreshCwIcon, ScissorsIcon, SplitIcon, Trash2Icon, ListXIcon, Volume2Icon,
    } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState } from 'src/ts/stores.svelte'
    import { ConnectionOpenStore } from 'src/ts/sync/multiuser'
    import type { Message } from 'src/ts/storage/database.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'
    import {
        branchFromMessage, isBookmarked, removeMessage, removeMessagesFrom, showGenerationInfo,
        speakMessage, toggleBookmark, toggleHidden, toggleHiddenBefore,
    } from 'src/ts/chatCore/messageActions.svelte'
    import Sheet from './Sheet.svelte'
    import SheetTile from './SheetTile.svelte'
    import SheetRow from './SheetRow.svelte'
    import SheetGroup from './SheetGroup.svelte'

    // Long-press sheet (spec §5.3). The greeting gets copy/translate/speak only,
    // a branch marker gets remove only.

    interface Props {
        idx: number
        message: Message | null
        text: string
        avatarCss: string
        speakerName: string
        translated: boolean
        branchMarker: boolean
        oncopy: () => void
        onedit: () => void
        onedittranslation: () => void
        ontranslate: () => void
        onretranslate: () => void
        onclose: () => void
    }

    let {
        idx, message, text, avatarCss, speakerName, translated, branchMarker,
        oncopy, onedit, onedittranslation, ontranslate, onretranslate, onclose,
    }: Props = $props()

    let greeting = $derived(idx === -1)
    let char = $derived(session.getCharacter())
    let canSpeak = $derived(char?.type !== 'group' && !!char?.ttsMode && char.ttsMode !== 'none')
    let canTranslate = $derived(DBState.db.translator !== '')
    let llmTranslated = $derived(DBState.db.translatorType === 'llm' && translated)
    let canRemove = $derived(!greeting && !$ConnectionOpenStore)
    let bookmarked = $derived(isBookmarked(idx))

    function run(action: () => unknown) {
        onclose()
        action()
    }
</script>

<Sheet open={true} label={language.mobileChat.messageActions} {onclose}>
    <div class="flex items-center gap-3 px-1">
        <span class="h-9 w-9 shrink-0 rounded-full bg-cover bg-center" style="{avatarCss || 'background: var(--mc-group);'}"></span>
        <span class="flex min-w-0 flex-col">
            <span class="truncate text-[14px] font-semibold">{speakerName}</span>
            <span class="line-clamp-2 text-[13px] text-(--mc-text2)">{text}</span>
        </span>
    </div>

    {#if branchMarker}
        <SheetGroup>
            <SheetRow label={language.remove} danger onclick={() => run(() => removeMessage(idx))}><Trash2Icon size={19} /></SheetRow>
        </SheetGroup>
    {:else}
        <div class="flex gap-2">
            <SheetTile label={language.copy} onclick={() => run(oncopy)}><CopyIcon size={20} /></SheetTile>
            {#if !greeting}
                <SheetTile label={language.edit} onclick={() => run(onedit)}><PencilIcon size={20} /></SheetTile>
            {/if}
            {#if canTranslate}
                <SheetTile label={translated ? language.mobileChat.showOriginal : language.translate} active={translated} onclick={() => run(ontranslate)}><LanguagesIcon size={20} /></SheetTile>
            {/if}
            {#if canSpeak}
                <SheetTile label={language.mobileChat.speak} onclick={() => run(() => speakMessage(text))}><Volume2Icon size={20} /></SheetTile>
            {/if}
        </div>

        {#if !greeting}
            <SheetGroup>
                <SheetRow label={language.mobileChat.branchFromHere} onclick={() => run(() => branchFromMessage(idx))}><SplitIcon size={19} /></SheetRow>
                {#if DBState.db.enableBookmark}
                    <SheetRow label={bookmarked ? language.mobileChat.removeBookmark : language.mobileChat.addBookmark} onclick={() => run(() => toggleBookmark(idx))}><BookmarkIcon size={19} /></SheetRow>
                {/if}
                <SheetRow label={message?.disabled === true ? language.mobileChat.unhideFromAi : language.mobileChat.hideFromAi} onclick={() => run(() => toggleHidden(idx))}>
                    {#if message?.disabled === true}<EyeIcon size={19} />{:else}<EyeOffIcon size={19} />{/if}
                </SheetRow>
                <SheetRow label={message?.disabled === 'allBefore' ? language.mobileChat.unhideBeforeFromAi : language.mobileChat.hideBeforeFromAi} onclick={() => run(() => toggleHiddenBefore(idx))}><ScissorsIcon size={19} /></SheetRow>
                {#if llmTranslated}
                    <SheetRow label={language.retranslate} onclick={() => run(onretranslate)}><RefreshCwIcon size={19} /></SheetRow>
                    <SheetRow label={language.mobileChat.editTranslation} onclick={() => run(onedittranslation)}><PencilIcon size={19} /></SheetRow>
                {/if}
                {#if message?.generationInfo}
                    <SheetRow label={language.mobileChat.generationInfo} onclick={() => run(() => showGenerationInfo(idx, message.generationInfo))}><BotIcon size={19} /></SheetRow>
                {/if}
            </SheetGroup>
        {/if}

        {#if canRemove}
            <SheetGroup>
                <SheetRow label={language.remove} danger onclick={() => run(() => removeMessage(idx))}><Trash2Icon size={19} /></SheetRow>
                <SheetRow label={language.mobileChat.removeFromHere} danger onclick={() => run(() => removeMessagesFrom(idx))}><ListXIcon size={19} /></SheetRow>
            </SheetGroup>
        {/if}
    {/if}
</Sheet>
