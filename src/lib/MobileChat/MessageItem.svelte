<script lang="ts">
    import { BotIcon, EyeOffIcon, GitBranchIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { getCharImage } from 'src/ts/characters'
    import { aiLawApplies, changeChatTo, foldChatToMessage } from 'src/ts/globalApi.svelte'
    import { getModelInfo } from 'src/ts/model/modellist'
    import { DBState, HideIconStore, ReloadChatPointer, createSimpleCharacter } from 'src/ts/stores.svelte'
    import { ConnectionOpenStore } from 'src/ts/sync/multiuser'
    import { capitalize } from 'src/ts/util'
    import { haptic } from 'src/ts/gui/haptics'
    import { longpress } from 'src/ts/gui/longtouch'
    import { getLLMCache } from 'src/ts/translator/translator'
    import type { Message } from 'src/ts/storage/database.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'
    import { handleScriptedClick } from 'src/ts/chatCore/scriptedClicks'
    import { getTranslationCacheKey, isBlankMessage, prepareDisplayText } from 'src/ts/chatCore/messageRender'
    import { removeMessage, showGenerationInfo, speakMessage } from 'src/ts/chatCore/messageActions.svelte'
    import { copyMessage } from 'src/ts/chatCore/copyMessage'
    import MessageBody from './MessageBody.svelte'
    import ActionBar from './ActionBar.svelte'
    import CustomHtmlMessage from './CustomHtmlMessage.svelte'
    import MessageActionsSheet from './MessageActionsSheet.svelte'
    import ReplyMeta from './ReplyMeta.svelte'
    import type { EditRequest } from './editRequest'

    // One feed entry (spec §4.2, §6.4, §7.2): .chat-message-container > .risu-chat.
    // `message` is null for the greeting (index -1).

    interface Props {
        idx: number
        message: Message | null
        greetingText?: string
        hashKey: string
        /** Chats.svelte: the last messages re-render when the chat length changes. */
        totalLength: number
        showActions: boolean
        isLatest: boolean
        streaming: boolean
        streamingMode: string
        onedit: (request: EditRequest) => void
    }

    let { idx, message, greetingText = '', hashKey, totalLength, showActions, isLatest, streaming, streamingMode, onedit }: Props = $props()

    let greeting = $derived(idx === -1)
    let role = $derived(greeting ? 'char' : message?.role ?? null)
    let text = $derived(greeting ? greetingText : message?.data ?? '')
    let isComment = $derived(message?.isComment ?? false)
    let blank = $derived(isBlankMessage(text, idx, isComment))
    let speaker = $derived(session.getSpeaker(greeting ? undefined : message))
    let renderName = $derived(session.getRenderName(greeting ? undefined : message))
    let character = $derived(createSimpleCharacter(session.getCharacter()))
    let generationInfo = $derived(message?.generationInfo ?? null)
    let modelShortName = $derived(generationInfo ? getModelInfo(generationInfo.model).shortName ?? '' : '')
    let showModelBadge = $derived(!!generationInfo && (DBState.db.requestInfoInsideChat || aiLawApplies()))
    let renderKey = $derived(idx > totalLength - 6 ? totalLength : 0)
    let isUser = $derived(role === 'user')
    let showIdentity = $derived(!$HideIconStore)

    let translated = $state(false)
    let retranslate = $state(false)
    let msgDisplay = $state('')
    /** Bumped after a translation edit so the body re-renders from the cache. */
    let revision = $state(0)
    let sheetOpen = $state(false)
    let sheetAvatar = $state('')

    // Comments (branch markers) only get the CBS pass, like Chat.svelte displaya.
    $effect.pre(() => {
        if (isComment) {
            msgDisplay = prepareDisplayText(text, { name: renderName, idx, firstMessage: false })
        }
    })

    function avatarCss(image: string) {
        return getCharImage(image, 'css')
    }

    function copy() {
        haptic(6)
        copyMessage({
            copyText: msgDisplay,
            idx,
            firstMessage: greeting,
            role,
            senderName: speaker.name,
            modelLabel: generationInfo ? capitalize(modelShortName) : null,
            characterImage: speaker.image,
        })
    }

    function edit() {
        onedit({ kind: 'message', idx })
    }

    function tapToEdit() {
        if (DBState.db.clickToEdit && idx > -1 && !streaming) {
            edit()
        }
    }

    async function editTranslation() {
        const key = await getTranslationCacheKey(msgDisplay, { character, idx, firstMessage: greeting })
        const cached = await getLLMCache(key)
        onedit({ kind: 'translation', idx, key, text: cached ?? '', onsaved: () => { revision += 1 } })
    }

    async function openSheet() {
        if (streaming || (blank && !isComment)) {
            return
        }
        window.getSelection()?.removeAllRanges()
        sheetAvatar = await avatarCss(speaker.image)
        sheetOpen = true
    }

    function openBranchSource(parts: string[]) {
        changeChatTo(parts[2] ?? '')
        foldChatToMessage(parts[4])
    }
</script>

{#snippet avatar(size: number)}
    {#await avatarCss(speaker.image)}
        <span class="shrink-0 rounded-full" style="width:{size}px;height:{size}px;background:var(--mc-group);"></span>
    {:then css}
        <span class="shrink-0 rounded-full bg-cover bg-center" style="{css || 'background:var(--mc-group);'}width:{size}px;height:{size}px;"></span>
    {/await}
{/snippet}

{#snippet body()}
    <MessageBody {idx} {text} {role} name={renderName} {character} firstMessage={greeting} {modelShortName} renderKey={`${renderKey}|${revision}`} {streaming} {streamingMode} bind:translated bind:retranslate bind:msgDisplay ontap={tapToEdit} />
{/snippet}

{#snippet modelBadge()}
    {#if showModelBadge}
        <button type="button" class="ml-auto flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] text-(--mc-text2)" style="background: var(--mc-surface);" onclick={() => showGenerationInfo(idx, generationInfo)}>
            <BotIcon size={13} />
            {capitalize(modelShortName)}
        </button>
    {/if}
{/snippet}

{#snippet actions()}
    {#if showActions}
        <ActionBar {greeting} oncopy={copy} onedit={edit} onmore={openSheet} onspeak={() => speakMessage(text)} />
    {/if}
{/snippet}

{#snippet customIcon()}
    {#if showIdentity}
        {@render avatar(40)}
    {/if}
{/snippet}

<div class="chat-message-container" {...{ 'x-hashed': hashKey }}>
    {#key $ReloadChatPointer[idx] ?? 0}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="risu-chat risu-mc-message flex max-w-full flex-col"
            class:risu-mc-user={isUser}
            class:risu-mc-char={!isUser}
            class:risu-mc-hidden={!!message?.disabled}
            data-chat-index={idx}
            data-chat-id={message?.chatId ?? ''}
            onclickcapture={(event) => handleScriptedClick(event, idx)}
            use:longpress={openSheet}
        >
            {#if isComment}
                {#if msgDisplay.startsWith('{{specialcomment')}
                    {@const parts = msgDisplay.split('::')}
                    {#if parts[1] === 'branchedfrom'}
                        <button type="button" class="risu-mc-branch mx-auto flex min-h-11 items-center gap-2 rounded-full px-4 text-[13px] text-(--mc-text2) active:scale-95" style="background: var(--mc-surface);" onclick={() => openBranchSource(parts)}>
                            <GitBranchIcon size={16} />
                            <span>{language.branchedText.replace('{}', parts[3] ?? '')}</span>
                        </button>
                    {/if}
                {:else}
                    <div class="text-center text-[13px] italic text-(--mc-text2)">{msgDisplay}</div>
                {/if}
            {:else if blank}
                <div class="text-center text-[14px] italic text-(--mc-text2)">{language.noMessage}</div>
            {:else if DBState.db.theme === 'customHTML'}
                <CustomHtmlMessage {idx} firstMessage={greeting} textBox={body} icon={customIcon} buttons={actions} genInfo={modelBadge} />
            {:else}
                {#if isUser}
                    {#if showIdentity && $ConnectionOpenStore && message?.name}
                        <span class="mb-1 self-end text-[12px] text-(--mc-text2)">{message.name}</span>
                    {/if}
                    <div class="risu-mc-bubble ml-14 self-end" style="background: var(--mc-bubble); border-radius: 20px 20px 6px 20px; padding: 10px 14px; max-width: calc(100% - 56px);">
                        {@render body()}
                    </div>
                {:else}
                    {#if showIdentity}
                        <div class="mb-1.5 flex min-h-7 items-center gap-2">
                            {@render avatar(28)}
                            <span class="min-w-0 truncate text-[14px] font-semibold text-(--mc-text)">{speaker.name}</span>
                            {#if greeting}
                                <span class="shrink-0 rounded-full px-2 py-0.5 text-[11px] text-(--mc-text2)" style="background: var(--mc-surface);">{language.mobileChat.greeting}</span>
                            {/if}
                            {@render modelBadge()}
                        </div>
                    {/if}
                    <div class="min-w-0">
                        {@render body()}
                    </div>
                    {#if message && !greeting}
                        <ReplyMeta {message} {isLatest} {streaming} />
                    {/if}
                {/if}
                {#if message?.disabled}
                    <span class="mt-1 flex items-center gap-1 text-[12px] text-(--mc-text2)" class:self-end={isUser}>
                        <EyeOffIcon size={13} />
                        {message.disabled === 'allBefore' ? language.mobileChat.hiddenBeforeFromAi : language.mobileChat.hiddenFromAi}
                    </span>
                {/if}
                {@render actions()}
            {/if}
            {#if isLatest}
                <!-- Hotkey stand-ins (hotkey.ts clicks these; they need no visible UI). -->
                <span class="hidden" aria-hidden="true">
                    {#if DBState.db.translator !== '' && !blank && !streaming}
                        <button type="button" tabindex="-1" class="button-icon-translate" aria-label={language.translate} onclick={() => { translated = !translated }}></button>
                    {/if}
                    {#if idx > -1 && !$ConnectionOpenStore}
                        <button type="button" tabindex="-1" class="button-icon-remove" aria-label={language.remove} onclick={() => removeMessage(idx)}></button>
                    {/if}
                </span>
            {/if}
        </div>
    {/key}
    {#if sheetOpen}
        <MessageActionsSheet
            {idx}
            {message}
            {text}
            avatarCss={sheetAvatar}
            speakerName={speaker.name}
            {translated}
            branchMarker={isComment}
            oncopy={copy}
            onedit={edit}
            onedittranslation={editTranslation}
            ontranslate={() => { translated = !translated }}
            onretranslate={() => { retranslate = true }}
            onclose={() => { sheetOpen = false }}
        />
    {/if}
</div>

<style>
    .risu-mc-hidden :global(.chattext) {
        opacity: 0.55;
    }
</style>
