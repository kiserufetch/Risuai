<script lang="ts">
    import PersonaEditor from './PersonaEditor.svelte'
    import PersonaList from './PersonaList.svelte'
    import { personaPage } from './personas.svelte'

    // "Персоны" (SettingsMenuIndex 12): the list and a per-persona editor page; the
    // settings frame titles the header and steps back through personaPage.
</script>

{#if personaPage.current === 'edit'}
    <PersonaEditor />
{:else}
    <PersonaList />
{/if}
