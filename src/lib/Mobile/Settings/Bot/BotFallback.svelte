<script lang="ts">
    import { PlusIcon, Trash2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import ModelRow from './ModelRow.svelte'

    // Fallback models (PromptSettings.svelte): tried in order when a request fails.

    const t = $derived(language.mobileBot)
    const KINDS = [['model', 'mainModel'], ['memory', 'fbMemory'], ['translate', 'fbTranslate'], ['emotion', 'fbEmotion'], ['otherAx', 'fbOther']] as const
</script>

<div class="flex flex-col gap-4">
    <FormGroup>
        <FormToggle label={language.fallbackWhenBlankResponse} bind:checked={DBState.db.fallbackWhenBlankResponse} />
        <FormToggle label={language.doNotChangeFallbackModels} bind:checked={DBState.db.doNotChangeFallbackModels} />
    </FormGroup>
    {#each KINDS as [kind, labelKey] (kind)}
        {@const list = DBState.db.fallbackModels[kind] ?? []}
        <FormGroup label={t[labelKey]}>
            {#each list as _, i (i)}
                <div class="flex items-center">
                    <div class="min-w-0 flex-1"><ModelRow label="{t.fallbackN} {i + 1}" bind:value={DBState.db.fallbackModels[kind][i]} blankable /></div>
                    <button type="button" class="mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style="color: var(--mc-danger);" aria-label={t.remove} onclick={() => { DBState.db.fallbackModels[kind].splice(i, 1) }}><Trash2Icon size={18} /></button>
                </div>
            {/each}
            <button type="button" class="flex min-h-[52px] w-full items-center gap-2 px-4 text-[15px] font-medium" style="color: var(--mc-accent);" onclick={() => { DBState.db.fallbackModels[kind] = [...list, ''] }}><PlusIcon size={18} />{t.addModel}</button>
        </FormGroup>
    {/each}
</div>
