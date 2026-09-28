<script lang="ts" module>
    export type AdvancedSection =
        | 'root' | 'greetings' | 'example' | 'depth' | 'system' | 'globalNote' | 'additional'
        | 'bias' | 'creatorNotes' | 'meta' | 'variables' | 'personality' | 'memory'
</script>

<script lang="ts">
    import { ArrowDownIcon, ArrowUpIcon, BrainIcon, PackageIcon, PackagePlusIcon, Trash2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertNormal, showHypaV2Alert } from 'src/ts/alert'
    import { convertCharacterToModule } from 'src/ts/interchangeability'
    import { applyModule } from 'src/ts/process/modules'
    import type { character, groupChat } from 'src/ts/storage/database.svelte'
    import { DBState, hypaV3ModalOpen } from 'src/ts/stores.svelte'
    import { parseMultilangString } from 'src/ts/util'
    import * as session from 'src/ts/chatCore/session.svelte'
    import MultiLangInput from '../../UI/GUI/MultiLangInput.svelte'
    import FormGroup from '../Form/FormGroup.svelte'
    import FormNav from '../Form/FormNav.svelte'
    import FormNumber from '../Form/FormNumber.svelte'
    import FormText from '../Form/FormText.svelte'
    import FormToggle from '../Form/FormToggle.svelte'
    import ProfileField from './ProfileField.svelte'

    // "Расширенное" of the profile (mockups "Расширенное", "приветствия"), the advanced
    // section of CharConfig split into small pages; `section` picks which one.

    interface Props {
        section: AdvancedSection
        onopen: (section: AdvancedSection, title: string) => void
    }

    let { section, onopen }: Props = $props()

    let char = $derived(session.getCharacter())
    let single = $derived(char?.type === 'character' ? (char as character) : null)
    let group = $derived(char?.type === 'group' ? (char as groupChat) : null)
    let chat = $derived(session.getChat())
    let showUnrecommended = $derived(!!DBState.db.showUnrecommended)

    // Fields CharConfig binds directly but that older cards may lack.
    $effect.pre(() => {
        if (!single) return
        single.additionalData ??= {}
        single.depth_prompt ??= { depth: 0, prompt: '' }
        single.bias ??= []
        single.alternateGreetings ??= []
    })

    function summary(text: string | undefined): string {
        return text && text.trim() ? language.mobileAdvanced.filled : language.mobileAdvanced.empty
    }

    function open(next: AdvancedSection, title: string) {
        onopen(next, title)
    }

    function moveGreeting(index: number, delta: number) {
        if (!single) return
        const list = single.alternateGreetings
        const to = index + delta
        if (to < 0 || to >= list.length) return
        ;[list[index], list[to]] = [list[to], list[index]]
        single.alternateGreetings = list
    }

    function removeGreeting(index: number) {
        if (!single) return
        // CharConfig resets the greeting pick when an alternate greeting goes away.
        single.chats[single.chatPage].fmIndex = -1
        single.alternateGreetings.splice(index, 1)
        single.alternateGreetings = single.alternateGreetings
    }

    function openMemory() {
        if (DBState.db.supaModelType !== 'none' && DBState.db.hypav2) {
            chat.hypaV2Data ??= { lastMainChunkID: 0, mainChunks: [], chunks: [] }
            showHypaV2Alert()
        } else if (DBState.db.hypaV3) {
            hypaV3ModalOpen.set(true)
        }
    }

    function convertToModule() {
        if (!single) return
        DBState.db.modules.push(convertCharacterToModule(single))
        alertNormal(language.successfullyConverted)
    }

    let hasHypa = $derived((DBState.db.supaModelType !== 'none' && DBState.db.hypav2) || DBState.db.hypaV3)
    let hasSupaText = $derived(!!chat?.supaMemoryData && chat.supaMemoryData.length > 4)
    let variablesCount = $derived(single ? [single.defaultVariables, single.translatorNote, single.customModuleToggle].filter((v) => v && v.trim()).length : 0)
</script>

