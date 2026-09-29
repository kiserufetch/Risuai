<script lang="ts">
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import ModelRow from './ModelRow.svelte'

    // Auxiliary models (AuxModelSelectors.svelte): off means every helper task uses the sub model.

    const t = $derived(language.mobileBot)
</script>

<div class="flex flex-col gap-4">
    <FormGroup>
        <FormToggle label={language.seperateModelsForAxModels} hint={t.auxHint} bind:checked={DBState.db.seperateModelsForAxModels} />
        {#if DBState.db.seperateModelsForAxModels}
            <FormToggle label={language.doNotChangeSeperateModels} bind:checked={DBState.db.doNotChangeSeperateModels} />
        {/if}
    </FormGroup>
    {#if DBState.db.seperateModelsForAxModels}
        <FormGroup label={language.axModelsDef}>
            <ModelRow label={language.longTermMemory} bind:value={DBState.db.seperateModels.memory} blankable />
            <ModelRow label={language.translator} bind:value={DBState.db.seperateModels.translate} blankable />
            <ModelRow label={language.emotionImage} bind:value={DBState.db.seperateModels.emotion} blankable />
            <ModelRow label={language.others} bind:value={DBState.db.seperateModels.otherAx} blankable />
        </FormGroup>
    {/if}
</div>
