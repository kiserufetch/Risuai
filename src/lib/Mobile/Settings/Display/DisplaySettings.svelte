<script lang="ts">
    import DisplayChat from './DisplayChat.svelte'
    import DisplayCss from './DisplayCss.svelte'
    import DisplayInterface from './DisplayInterface.svelte'
    import DisplayLook from './DisplayLook.svelte'
    import DisplayRoot from './DisplayRoot.svelte'
    import DisplaySound from './DisplaySound.svelte'
    import DisplayText from './DisplayText.svelte'
    import { displayPage } from './displayPage.svelte'

    // "Экран и звук" (SettingsMenuIndex 3): a root with sub-pages; the frame's header
    // and system back step up through displayPage.
</script>

{#key displayPage.current}
    {#if displayPage.current === 'look'}
        <DisplayLook />
    {:else if displayPage.current === 'chat'}
        <DisplayChat />
    {:else if displayPage.current === 'text'}
        <DisplayText />
    {:else if displayPage.current === 'sound'}
        <DisplaySound />
    {:else if displayPage.current === 'interface'}
        <DisplayInterface />
    {:else if displayPage.current === 'css'}
        <DisplayCss />
    {:else}
        <DisplayRoot />
    {/if}
{/key}
