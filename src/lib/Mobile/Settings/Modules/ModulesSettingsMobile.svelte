<script lang="ts">
    import { Trash2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import CodeField from 'src/lib/MobileChat/Character/CodeField.svelte'
    import ProfileLoreEntry from 'src/lib/MobileChat/Character/ProfileLoreEntry.svelte'
    import ProfileLorebook from 'src/lib/MobileChat/Character/ProfileLorebook.svelte'
    import ProfileRegexEntry from 'src/lib/MobileChat/Character/ProfileRegexEntry.svelte'
    import { alertConfirm } from 'src/ts/alert'
    import { refreshModules } from 'src/ts/process/modules'
    import { onDestroy } from 'svelte'
    import RegexScripts from '../RegexScripts.svelte'
    import ModuleAssets from './ModuleAssets.svelte'
    import ModuleEditor from './ModuleEditor.svelte'
    import ModuleList from './ModuleList.svelte'
    import ModuleTriggers from './ModuleTriggers.svelte'
    import { currentModule, modulePage } from './modulePage.svelte'

    // "Модули" (SettingsMenuIndex 14): list, module editor and its parts. Lorebook and regex
    // reuse the profile's native screens over the module's lists. Modules are reloaded on
    // leaving, as ModuleSettings.svelte does.

    onDestroy(() => refreshModules())

    let m = $derived(currentModule())

    async function removeRegex() {
        const list = m?.regex
        const script = list?.[modulePage.regexIndex]
        if (!list || !script || !(await alertConfirm(`${language.removeConfirm}${script.comment || language.mobileScripts.unnamed}`))) return
        list.splice(modulePage.regexIndex, 1)
        modulePage.current = 'regex'
    }
</script>

{#key modulePage.current}
    {#if modulePage.current === 'edit'}
        <ModuleEditor />
    {:else if modulePage.current === 'lore' && m?.lorebook}
        <ProfileLorebook external={m.lorebook} onopen={(book) => { modulePage.book = book; modulePage.current = 'loreEntry' }} />
    {:else if modulePage.current === 'loreEntry' && modulePage.book}
        <ProfileLoreEntry book={modulePage.book} />
    {:else if modulePage.current === 'regex' && m?.regex}
        <div class="flex flex-col gap-4">
            <RegexScripts scripts={m.regex} hint={language.mobileModules.regexHint} onopen={(i) => { modulePage.regexIndex = i; modulePage.current = 'regexEntry' }} onreplace={(next) => { if (m) m.regex = next }} />
            <CodeField label={language.backgroundHTML} bind:value={() => m.backgroundEmbedding ?? '', (v) => { m.backgroundEmbedding = v }} minRows={5} />
        </div>
    {:else if modulePage.current === 'regexEntry' && m?.regex?.[modulePage.regexIndex]}
        <div class="flex flex-col gap-4">
            <ProfileRegexEntry script={m.regex[modulePage.regexIndex]} />
            <button type="button" class="flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold" style="background: color-mix(in oklab, var(--mc-danger) 14%, transparent); color: var(--mc-danger);" onclick={removeRegex}><Trash2Icon size={16} />{language.mobileBot.remove}</button>
        </div>
    {:else if modulePage.current === 'triggers'}
        <ModuleTriggers />
    {:else if modulePage.current === 'assets'}
        <ModuleAssets />
    {:else}
        <ModuleList />
    {/if}
{/key}
