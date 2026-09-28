<script lang="ts">
    import { tick, untrack } from 'svelte'
    import { ArrowDownIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { DBState, ScrollToMessageStore } from 'src/ts/stores.svelte'
    import type { character } from 'src/ts/storage/database.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'
    import { MessageWindow, isFolded, loadColdStorage, needsColdStorageLoad } from 'src/ts/chatCore/messageWindow.svelte'
    import { generationStatus, getErrorForCurrentChat } from 'src/ts/chatCore/generationStatus.svelte'
    import { getGreetingCounter, getGreetingText } from 'src/ts/chatCore/messageActions.svelte'
    import MessageItem from './MessageItem.svelte'
    import TypingIndicator from './TypingIndicator.svelte'
    import ErrorCard from './ErrorCard.svelte'
    import ChatIntro from './ChatIntro.svelte'

    // The scroller (spec §6.5): column-reverse keeps the bottom pinned while streaming,
    // newest messages come first in the DOM (hotkeys and user CSS rely on that).

    interface Props {
        topInset: number
        bottomInset: number
        onedit: (idx: number) => void
    }

    let { topInset, bottomInset, onedit }: Props = $props()

    const messageWindow = new MessageWindow()
    let scroller: HTMLDivElement | null = $state(null)
    let showToLatest = $state(false)
    let hasUnread = $state(false)
    let scrollingToMessage = $state(false)

    let chatKey = $derived(session.getChatKey())
    let char = $derived(session.getCharacter())
    let chat = $derived(session.getChat())
    let messages = $derived(session.getMessages())
    let total = $derived(messages.length)
    let group = $derived(char?.type === 'group')

    /** Chats.svelte performanceMode / activeStreamingIndex. */
    let streamingMode = $derived.by(() => {
        const configured = DBState.db.streamingDisplayOptimizationMode ?? 'off'
        return chat?.isStreaming ? chat.activeStreamingDisplayOptimizationMode ?? configured : configured
    })
    let activeStreamingIndex = $derived(streamingMode !== 'off' && chat?.isStreaming ? total - 1 : -1)

    let generatingHere = $derived(generationStatus.running && generationStatus.charIndex === session.getCharacterIndex())

    let entries = $derived.by(() => {
        const seen = new Set<string>()
        return messageWindow.visibleIndices(total).map((idx) => {
            let key = messages[idx]?.chatId ?? `idx:${idx}`
            if (seen.has(key)) {
                key = `${key}:${idx}`
            }
            seen.add(key)
            return { idx, key }
        })
    })

    let awaitingResponse = $derived.by(() => {
        const last = messages[total - 1]
        return !last || last.role === 'user' || (last.role === 'char' && !last.data)
    })

    let error = $derived(getErrorForCurrentChat())
    let greetingText = $derived(getGreetingText())
    let greetingHasPager = $derived(getGreetingCounter() !== null)

    function isAtBottom(): boolean {
        return !scroller || Math.abs(scroller.scrollTop) < 100
    }

    export function scrollToLatest(behavior: ScrollBehavior = 'instant') {
        hasUnread = false
        showToLatest = false
        scroller?.scrollTo({ top: 0, behavior })
    }

    // Chat switch: reset the window and land on the latest message.
    let previousKey: string | null = null
    $effect.pre(() => {
        const key = chatKey
        untrack(() => {
            if (previousKey !== null && previousKey !== key) {
                messageWindow.reset()
                hasUnread = false
                requestAnimationFrame(() => scrollToLatest('instant'))
            }
            previousKey = key
        })
    })

    // Chats.svelte autoscroll: the user's own message always, replies per settings.
    let previousLength = -1
    $effect.pre(() => {
        const length = total
        const key = chatKey
        untrack(() => {
            const grew = previousLength !== -1 && length > previousLength && key === previousKey
            previousLength = length
            if (!grew) {
                return
            }
            const last = messages[length - 1]
            const wasAtBottom = isAtBottom()
            if (last?.role === 'user') {
                requestAnimationFrame(() => scrollToLatest(wasAtBottom ? 'instant' : 'smooth'))
            } else if (last?.role === 'char' && DBState.db.autoScrollToNewMessage) {
                if (wasAtBottom || DBState.db.alwaysScrollToNewMessage) {
                    requestAnimationFrame(() => scrollToLatest('instant'))
                } else {
                    hasUnread = true
                }
            }
        })
    })

    function onscroll() {
        if (!scroller) {
            return
        }
        const fromTop = scroller.scrollHeight - scroller.clientHeight + scroller.scrollTop
        if (fromTop < 100) {
            messageWindow.loadOlder(total)
        }
        showToLatest = Math.abs(scroller.scrollTop) > 240
        if (isAtBottom()) {
            hasUnread = false
        }
    }

    // Bookmarks and "branched from" jump here (DefaultChatScreen.scrollToMessage).
    $effect(() => {
        if (ScrollToMessageStore.value === -1) {
            return
        }
        const index = ScrollToMessageStore.value
        ScrollToMessageStore.value = -1
        untrack(() => scrollToMessage(index))
    })

    function sleep(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }

    async function scrollToMessage(index: number) {
        scrollingToMessage = true
        try {
            messageWindow.ensureLoaded(index, total)
            await tick()
            let element: HTMLElement | null = null
            for (let i = 0; i < 50 && !element; i++) {
                element = scroller?.querySelector<HTMLElement>(`[data-chat-index="${index}"]`) ?? null
                if (!element) {
                    await sleep(100)
                }
            }
            if (!element) {
                return
            }
            element.scrollIntoView({ behavior: 'instant', block: 'start' })
            await sleep(50)
            element.scrollIntoView({ behavior: 'instant', block: 'start' })
            element.classList.add('ring-2', 'ring-blue-500')
            setTimeout(() => element?.classList.remove('ring-2', 'ring-blue-500'), 2000)
        } finally {
            scrollingToMessage = false
        }
    }
</script>

<div
    bind:this={scroller}
    class="default-chat-screen risu-mc-feed flex h-full w-full flex-col-reverse overflow-x-hidden overflow-y-auto overscroll-y-contain px-4"
    {onscroll}
>
    <div aria-hidden="true" class="shrink-0" style="height: {bottomInset}px;"></div>
    {#if error}
        <ErrorCard {error} />
    {:else if generatingHere && awaitingResponse}
        <TypingIndicator />
    {/if}
    {#if needsColdStorageLoad()}
        {#await loadColdStorage()}
            <div class="py-12 text-center text-[14px] italic text-(--mc-text2)">{language.loadingChatData}</div>
        {/await}
    {:else}
        {#key chatKey}
            <div class="risu-chat-body flex flex-col-reverse gap-6 pt-4">
                {#each entries as entry (entry.key)}
                    <MessageItem
                        idx={entry.idx}
                        message={messages[entry.idx]}
                        hashKey={entry.key}
                        totalLength={total}
                        isLatest={entry.idx === total - 1}
                        showActions={entry.idx === total - 1 && messages[entry.idx]?.role === 'char' && !messages[entry.idx]?.isComment && !generatingHere}
                        streaming={entry.idx === activeStreamingIndex && messages[entry.idx]?.role === 'char'}
                        {streamingMode}
                        {onedit}
                    />
                {/each}
            </div>
        {/key}
        {#if isFolded()}
            <div class="flex justify-center py-4">
                <button type="button" class="h-11 rounded-full px-5 text-[14px] active:scale-95" style="background: var(--mc-surface);" onclick={() => messageWindow.expandFolded()}>{language.loadMore}</button>
            </div>
        {/if}
        {#if !group && char && messageWindow.showsGreeting(total)}
            <div class="flex flex-col gap-4 pb-6">
                <ChatIntro char={char as character} empty={total === 0} />
                <MessageItem
                    idx={-1}
                    message={null}
                    {greetingText}
                    hashKey="greeting"
                    totalLength={total}
                    isLatest={total === 0}
                    showActions={greetingHasPager}
                    streaming={false}
                    {streamingMode}
                    {onedit}
                />
            </div>
        {/if}
    {/if}
    <div aria-hidden="true" class="shrink-0" style="height: {topInset}px;"></div>
</div>

{#if showToLatest || hasUnread}
    <button
        type="button"
        class="absolute right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border shadow-lg active:scale-95"
        style="bottom: {bottomInset + 12}px; background: var(--mc-surface); border-color: var(--mc-line); color: var(--mc-text);"
        aria-label={language.mobileChat.toLatest}
        onclick={() => scrollToLatest('smooth')}
    >
        <ArrowDownIcon size={19} />
        {#if hasUnread}
            <span class="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full" style="background: var(--mc-accent);"></span>
        {/if}
    </button>
{/if}

{#if scrollingToMessage}
    <div class="absolute inset-0 z-30 flex items-center justify-center text-[15px]" style="background: var(--mc-scrim); color: #fff;">{language.mobileChat.loadingOlder}</div>
{/if}
