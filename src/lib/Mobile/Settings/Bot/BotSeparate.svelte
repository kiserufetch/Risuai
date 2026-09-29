<script lang="ts">
    import { language } from 'src/lang'
    import AllSeperateParameters from 'src/lib/Others/AllSeperateParameters.svelte'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { DBState } from 'src/ts/stores.svelte'

    // Per-task parameters (SeparateParametersSection.svelte): a switch, then one card per
    // auxiliary task with the existing parameter editor inside.

    const t = $derived(language.mobileBot)
    const KEYS = [['memory', 'longTermMemory'], ['emotion', 'emotionImage'], ['translate', 'translator'], ['otherAx', 'others']] as const
    let open = $state('')
</script>

<div class="flex flex-col gap-4">
    <FormGroup>
        <FormToggle label={language.seperateParametersEnabled} hint={t.separateHint} bind:checked={DBState.db.seperateParametersEnabled} />
    </FormGroup>
    {#if DBState.db.seperateParametersEnabled}
        {#each KEYS as [key, labelKey] (key)}
            <div class="flex flex-col gap-2">
                <button type="button" class="flex min-h-[52px] items-center rounded-2xl px-4 text-left text-[15px]" style="background: var(--mc-group);" aria-expanded={open === key} onclick={() => { open = open === key ? '' : key }}>
                    <span class="flex-1">{language[labelKey]}</span>
                    <span class="text-(--mc-text2)">{open === key ? '−' : '+'}</span>
                </button>
                {#if open === key}
                    <div class="risu-mc-legacy flex flex-col px-1 text-textcolor">
                        <AllSeperateParameters bind:value={DBState.db.seperateParameters[key]} paramKey={key} />
                    </div>
                {/if}
            </div>
        {/each}
    {/if}
</div>
