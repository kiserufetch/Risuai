<script lang="ts">
    import { BookOpenIcon, ExternalLinkIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import TriggerV2List from 'src/lib/SideBars/Scripts/TriggerV2List.svelte'
    import { alertConfirm } from 'src/ts/alert'
    import { hubURL } from 'src/ts/characterCards'
    import { openURL } from 'src/ts/globalApi.svelte'
    import type { triggerscript } from 'src/ts/storage/database.svelte'
    import { DBState } from 'src/ts/stores.svelte'
    import { currentModule } from './modulePage.svelte'

    // Module triggers, as the profile's trigger tab: type switch, native Lua editor, the
    // visual V2 editor (the existing TriggerV2List, like in the profile) and V1 for old data.

    const s = $derived(language.mobileScripts)
    let m = $derived(currentModule())
    let triggers = $derived((m?.trigger ?? []) as triggerscript[])
    let kind = $derived.by(() => {
        const type = triggers[0]?.effect?.[0]?.type
        return type === 'triggerlua' ? 'lua' : type === 'v2Header' ? 'v2' : triggers.length === 0 ? 'none' : 'v1'
    })
    let showV1 = $derived(kind === 'v1' || !!DBState.db.showDeprecatedTriggerV1)
    const loadV1 = () => import('src/lib/SideBars/Scripts/TriggerV1List.svelte').then((mod) => mod.default)

    async function switchTo(next: 'v1' | 'v2' | 'lua') {
        if (!m || next === kind) return
        if (triggers.length > 0 && kind !== 'none' && !(await alertConfirm(language.triggerSwitchWarn))) return
        if (next === 'v1') m.trigger = []
        else if (next === 'v2') {
            m.trigger = [
                { comment: '', type: 'manual', conditions: [], effect: [{ type: 'v2Header', code: '', indent: 0 } as never] },
                { comment: 'New Event', type: 'manual', conditions: [], effect: [] },
            ]
        } else {
            m.trigger = [{ comment: '', type: 'start', conditions: [], effect: [{ type: 'triggerlua', code: '' } as never] }]
        }
    }
</script>

{#if m}
    <div class="flex flex-col gap-3">
        <div role="radiogroup" aria-label={s.triggerType} class="grid gap-1 rounded-[14px] p-1" style="background: var(--mc-surface); grid-template-columns: repeat({showV1 ? 3 : 2}, minmax(0, 1fr));">
            {#each [...(showV1 ? [['v1', s.legacyV1]] : []), ['v2', s.visual], ['lua', 'Lua']] as [key, label] (key)}
                <button type="button" role="radio" aria-checked={kind === key} class="h-[38px] rounded-[10px] text-[14px] font-semibold" style={kind === key ? 'background: var(--mc-line); color: var(--mc-text);' : 'color: var(--mc-text2);'} onclick={() => switchTo(key as 'v1' | 'v2' | 'lua')}>{label}</button>
            {/each}
        </div>
        <span class="px-1 text-[12px] text-(--mc-text2)">{s.switchHint}</span>

        {#if kind === 'lua' && m.trigger}
            {@const effect = m.trigger[0].effect[0] as { code: string }}
            <CodeField label="Lua" bind:value={effect.code} minRows={14} />
            <button type="button" class="flex min-h-[52px] items-center gap-3 rounded-2xl px-4 text-left text-[15px]" style="background: var(--mc-group);" onclick={() => openURL(hubURL + '/redirect/docs/lua')}>
                <BookOpenIcon size={20} class="text-(--mc-text2)" /><span class="flex-1">{s.luaDocs}</span><ExternalLinkIcon size={18} class="text-(--mc-text2)" />
            </button>
        {:else if kind === 'v2' && m.trigger}
            <div class="risu-mc-legacy"><TriggerV2List bind:value={m.trigger} lowLevelAble={m.lowLevelAccess} /></div>
        {:else if kind === 'v1' && m.trigger}
            <span class="px-1 text-[13px]" style="color: var(--mc-danger);">{language.triggerV1Warning}</span>
            {#await loadV1() then TriggerV1List}
                <div class="risu-mc-legacy"><TriggerV1List bind:value={m.trigger} lowLevelAble={m.lowLevelAccess} /></div>
            {/await}
        {:else}
            <span class="py-6 text-center text-[15px] text-(--mc-text2)">{language.mobileModules.noTriggers}</span>
        {/if}

        <FormGroup>
            <FormToggle label={language.lowLevelAccess} hint={language.mobileModules.lowLevelHint} bind:checked={() => !!m.lowLevelAccess, (v) => { m.lowLevelAccess = v }} />
        </FormGroup>
    </div>
{/if}
