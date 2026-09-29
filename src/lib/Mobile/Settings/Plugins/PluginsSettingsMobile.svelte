<script lang="ts">
    import PluginEditor from './PluginEditor.svelte'
    import PluginList from './PluginList.svelte'
    import { pluginPage } from './pluginPage.svelte'

    // "Плагины" (SettingsMenuIndex 4): the list and a per-plugin settings page.
</script>

{#if pluginPage.current === 'edit'}
    <PluginEditor />
{:else}
    <PluginList />
{/if}
