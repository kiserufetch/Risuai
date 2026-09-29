<script lang="ts">
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import KeyInput from '../Bot/KeyInput.svelte'
    import { ttsKeys } from './tts'

    // Mockup "Озвучка": auto speech, service keys, the VOICEVOX address.

    const t = $derived(language.mobileOther)
    const keys = ttsKeys()
</script>

<div class="flex flex-col gap-4">
    <FormGroup>
        <FormToggle label={t.autoSpeech} hint={t.autoSpeechHint} bind:checked={DBState.db.ttsAutoSpeech} />
    </FormGroup>
    <FormGroup label={t.serviceKeys}>
        {#each keys as field (field.id)}<KeyInput {field} />{/each}
    </FormGroup>
    <FormGroup>
        <FormText label="VOICEVOX URL" bind:value={DBState.db.voicevoxUrl} placeholder="http://127.0.0.1:50021" mono />
    </FormGroup>
    <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{t.voiceHint}</span>
</div>
