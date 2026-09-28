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
    import MessageEditor from './MessageEditor.svelte'

    // Root of the new mobile chat (spec §6.4). Background layers bottom to top:
    // customBackground, BackgroundDom, then the feed.

    let root: HTMLElement | null = $state(null)
    let headerHeight = $state(56)
    let composerHeight = $state(72)
    let editingIdx = $state<number | null>(null)
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

<div bind:this={root} class="risu-mc-screen absolute inset-0 overflow-hidden" data-scheme={$ColorSchemeTypeStore}>
    {#if background.length > 2}
        <div aria-hidden="true" class="absolute inset-0 bg-cover bg-center" style={background}></div>
    {/if}
    <BackgroundDom />
    <div class="relative h-full w-full">
        <MessageFeed topInset={headerHeight} bottomInset={composerHeight} onedit={(idx) => { editingIdx = idx }} />
        <ChatHeader bind:height={headerHeight} />
        <Composer bind:height={composerHeight} />
    </div>
    {#if editingIdx !== null}
        <MessageEditor idx={editingIdx} onclose={() => { editingIdx = null }} />
    {/if}
</div>