{#if !char}
    <!-- nothing selected -->
{:else if section === 'root'}
    <div class="flex flex-col gap-4 pt-1">
        {#if single}
            <FormGroup label={language.mobileAdvanced.groupDialog}>
                <FormNav label={language.altGreet} value={String(single.alternateGreetings?.length ?? 0)} onclick={() => open('greetings', language.altGreet)} />
                <FormNav label={language.exampleMessage} value={summary(single.exampleMessage)} onclick={() => open('example', language.exampleMessage)} />
                <FormNav label={language.depthPrompt} value={`${single.depth_prompt?.depth ?? 0} · ${single.depth_prompt?.prompt?.trim() ? language.mobileAdvanced.filled : language.mobileAdvanced.off}`} onclick={() => open('depth', language.depthPrompt)} />
            </FormGroup>
            <FormGroup label={language.mobileAdvanced.groupPrompt}>
                <FormNav label={language.systemPrompt} value={summary(single.systemPrompt)} onclick={() => open('system', language.systemPrompt)} />
                <FormNav label={language.replaceGlobalNote} value={summary(single.replaceGlobalNote)} onclick={() => open('globalNote', language.replaceGlobalNote)} />
                <FormNav label={language.additionalText} value={summary(single.additionalText)} onclick={() => open('additional', language.additionalText)} />
                <FormNav label="Bias" value={String(single.bias?.length ?? 0)} onclick={() => open('bias', 'Bias')} />
                {#if showUnrecommended || single.personality?.length > 3 || single.scenario?.length > 3}
                    <FormNav label={`${language.personality} · ${language.scenario}`} value={summary((single.personality ?? '') + (single.scenario ?? ''))} onclick={() => open('personality', `${language.personality} · ${language.scenario}`)} />
                {/if}
            </FormGroup>
            <FormGroup label={language.mobileAdvanced.groupCard}>
                <FormNav label={language.creatorNotes} value={language.mobileAdvanced.languages.replace('{}', String(Object.keys(parseMultilangString(single.creatorNotes ?? '')).length))} onclick={() => open('creatorNotes', language.creatorNotes)} />
                <FormNav label={language.mobileAdvanced.authorVersion} value={[single.additionalData?.creator, single.additionalData?.character_version].filter(Boolean).join(' · ')} onclick={() => open('meta', language.mobileAdvanced.authorVersion)} />
                <FormNav label={language.mobileAdvanced.variables} value={language.mobileAdvanced.fields.replace('{}', String(variablesCount))} onclick={() => open('variables', language.mobileAdvanced.variables)} />
            </FormGroup>
            <FormGroup label={language.mobileAdvanced.groupBehavior}>
                <FormToggle label={language.lowLevelAccess} bind:checked={single.lowLevelAccess} />
                <FormToggle label={language.hideChatIcon} bind:checked={single.hideChatIcon} />
                <FormToggle label={language.utilityBot} bind:checked={single.utilityBot} />
                <FormToggle label={language.escapeOutput} bind:checked={single.escapeOutput} />
            </FormGroup>
            <FormGroup label={language.mobileAdvanced.groupTools}>
                {#if hasHypa}
                    <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px]" onclick={openMemory}><BrainIcon size={19} class="text-(--mc-text2)" />{DBState.db.hypav2 && DBState.db.supaModelType !== 'none' ? language.hypaMemoryV2Modal : language.hypaMemoryV3Modal}</button>
                {:else if hasSupaText}
                    <FormNav label={language.SuperMemory} onclick={() => open('memory', language.SuperMemory)} />
                {/if}
                <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px]" onclick={() => applyModule()}><PackageIcon size={19} class="text-(--mc-text2)" />{language.applyModule}</button>
                <button type="button" class="flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-[15px]" onclick={convertToModule}><PackagePlusIcon size={19} class="text-(--mc-text2)" />{language.convertToModule}</button>
            </FormGroup>
        {:else if group}
            {#if hasSupaText}
                <FormGroup><FormNav label={language.SuperMemory} onclick={() => open('memory', language.SuperMemory)} /></FormGroup>
            {/if}
            <FormGroup><FormToggle label={language.lowLevelAccess} bind:checked={group.lowLevelAccess} /></FormGroup>
        {/if}
    </div>
{:else if section === 'greetings' && single}
    <div class="flex flex-col gap-3 pt-1">
        <span class="px-1 text-[13px] leading-[18px] text-(--mc-text2)">{language.mobileAdvanced.greetingsHint}</span>
        {#each single.alternateGreetings as _, i (i)}
            <div class="flex flex-col gap-1.5 rounded-2xl px-3.5 py-2.5" style="background: var(--mc-group);">
                <span class="flex items-center justify-between">
                    <span class="text-[12px] text-(--mc-text2)">{language.mobileAdvanced.greeting.replace('{}', String(i + 1))}</span>
                    <span class="flex">
                        <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full text-(--mc-text2) disabled:opacity-30" disabled={i === 0} aria-label={language.mobileAdvanced.moveUp} onclick={() => moveGreeting(i, -1)}><ArrowUpIcon size={17} /></button>
                        <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full text-(--mc-text2) disabled:opacity-30" disabled={i === single.alternateGreetings.length - 1} aria-label={language.mobileAdvanced.moveDown} onclick={() => moveGreeting(i, 1)}><ArrowDownIcon size={17} /></button>
                        <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full" style="color: var(--mc-danger);" aria-label={language.mobileAdvanced.removeGreeting.replace('{}', String(i + 1))} onclick={() => removeGreeting(i)}><Trash2Icon size={16} /></button>
                    </span>
                </span>
                <textarea bind:value={single.alternateGreetings[i]} rows="3" class="resize-none border-0 bg-transparent text-[15px] leading-[22px] outline-none" style="color: var(--mc-text); field-sizing: content; max-height: 50dvh;"></textarea>
            </div>
        {:else}
            <span class="py-8 text-center text-[15px] text-(--mc-text2)">{language.mobileAdvanced.noGreetings}</span>
        {/each}
        <button type="button" class="flex min-h-[50px] items-center justify-center rounded-full text-[15px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={() => { single.alternateGreetings = [...single.alternateGreetings, ''] }}>{language.mobileAdvanced.addGreeting}</button>
    </div>
{:else if section === 'example' && single}
    <div class="pt-1"><ProfileField label={language.exampleMessage} bind:value={single.exampleMessage} minRows={10} /></div>
{:else if section === 'system' && single}
    <div class="pt-1"><ProfileField label={language.systemPrompt} bind:value={single.systemPrompt} minRows={10} /></div>
{:else if section === 'globalNote' && single}
    <div class="pt-1"><ProfileField label={language.replaceGlobalNote} bind:value={single.replaceGlobalNote} minRows={8} /></div>
{:else if section === 'additional' && single}
    <div class="pt-1"><ProfileField label={language.additionalText} bind:value={single.additionalText} minRows={8} /></div>
{:else if section === 'personality' && single}
    <div class="flex flex-col gap-3 pt-1">
        <ProfileField label={language.personality} bind:value={single.personality} minRows={6} />
        <ProfileField label={language.scenario} bind:value={single.scenario} minRows={6} />
    </div>
{:else if section === 'depth' && single}
    <div class="flex flex-col gap-3 pt-1">
        <FormGroup><FormNumber label={language.mobileAdvanced.depth} hint={language.mobileAdvanced.depthHint} bind:value={single.depth_prompt.depth} min={0} /></FormGroup>
        <ProfileField label={language.mobileAdvanced.depthText} bind:value={single.depth_prompt.prompt} minRows={6} />
    </div>
{:else if section === 'bias' && single}
    <div class="flex flex-col gap-3 pt-1">
        <span class="px-1 text-[13px] leading-[18px] text-(--mc-text2)">{language.mobileAdvanced.biasHint}</span>
        {#if single.bias.length === 0}
            <span class="py-6 text-center text-[15px] text-(--mc-text2)">{language.noBias}</span>
        {:else}
            <ul class="risu-mc-bias overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                {#each single.bias as _, i (i)}
                    <li class="flex items-center gap-2 py-1.5 pl-4 pr-1.5">
                        <input bind:value={single.bias[i][0]} placeholder={language.mobileAdvanced.biasText} aria-label={language.mobileAdvanced.biasText} class="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none" style="color: var(--mc-text);" />
                        <input type="number" inputmode="numeric" min="-100" max="100" bind:value={single.bias[i][1]} aria-label={language.mobileAdvanced.biasValue} class="w-16 border-0 bg-transparent text-right text-[15px] tabular-nums outline-none" style="color: var(--mc-text);" />
                        <button type="button" class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-(--mc-text2)" aria-label={language.mobileAdvanced.removeBias} onclick={() => { single.bias.splice(i, 1) }}><Trash2Icon size={18} /></button>
                    </li>
                {/each}
            </ul>
        {/if}
        <button type="button" class="flex min-h-[50px] items-center justify-center rounded-full text-[15px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent);" onclick={() => { single.bias.push(['', 0]) }}>{language.mobileAdvanced.addBias}</button>
    </div>
{:else if section === 'creatorNotes' && single}
    <div class="risu-mc-legacy pt-1">
        <MultiLangInput bind:value={single.creatorNotes} className="my-2" onInput={() => { single.removedQuotes = false }} />
    </div>
{:else if section === 'meta' && single}
    <div class="flex flex-col gap-3 pt-1">
        <FormGroup>
            <FormText label={language.creator} bind:value={single.additionalData.creator} />
            <FormText label={language.CharVersion} bind:value={single.additionalData.character_version} />
            <FormText label={language.nickname} bind:value={single.nickname} />
        </FormGroup>
    </div>
{:else if section === 'variables' && single}
    <div class="flex flex-col gap-3 pt-1">
        <ProfileField label={language.defaultVariables} bind:value={single.defaultVariables} tokens={false} minRows={4} />
        <ProfileField label={language.translatorNote} bind:value={single.translatorNote} tokens={false} minRows={4} />
        <ProfileField label={language.customPromptTemplateToggle} bind:value={single.customModuleToggle} tokens={false} minRows={4} />
    </div>
{:else if section === 'memory' && chat}
    <div class="pt-1"><ProfileField label={language.SuperMemory} bind:value={chat.supaMemoryData} tokens={false} minRows={10} /></div>
{/if}

<style>
    .risu-mc-bias > :global(li + li) {
        border-top: 1px solid var(--mc-line);
    }
</style>
