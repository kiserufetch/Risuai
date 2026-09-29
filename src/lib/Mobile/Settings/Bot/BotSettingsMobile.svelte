<script lang="ts">
    import { Trash2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import ProfileRegexEntry from 'src/lib/MobileChat/Character/ProfileRegexEntry.svelte'
    import { alertConfirm } from 'src/ts/alert'
    import { DBState } from 'src/ts/stores.svelte'
    import BotAux from './BotAux.svelte'
    import BotFallback from './BotFallback.svelte'
    import BotFlags from './BotFlags.svelte'
    import BotModel from './BotModel.svelte'
    import BotMore from './BotMore.svelte'
    import BotPairs from './BotPairs.svelte'
    import BotParams from './BotParams.svelte'
    import BotPrompt from './BotPrompt.svelte'
    import BotPromptItem from './BotPromptItem.svelte'
    import BotPromptSettings from './BotPromptSettings.svelte'
    import BotRegex from './BotRegex.svelte'
    import BotRoot from './BotRoot.svelte'
    import BotSeparate from './BotSeparate.svelte'
    import { botPage } from './botPage.svelte'

    // "Чат-бот" (SettingsMenuIndex 1): a root with sub-pages; the settings frame's header
    // and system back step up through botPage.

    async function removeRegex() {
        const script = DBState.db.presetRegex[botPage.regexIndex]
        if (!script || !(await alertConfirm(`${language.removeConfirm}${script.comment || language.mobileScripts.unnamed}`))) return
        DBState.db.presetRegex.splice(botPage.regexIndex, 1)
        botPage.current = 'regex'
    }
</script>

{#key botPage.current}
    {#if botPage.current === 'model'}
        <BotModel />
    {:else if botPage.current === 'params'}
        <BotParams />
    {:else if botPage.current === 'separate'}
        <BotSeparate />
    {:else if botPage.current === 'prompt'}
        <BotPrompt />
    {:else if botPage.current === 'promptItem'}
        <BotPromptItem />
    {:else if botPage.current === 'promptSettings'}
        <BotPromptSettings />
    {:else if botPage.current === 'aux'}
        <BotAux />
    {:else if botPage.current === 'more'}
        <BotMore />
    {:else if botPage.current === 'bias'}
        <BotPairs kind="bias" />
    {:else if botPage.current === 'additional'}
        <BotPairs kind="additional" />
    {:else if botPage.current === 'flags'}
        <BotFlags />
    {:else if botPage.current === 'regex'}
        <BotRegex />
    {:else if botPage.current === 'regexEntry' && DBState.db.presetRegex[botPage.regexIndex]}
        <div class="flex flex-col gap-4">
            <ProfileRegexEntry script={DBState.db.presetRegex[botPage.regexIndex]} />
            <button type="button" class="flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold" style="background: color-mix(in oklab, var(--mc-danger) 14%, transparent); color: var(--mc-danger);" onclick={removeRegex}><Trash2Icon size={16} />{language.mobileBot.remove}</button>
        </div>
    {:else if botPage.current === 'module'}
        <div class="flex flex-col gap-3">
            <span class="px-2 text-[13px] leading-[18px] text-(--mc-text2)">{language.mobileBot.moduleHint}</span>
            <div class="overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                <FormText label={language.moduleIntergration} bind:value={DBState.db.moduleIntergration} placeholder="module1, module2" mono />
            </div>
        </div>
    {:else if botPage.current === 'fallback'}
        <BotFallback />
    {:else}
        <BotRoot />
    {/if}
{/key}
