<script lang="ts">
    import './mobileChat.css'
    import { ColorSchemeTypeStore } from 'src/ts/gui/colorscheme'
    import { CharEmotion, DBState, selectedCharID } from 'src/ts/stores.svelte'
    import { getCustomBackground } from 'src/ts/util'
    import { applySchemeTokens } from 'src/ts/chatCore/schemeTokens'
    import * as session from 'src/ts/chatCore/session.svelte'
    import { getCurrentEmotionName, getPortraitSources, loadPanelHeight, portraitState, savePanelHeight } from 'src/ts/chatCore/portrait.svelte'
    import BackgroundDom from '../ChatScreens/BackgroundDom.svelte'
    import TransitionImage from '../ChatScreens/TransitionImage.svelte'
    import ChatHeader from './ChatHeader.svelte'
    import MessageFeed from './MessageFeed.svelte'
    import Composer from './Composer.svelte'
    import PluginSurfaces from './PluginSurfaces.svelte'
    import EmotionPortrait from './EmotionPortrait.svelte'
    import MessageEditor from './MessageEditor.svelte'
    import ToolsSheet from './ToolsSheet.svelte'
    import StickerSheet from './StickerSheet.svelte'
    import ChatList from '../Others/ChatList.svelte'
    import ModuleChatMenu from '../Setting/Pages/Module/ModuleChatMenu.svelte'
    import { MessageWindow } from 'src/ts/chatCore/messageWindow.svelte'
    import { takeChatScreenshot } from 'src/ts/chatCore/screenshot'
    import type { EditRequest } from './editRequest'
    import ChatsSheet from './Character/ChatsSheet.svelte'
    import CharacterProfile from './Character/CharacterProfile.svelte'
    import { chatOverlay } from 'src/ts/chatCore/chatList.svelte'
    import { onDestroy } from 'svelte'

    // Root of the new mobile chat (spec §6.4). Background layers bottom to top:
    // customBackground, BackgroundDom, the immersive portrait, then the feed.

    let root: HTMLElement | null = $state(null)

    // Leaving the chat closes its chats sheet / profile.
    onDestroy(() => {
        chatOverlay.view = 'none'
    })
    let headerHeight = $state(56)
    let composerHeight = $state(72)
    let portraitOccupied = $state(0)
    let editing = $state<EditRequest | null>(null)
    let toolsOpen = $state(false)
    let stickersOpen = $state(false)
    let chatListOpen = $state(false)
    let modulesOpen = $state(false)
    const messageWindow = new MessageWindow()
    let background = $state('')
    let lastBackground: string | null = null

    // Immersive mode (spec §5.9) replaces the Waifu theme on phones.
    let portrait = $state<string[]>([])
    let portraitRequest = 0
    let panelPercent = $state(loadPanelHeight())
    let dragging = false

    let char = $derived(session.getCharacter())
    let waifuTheme = $derived(DBState.db.theme === 'waifu' || DBState.db.theme === 'waifuMobile')
    let immersive = $derived(waifuTheme && !portraitState.hidden && portrait.length > 1)
    let emotionName = $derived(immersive ? getCurrentEmotionName($CharEmotion) : '')
    let floatingPortrait = $derived(!immersive && !!char && char.viewScreen !== 'none' && (char.type === 'group' || !char.inlayViewScreen))
    let panelStyle = $derived(DBState.db.textScreenColor
        ? `background: ${DBState.db.textScreenColor}cc;`
        : 'background: color-mix(in oklab, var(--mc-bg) 72%, transparent);')

    $effect(() => {
        if (!root) {
            return
        }
        void JSON.stringify(DBState.db.colorScheme)
        // The applied value, not the stored one: Lite builds force their own scheme.
        const borderc = getComputedStyle(document.documentElement).getPropertyValue('--risu-theme-borderc').trim()
        applySchemeTokens(root, { borderc, type: $ColorSchemeTypeStore })
    })

    $effect(() => {
        const source = DBState.db.customBackground ?? ''
        if (source === lastBackground) {
            return
        }
        lastBackground = source
        getCustomBackground(source).then((css) => {
            if (lastBackground === source) {
                background = css
            }
        })
    })

    $effect(() => {
        if (!waifuTheme) {
            portrait = []
            return
        }
        const emotions = $CharEmotion
        void $selectedCharID
        void char?.image
        void char?.viewScreen
        const request = ++portraitRequest
        getPortraitSources(emotions).then((sources) => {
            if (request === portraitRequest) {
                portrait = sources
            }
        })
    })

    function startDrag(event: PointerEvent) {
        event.preventDefault()
        dragging = true
        ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    }

    function drag(event: PointerEvent) {
        if (!dragging || !root) {
            return
        }
        const rect = root.getBoundingClientRect()
        const percent = ((rect.bottom - event.clientY) / rect.height) * 100
        panelPercent = Math.round(Math.min(90, Math.max(35, percent)))
    }

    function endDrag() {
        if (dragging) {
            dragging = false
            savePanelHeight(panelPercent)
        }
    }
