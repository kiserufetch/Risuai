<script lang="ts">
    import { CameraIcon, CheckIcon, Share2Icon, Trash2Icon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import FormGroup from 'src/lib/MobileChat/Form/FormGroup.svelte'
    import FormText from 'src/lib/MobileChat/Form/FormText.svelte'
    import FormToggle from 'src/lib/MobileChat/Form/FormToggle.svelte'
    import { changeUserPersona } from 'src/ts/persona'
    import { DBState } from 'src/ts/stores.svelte'
    import { tokenizeAccurate } from 'src/ts/tokenizer'
    import PersonaAvatar from './PersonaAvatar.svelte'
    import { boundChats, exportPersona, getField, personaPage, pickPhoto, removePersona, setField } from './personas.svelte'

    // Mockup "Персона · редактор": any persona, active or not. Photo, name, note (when the
    // persona note option is on), description with a token count, large portrait.

    const t = $derived(language.mobilePersona)

    let i = $derived(personaPage.index)
    let active = $derived(i === DBState.db.selectedPersona)
    let persona = $derived(DBState.db.personas[i])
    let chats = $derived(boundChats(i))

    let tokens = $state(0)
    $effect(() => {
        tokenizeAccurate(getField(i, 'personaPrompt'), true).then((n) => { tokens = n })
    })

    async function remove() {
        if (await removePersona(i)) personaPage.current = 'list'
    }
</script>

{#if persona}
    <div class="flex flex-col gap-4">
        <div class="flex flex-col items-center gap-2.5 py-2">
            <button type="button" class="relative" aria-label={t.changePhoto} onclick={() => pickPhoto(i)}>
                <PersonaAvatar icon={getField(i, 'icon')} size={112} radius={30} large={!!persona.largePortrait} />
                <span class="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-[3px] text-white" style="background: var(--mc-accent); border-color: var(--mc-bg);"><CameraIcon size={16} /></span>
            </button>
            <span class="flex flex-wrap justify-center gap-1.5">
                {#if active}<span class="rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style="background: var(--mc-accent-soft); color: var(--mc-accent);">{t.active}</span>{/if}
                {#if chats}<span class="rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-(--mc-text2)" style="background: var(--mc-line);">{t.boundChats.replace('{}', String(chats))}</span>{/if}
            </span>
        </div>

        <FormGroup>
            <FormText label={language.name} bind:value={() => getField(i, 'name'), (v) => setField(i, 'name', v)} placeholder="User" />
            {#if DBState.db.personaNote}
                <FormText label={language.note} bind:value={() => getField(i, 'note'), (v) => setField(i, 'note', v)} placeholder={t.notePlaceholder} />
            {/if}
        </FormGroup>

        <label class="flex flex-col gap-2 rounded-2xl border px-3.5 py-3" style="background: color-mix(in oklab, var(--mc-bg) 70%, black); border-color: var(--mc-line);">
            <span class="flex justify-between text-[12px] text-(--mc-text2)"><span>{language.description}</span><span class="tabular-nums">{t.tokens.replace('{}', String(tokens))}</span></span>
            <textarea
                value={getField(i, 'personaPrompt')}
                oninput={(e) => setField(i, 'personaPrompt', (e.currentTarget as HTMLTextAreaElement).value)}
                placeholder={t.descriptionPlaceholder}
                rows="8"
                class="resize-none border-0 bg-transparent text-[15px] leading-[22px] outline-none"
                style="color: var(--mc-text); field-sizing: content; max-height: 60dvh;"
            ></textarea>
        </label>

        <FormGroup>
            <FormToggle label={language.largePortrait} hint={t.largePortraitHint} bind:checked={() => !!persona.largePortrait, (v) => { persona.largePortrait = v }} />
        </FormGroup>

        <div class="grid gap-2" class:grid-cols-3={!active} class:grid-cols-2={active}>
            {#if !active}
                <button type="button" class="flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold" style="background: var(--mc-accent); color: var(--mc-on-accent, #fff);" onclick={() => changeUserPersona(i)}><CheckIcon size={16} />{t.makeActiveShort}</button>
            {/if}
            <button type="button" class="flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold" style="background: var(--mc-line);" onclick={() => exportPersona(i)}><Share2Icon size={16} />{language.mobileBot.export}</button>
            <button type="button" class="flex h-11 items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold" style="background: color-mix(in oklab, var(--mc-danger) 14%, transparent); color: var(--mc-danger);" onclick={remove}><Trash2Icon size={16} />{language.mobileBot.remove}</button>
        </div>
    </div>
{/if}
