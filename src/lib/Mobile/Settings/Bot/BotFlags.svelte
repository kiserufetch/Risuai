<script lang="ts">
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { LLMFlags } from 'src/ts/model/types'
    import { DBState } from 'src/ts/stores.svelte'

    // Custom model flags (the "customFlags" accordion of BotSettings.svelte) as switches.

    const t = $derived(language.mobileBot)
    const FLAGS = [
        'hasImageInput', 'hasImageOutput', 'hasAudioInput', 'hasAudioOutput', 'hasPrefill', 'hasCache', 'hasFullSystemPrompt',
        'hasFirstSystemPrompt', 'hasStreaming', 'requiresAlternateRole', 'mustStartWithUserInput', 'hasVideoInput', 'OAICompletionTokens',
        'DeveloperRole', 'geminiThinking', 'geminiBlockOff', 'deepSeekPrefix', 'deepSeekThinkingInput', 'deepSeekThinkingOutput',
        'noCivilIntegrity', 'claudeThinking', 'claudeAdaptiveThinking', 'claudeXHighEffort', 'deepSeekThinkingToggle',
    ] as const

    function setFlag(flag: LLMFlags, on: boolean) {
        const rest = DBState.db.customFlags.filter((f) => f !== flag)
        DBState.db.customFlags = on ? [...rest, flag] : rest
    }
</script>

<div class="flex flex-col gap-4">
    <FormGroup>
        <FormToggle label={language.enableCustomFlags} hint={t.flagsHint} bind:checked={DBState.db.enableCustomFlags} />
    </FormGroup>
    {#if DBState.db.enableCustomFlags}
        <FormGroup>
            {#each FLAGS as name (name)}
                <FormToggle label={name} checked={DBState.db.customFlags.includes(LLMFlags[name])} onchange={(on) => setFlag(LLMFlags[name], on)} />
            {/each}
        </FormGroup>
    {/if}
</div>
