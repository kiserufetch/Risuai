<script lang="ts">
    import '../../MobileChat/mobileChat.css'
    import { language } from 'src/lang'
    import { ColorSchemeTypeStore } from 'src/ts/gui/colorscheme'
    import { applySchemeTokens } from 'src/ts/chatCore/schemeTokens'
    import { DBState, OpenSpicyChatStore } from 'src/ts/stores.svelte'
    import RealmMain from '../../UI/Realm/RealmMain.svelte'
    import SpicyLibrary from './SpicyLibrary.svelte'

    // "Каталог" tab of the mobile shell (mockup A): one screen, a RisuRealm | SpicyChat
    // switch on top. The choice reuses OpenSpicyChatStore, like the desktop menu.

    let root: HTMLElement | null = $state(null)
    let scroller: HTMLElement | null = $state(null)

    $effect(() => {
        if (!root) {
            return
        }
        void JSON.stringify(DBState.db.colorScheme)
        const borderc = getComputedStyle(document.documentElement).getPropertyValue('--risu-theme-borderc').trim()
        applySchemeTokens(root, { borderc, type: $ColorSchemeTypeStore })
    })
</script>

<div bind:this={root} class="risu-mc-screen risu-mc-catalog absolute inset-0 flex flex-col" data-scheme={$ColorSchemeTypeStore}>
    <div bind:this={scroller} class="min-h-0 flex-1 overflow-y-auto overscroll-y-contain" style="padding-top: var(--safe-top, 0px);">
        <header class="flex flex-col gap-3.5 px-4 pb-3 pt-4">
            <h1 class="text-[26px] font-bold tracking-tight">{language.mobileCatalog.title}</h1>
            <div role="tablist" aria-label={language.mobileCatalog.title} class="grid grid-cols-2 gap-1 rounded-[14px] p-1" style="background: var(--mc-surface);">
                <button type="button" role="tab" aria-selected={!$OpenSpicyChatStore} class="h-9 rounded-[10px] text-[14px] font-semibold transition-colors" style={!$OpenSpicyChatStore ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => OpenSpicyChatStore.set(false)}>RisuRealm</button>
                <button type="button" role="tab" aria-selected={$OpenSpicyChatStore} class="h-9 rounded-[10px] text-[14px] font-semibold transition-colors" style={$OpenSpicyChatStore ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => OpenSpicyChatStore.set(true)}>SpicyChat</button>
            </div>
        </header>
        {#if $OpenSpicyChatStore}
            <div class="px-4 pb-6">
                <SpicyLibrary {scroller} />
            </div>
        {:else}
            <RealmMain />
        {/if}
    </div>
</div>
