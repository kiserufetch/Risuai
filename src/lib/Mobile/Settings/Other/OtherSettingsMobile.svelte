<script lang="ts">
    import { language } from 'src/lang'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import OtherHypaV3 from './OtherHypaV3.svelte'
    import OtherImage from './OtherImage.svelte'
    import OtherMemory from './OtherMemory.svelte'
    import OtherRoot from './OtherRoot.svelte'
    import OtherTts from './OtherTts.svelte'
    import { otherPage } from './otherPage.svelte'

    // "Другие боты" (SettingsMenuIndex 2): a root with sub-pages stepped back by the frame.

    let hypa = $derived(DBState.db.hypaV3Presets?.[DBState.db.hypaV3PresetId]?.settings)
</script>

{#key otherPage.current}
    {#if otherPage.current === 'memory'}
        <OtherMemory />
    {:else if otherPage.current === 'hypaV3'}
        <OtherHypaV3 />
    {:else if otherPage.current === 'hypaPrompts' && hypa}
        <div class="flex flex-col gap-3">
            <CodeField label={language.summarizationPrompt} bind:value={hypa.summarizationPrompt} placeholder={language.hypaV3Settings.supaMemoryPromptPlaceHolder} minRows={6} wrap />
            <CodeField label={language.reSummarizationPrompt} bind:value={hypa.reSummarizationPrompt} placeholder={language.hypaV3Settings.supaMemoryPromptPlaceHolder} minRows={6} wrap />
        </div>
    {:else if otherPage.current === 'image'}
        <OtherImage />
    {:else if otherPage.current === 'tts'}
        <OtherTts />
    {:else}
        <OtherRoot />
    {/if}
{/key}
