<script lang="ts">
    import './mobileChat.css'
    import { ColorSchemeTypeStore } from 'src/ts/gui/colorscheme'
    import { DBState } from 'src/ts/stores.svelte'
    import { getCustomBackground } from 'src/ts/util'
    import { applySchemeTokens } from 'src/ts/chatCore/schemeTokens'
    import BackgroundDom from '../ChatScreens/BackgroundDom.svelte'
    import ChatHeader from './ChatHeader.svelte'
    import MessageFeed from './MessageFeed.svelte'
    import Composer from './Composer.svelte'
    import PluginSurfaces from './PluginSurfaces.svelte'
    import MessageEditor from './MessageEditor.svelte'
    import ToolsSheet from './ToolsSheet.svelte'
    import StickerSheet from './StickerSheet.svelte'
    import ChatList from '../Others/ChatList.svelte'
    import ModuleChatMenu from '../Setting/Pages/Module/ModuleChatMenu.svelte'
    import { MessageWindow } from 'src/ts/chatCore/messageWindow.svelte'
    import { takeChatScreenshot } from 'src/ts/chatCore/screenshot'
    import type { EditRequest } from './editRequest'

    // Root of the new mobile chat (spec §6.4). Background layers bottom to top:
    // customBackground, BackgroundDom, then the feed.

    let root: HTMLElement | null = $state(null)
    let headerHeight = $state(56)
    let composerHeight = $state(72)
    let editing = $state<EditRequest | null>(null)
    let toolsOpen = $state(false)
    let stickersOpen = $state(false)
    let chatListOpen = $state(false)
    let modulesOpen = $state(false)
    const messageWindow = new MessageWindow()
    let background = $state('')
    let lastBackground: string | null = null

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
</script>

<div bind:this={root} class="risu-mc-screen absolute inset-0 overflow-hidden" data-scheme={$ColorSchemeTypeStore} data-risu-swipe-edge-only>
    {#if background.length > 2}
        <div aria-hidden="true" class="absolute inset-0 bg-cover bg-center" style={background}></div>
    {/if}
    <BackgroundDom />
    <div class="relative h-full w-full">
        <MessageFeed {messageWindow} topInset={headerHeight} bottomInset={composerHeight} onedit={(request) => { editing = request }} />
        <ChatHeader bind:height={headerHeight} />
        <Composer bind:height={composerHeight} onplus={() => { toolsOpen = true }} />
        <PluginSurfaces top={headerHeight + 12} />
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
</div>
{#if chatListOpen}
    <ChatList close={() => { chatListOpen = false }} />
{:else if modulesOpen}
    <ModuleChatMenu close={() => { modulesOpen = false }} />
{/if}
