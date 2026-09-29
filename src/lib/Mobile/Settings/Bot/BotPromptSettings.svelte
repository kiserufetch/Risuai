<script lang="ts">
    import { language } from 'src/lang'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormSelect from 'src/lib/MobileChat/Form/FormSelect.svelte'
    import FormStepper from 'src/lib/MobileChat/Form/FormStepper.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { defaultAutoSuggestPrompt } from 'src/ts/storage/defaultPrompts'
    import { DBState } from 'src/ts/stores.svelte'

    // Template settings (the "Settings" tab of PromptSettings.svelte), grouped: message
    // formatting, structured output, then the text fields.

    const t = $derived(language.mobileBot)
    const ROLES = [{ value: 'user', label: 'User' }, { value: 'system', label: 'System' }, { value: 'assistant', label: 'Assistant' }]
</script>

<div class="flex flex-col gap-4">
    <FormGroup label={t.formatting}>
        <FormText label={language.postEndInnerFormat} bind:value={DBState.db.promptSettings.postEndInnerFormat} mono />
        <FormToggle label={language.sendChatAsSystem} bind:checked={DBState.db.promptSettings.sendChatAsSystem} />
        <FormToggle label={language.formatGroupInSingle} bind:checked={DBState.db.promptSettings.sendName} />
        <FormToggle label={language.trimStartNewChat} bind:checked={DBState.db.promptSettings.trimStartNewChat} />
        <FormToggle label={language.utilOverride} bind:checked={DBState.db.promptSettings.utilOverride} />
        {#if DBState.db.showUnrecommended}
            <FormToggle label={language.customChainOfThought} bind:checked={DBState.db.promptSettings.customChainOfThought} />
        {/if}
        <FormStepper label={language.maxThoughtTagDepth} bind:value={() => DBState.db.promptSettings.maxThoughtTagDepth ?? -1, (v) => { DBState.db.promptSettings.maxThoughtTagDepth = v }} />
        <FormSelect label={language.groupOtherBotRole} bind:value={DBState.db.groupOtherBotRole} options={ROLES} />
        <FormSelect label={language.systemRoleReplacement} bind:value={DBState.db.systemRoleReplacement} options={ROLES.filter((r) => r.value !== 'system')} />
    </FormGroup>

    <FormGroup label={t.output}>
        <FormToggle label={language.outputImageModal} bind:checked={DBState.db.outputImageModal} />
        <FormToggle label={language.enableJsonSchema} bind:checked={DBState.db.jsonSchemaEnabled} />
        <FormToggle label={language.strictJsonSchema} bind:checked={DBState.db.strictJsonSchema} />
        {#if DBState.db.jsonSchemaEnabled}
            <FormText label={language.extractJson} bind:value={DBState.db.extractJson} mono />
        {/if}
    </FormGroup>
    {#if DBState.db.jsonSchemaEnabled}
        <CodeField label={language.jsonSchema} bind:value={DBState.db.jsonSchema} minRows={6} />
    {/if}

    <CodeField label={language.customPromptTemplateToggle} bind:value={DBState.db.customPromptTemplateToggle} minRows={3} wrap />
    <CodeField label={language.defaultVariables} bind:value={DBState.db.templateDefaultVariables} minRows={3} wrap />
    <CodeField label={language.groupInnerFormat} bind:value={DBState.db.groupTemplate} placeholder={"<{{char}}'s Message>\n{{slot}}\n</{{char}}'s Message>"} minRows={3} wrap />
    <CodeField label={language.systemContentReplacement} bind:value={DBState.db.systemContentReplacement} minRows={3} wrap />
    <CodeField label={language.autoSuggest} bind:value={DBState.db.autoSuggestPrompt} placeholder={defaultAutoSuggestPrompt} minRows={3} wrap />
    <CodeField label={language.predictedOutput} bind:value={DBState.db.OAIPrediction} minRows={3} wrap />
</div>