</script>

<div bind:this={root} class="risu-mc-screen absolute inset-0 overflow-hidden" class:risu-mc-immersive={immersive} data-scheme={$ColorSchemeTypeStore} data-risu-swipe-edge-only>
    {#if background.length > 2}
        <div aria-hidden="true" class="absolute inset-0 bg-cover bg-center" style={background}></div>
    {/if}
    <BackgroundDom />
    {#if immersive}
        <div aria-hidden="true" class="risu-mc-stage absolute inset-x-0 top-0" style="bottom: {panelPercent * 0.5}%;">
            <TransitionImage classType="mobile" src={portrait} />
        </div>
    {/if}
    <div class="relative h-full w-full">
        {#if immersive}
            <section
                class="risu-mc-panel absolute inset-x-0 bottom-0 flex flex-col overflow-hidden rounded-t-[24px] border-t"
                style="height: {panelPercent}%; {panelStyle} -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); border-color: var(--mc-line);"
            >
                {#if emotionName}
                    <span class="absolute -top-9 left-4 rounded-full px-3 py-1 text-[12px]" style="background: var(--mc-glass); color: var(--mc-text);">{emotionName}</span>
                {/if}
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="flex h-6 shrink-0 touch-none cursor-ns-resize items-center justify-center" onpointerdown={startDrag} onpointermove={drag} onpointerup={endDrag} onpointercancel={endDrag}>
                    <span class="h-[5px] w-9 rounded-full" style="background: var(--mc-line);"></span>
                </div>
                <div class="relative min-h-0 flex-1">
                    <MessageFeed {messageWindow} topInset={8} bottomInset={composerHeight} onedit={(request) => { editing = request }} />
                </div>
            </section>
        {:else}
            <MessageFeed {messageWindow} topInset={headerHeight} bottomInset={composerHeight} onedit={(request) => { editing = request }} />
            {#if floatingPortrait}
                <EmotionPortrait top={headerHeight + 8} bind:occupied={portraitOccupied} />
            {/if}
        {/if}
        <ChatHeader bind:height={headerHeight} {immersive} canHidePortrait={waifuTheme && (immersive || portraitState.hidden)} />
        <Composer bind:height={composerHeight} onplus={() => { toolsOpen = true }} />
        <PluginSurfaces top={headerHeight + 12 + (floatingPortrait ? portraitOccupied + 8 : 0)} />
    </div>
    {#if editing}
        <MessageEditor request={editing} onclose={() => { editing = null }} />
    {/if}
    {#if toolsOpen}
        <ToolsSheet
            onclose={() => { toolsOpen = false }}
            onstickers={() => { stickersOpen = true }}
            onchatlist={() => { chatListOpen = true }}
            onmodules={() => { modulesOpen = true }}
            onscreenshot={() => takeChatScreenshot(messageWindow)}
        />
    {/if}
    {#if stickersOpen}
        <StickerSheet onclose={() => { stickersOpen = false }} />
    {/if}
    {#if chatOverlay.view === 'chats'}
        <ChatsSheet onclose={() => { chatOverlay.view = 'none' }} />
    {:else if chatOverlay.view === 'profile'}
        <CharacterProfile onclose={() => { chatOverlay.view = 'none' }} />
    {/if}
</div>
{#if chatListOpen}
    <ChatList close={() => { chatListOpen = false }} />
{:else if modulesOpen}
    <ModuleChatMenu close={() => { modulesOpen = false }} />
{/if}
