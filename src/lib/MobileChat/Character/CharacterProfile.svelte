<script lang="ts">
    import { onMount } from 'svelte'
    import {
        BookIcon, ChevronLeftIcon, ChevronRightIcon, CodeIcon, NotebookPenIcon, PlusIcon, Share2Icon,
        SlidersHorizontalIcon, SmileIcon, ToggleRightIcon, UserIcon, UsersIcon, Volume2Icon, WrenchIcon,
    } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { alertConfirm } from 'src/ts/alert'
    import { getCharImage } from 'src/ts/characters'
    import { longpress } from 'src/ts/gui/longtouch'
    import { addGroupChar, rmCharFromGroup } from 'src/ts/process/group'
    import type { character, groupChat } from 'src/ts/storage/database.svelte'
    import { CharConfigSubMenu, DBState } from 'src/ts/stores.svelte'
    import { findCharacterbyId, getAuthorNoteDefaultText } from 'src/ts/util'
    import { pushBackHandler } from 'src/ts/chatCore/backStack'
    import * as session from 'src/ts/chatCore/session.svelte'
    import CharConfig from '../../SideBars/CharConfig.svelte'
    import DevTool from '../../SideBars/DevTool.svelte'
    import Toggles from '../../SideBars/Toggles.svelte'
    import ProfileField from './ProfileField.svelte'
    import ProfileAppearance from './ProfileAppearance.svelte'

    // Character profile (mockups "Профиль персонажа", "Основное", "Участники"): a
    // full-screen page over the chat with a small navigation stack. The big editors
    // (appearance, lorebook, voice, scripts, advanced, share) still render the old
    // CharConfig sections inside the new frame until they get their own rework.

    type Page =
        | { kind: 'root' }
        | { kind: 'basic' }
        | { kind: 'note' }
        | { kind: 'members' }
        | { kind: 'appearance' }
        | { kind: 'toggles' }
        | { kind: 'debug' }
        | { kind: 'legacy'; section: number; title: string }

    let { onclose }: { onclose: () => void } = $props()

    let stack: Page[] = $state([{ kind: 'root' }])
    let page = $derived(stack[stack.length - 1])

    let char = $derived(session.getCharacter())
    let group = $derived(char?.type === 'group' ? (char as groupChat) : null)
    let single = $derived(char?.type === 'character' ? (char as character) : null)
    let chat = $derived(session.getChat())
    let isPrivate = $derived(single?.license === 'private')

    function push(next: Page) {
        if (next.kind === 'legacy') {
            CharConfigSubMenu.set(next.section)
        }
        stack = [...stack, next]
    }

    function back() {
        if (stack.length > 1) {
            stack = stack.slice(0, -1)
        } else {
            onclose()
        }
    }

    // One history entry for the whole profile: the header arrow moves between pages
    // without touching history, the system back pops a page and re-arms itself.
    let release: (() => void) | null = null

    function onSystemBack() {
        release = null
        if (stack.length > 1) {
            stack = stack.slice(0, -1)
            release = pushBackHandler(onSystemBack)
        } else {
            onclose()
        }
    }

    onMount(() => {
        release = pushBackHandler(onSystemBack)
        return () => release?.()
    })

    function title(p: Page): string {
        switch (p.kind) {
            case 'basic': return language.mobileProfile.basic
            case 'note': return language.mobileProfile.note
            case 'members': return language.mobileProfile.members
            case 'appearance': return language.mobileProfile.appearance
            case 'toggles': return language.mobileProfile.toggles
            case 'debug': return language.mobileProfile.debug
            case 'legacy': return p.title
            default: return ''
        }
    }

    function memberName(id: string): string {
        return findCharacterbyId(id)?.name ?? ''
    }

    async function removeMember(index: number) {
        if (await alertConfirm(language.mobileProfile.removeMemberConfirm.replace('{}', memberName(group?.characters[index] ?? '')))) {
            rmCharFromGroup(index)
        }
    }
</script>

{#snippet row(icon: typeof UserIcon, label: string, hint: string, next: Page)}
    {@const Icon = icon}
    <button type="button" class="flex min-h-14 w-full items-center gap-3 px-4 text-left text-[15px] active:opacity-70" onclick={() => push(next)}>
        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style="background: var(--mc-accent-soft); color: var(--mc-accent);"><Icon size={18} /></span>
        <span class="min-w-0 flex-1 truncate">{label}</span>
        {#if hint}<span class="ml-auto max-w-[48%] truncate text-right text-[13px] text-(--mc-text2)">{hint}</span>{/if}
        <ChevronRightIcon size={18} class="shrink-0 text-(--mc-text2)" />
    </button>
{/snippet}

{#snippet group_(children: import('svelte').Snippet)}
    <div class="risu-mc-group overflow-hidden rounded-2xl" style="background: var(--mc-group);">{@render children()}</div>
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
<section role="dialog" aria-modal="true" aria-label={char?.name ?? ''} class="risu-mc-profile risu-mc-slide-up fixed inset-0 z-40 flex flex-col" style="background: var(--mc-bg); color: var(--mc-text); padding-top: var(--safe-top, 0px);">
    <header class="flex h-14 shrink-0 items-center gap-1 px-1.5">
        <button type="button" class="flex h-11 w-11 items-center justify-center rounded-full" aria-label={stack.length > 1 ? language.goback : language.mobileProfile.backToChat} onclick={back}>
            <ChevronLeftIcon size={24} />
        </button>
        <span class="min-w-0 flex-1 truncate text-[17px] font-semibold">{title(page)}</span>
        {#if page.kind === 'root' && single && !isPrivate}
            <button type="button" class="flex h-11 w-11 items-center justify-center rounded-full" aria-label={language.mobileProfile.share} onclick={() => push({ kind: 'legacy', section: 6, title: language.mobileProfile.share })}>
                <Share2Icon size={20} />
            </button>
        {/if}
        {#if page.kind === 'members'}
            <button type="button" class="flex h-11 w-11 items-center justify-center rounded-full" style="color: var(--mc-accent);" aria-label={language.mobileProfile.addMember} onclick={() => addGroupChar()}>
                <PlusIcon size={22} />
            </button>
        {/if}
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4" style="padding-bottom: calc(24px + var(--safe-bottom, 0px));">
        {#if !char}
            <!-- The character went away (deleted elsewhere). -->
        {:else if page.kind === 'root'}
            <div class="flex flex-col items-center gap-2 pb-5 pt-1">
                {#await getCharImage(char.image ?? '', 'css') then css}
                    <span class="h-24 w-24 rounded-full bg-cover bg-center" style={css || 'background: var(--mc-group);'}></span>
                {/await}
                <span class="max-w-full truncate text-[24px] font-bold tracking-tight">{char.name || 'Unnamed'}</span>
                <span class="text-[14px] text-(--mc-text2)">{language.mobileDialogs.chatsCount.replace('{}', String(char.chats.length))}</span>
            </div>
            <div class="flex flex-col gap-4">
                {#snippet first()}
                    {@render row(UserIcon, language.mobileProfile.basic, language.mobileProfile.basicHint, { kind: 'basic' })}
                    {#if group}
                        <div class="h-px" style="background: var(--mc-line); margin-left: 60px;"></div>
                        {@render row(UsersIcon, language.mobileProfile.members, String(group.characters.length), { kind: 'members' })}
                    {/if}
                    <div class="h-px" style="background: var(--mc-line); margin-left: 60px;"></div>
                    {@render row(NotebookPenIcon, language.mobileProfile.note, language.mobileProfile.noteHint, { kind: 'note' })}
                    {#if !isPrivate}
                        <div class="h-px" style="background: var(--mc-line); margin-left: 60px;"></div>
                        {@render row(SmileIcon, language.mobileProfile.appearance, language.mobileProfile.appearanceHint, { kind: 'appearance' })}
                    {/if}
                {/snippet}
                {@render group_(first)}
                {#if !isPrivate}
                    {#snippet second()}
                        {@render row(BookIcon, language.mobileProfile.lorebook, '', { kind: 'legacy', section: 3, title: language.mobileProfile.lorebook })}
                        {#if single}
                            <div class="h-px" style="background: var(--mc-line); margin-left: 60px;"></div>
                            {@render row(Volume2Icon, language.mobileProfile.tts, '', { kind: 'legacy', section: 5, title: language.mobileProfile.tts })}
                            <div class="h-px" style="background: var(--mc-line); margin-left: 60px;"></div>
                            {@render row(CodeIcon, language.mobileProfile.scripts, language.mobileProfile.scriptsHint, { kind: 'legacy', section: 4, title: language.mobileProfile.scripts })}
                        {/if}
                    {/snippet}
                    {@render group_(second)}
                {/if}
                {#snippet third()}
                    {#if !isPrivate}
                        {@render row(SlidersHorizontalIcon, language.mobileProfile.advanced, language.mobileProfile.advancedHint, { kind: 'legacy', section: 2, title: language.mobileProfile.advanced })}
                        <div class="h-px" style="background: var(--mc-line); margin-left: 60px;"></div>
                    {/if}
                    {@render row(ToggleRightIcon, language.mobileProfile.toggles, '', { kind: 'toggles' })}
                    <div class="h-px" style="background: var(--mc-line); margin-left: 60px;"></div>
                    {@render row(WrenchIcon, language.mobileProfile.debug, '', { kind: 'debug' })}
                {/snippet}
                {@render group_(third)}
            </div>
        {:else if page.kind === 'basic'}
            <div class="flex flex-col gap-3 pt-1">
                <label class="flex flex-col gap-1.5 rounded-2xl px-3.5 py-3" style="background: var(--mc-group);">
                    <span class="text-[12px] text-(--mc-text2)">{group ? language.mobileProfile.groupName : language.mobileProfile.name}</span>
                    <input bind:value={char.name} class="border-0 bg-transparent text-[17px] font-semibold outline-none" style="color: var(--mc-text);" />
                </label>
                {#if single && !isPrivate}
                    <ProfileField label={language.mobileProfile.description} bind:value={single.desc} minRows={6} />
                    <ProfileField label={language.mobileProfile.firstMessage} bind:value={single.firstMessage} minRows={4} />
                    <button type="button" class="flex min-h-[52px] items-center gap-3 rounded-2xl px-4 text-left text-[15px]" style="background: var(--mc-group);" onclick={() => push({ kind: 'legacy', section: 2, title: language.mobileProfile.advanced })}>
                        <span class="flex-1">{language.mobileProfile.altGreetings}</span>
                        <span class="text-[13px] text-(--mc-text2)">{single.alternateGreetings?.length ?? 0}</span>
                        <ChevronRightIcon size={18} class="text-(--mc-text2)" />
                    </button>
                {/if}
            </div>
        {:else if page.kind === 'note'}
            <div class="pt-1">
                {#if chat}
                    <ProfileField label={language.mobileProfile.note} bind:value={chat.note} placeholder={getAuthorNoteDefaultText()} minRows={8} />
                {/if}
            </div>
        {:else if page.kind === 'members' && group}
            <div class="flex flex-col gap-3 pt-1">
                {#if group.characters.length === 0}
                    <span class="py-10 text-center text-[15px] text-(--mc-text2)">{language.mobileProfile.noMembers}</span>
                {:else}
                    <ul class="risu-mc-group overflow-hidden rounded-2xl" style="background: var(--mc-group);">
                        {#each group.characters as member, i (member)}
                            {@const found = findCharacterbyId(member)}
                            <li class="flex flex-col gap-2.5 px-3.5 py-3" use:longpress={() => removeMember(i)}>
                                <div class="flex items-center gap-3">
                                    {#await getCharImage(found?.image ?? '', 'css') then css}
                                        <span class="h-10 w-10 shrink-0 rounded-full bg-cover bg-center" style={css || 'background: var(--mc-surface);'}></span>
                                    {/await}
                                    <span class="min-w-0 flex-1 truncate text-[16px] font-semibold">{found?.name ?? member}</span>
                                    <button type="button" role="switch" aria-checked={group.characterActive[i]} aria-label="{language.mobileProfile.active}: {found?.name ?? ''}" class="relative h-[26px] w-[44px] shrink-0 rounded-full transition-colors" style="background: {group.characterActive[i] ? 'var(--mc-accent)' : 'var(--mc-line)'};" onclick={() => { group.characterActive[i] = !group.characterActive[i] }}>
                                        <span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all" style="left: {group.characterActive[i] ? '21px' : '3px'};"></span>
                                    </button>
                                </div>
                                <div class="flex items-center gap-2.5">
                                    <span class="w-[104px] shrink-0 text-[12px] text-(--mc-text2)">{language.mobileProfile.talkativeness}</span>
                                    <span class="flex flex-1 gap-1" role="radiogroup" aria-label={language.mobileProfile.talkativeness}>
                                        {#each [1, 2, 3, 4, 5, 6] as level (level)}
                                            {@const on = group.characterTalks[i] >= level / 6 - 0.0001}
                                            <button type="button" role="radio" aria-checked={Math.round(group.characterTalks[i] * 6) === level} aria-label={String(level)} class="flex h-8 flex-1 items-center" onclick={() => { group.characterTalks[i] = level / 6 }}>
                                                <span class="h-2 w-full rounded-full" style="background: {on ? 'var(--mc-accent)' : 'var(--mc-line)'};"></span>
                                            </button>
                                        {/each}
                                    </span>
                                </div>
                            </li>
                        {/each}
                    </ul>
                {/if}
                <button type="button" role="switch" aria-checked={!!group.orderByOrder} class="flex min-h-[52px] items-center gap-3 rounded-2xl px-4 py-2 text-left" style="background: var(--mc-group);" onclick={() => { group.orderByOrder = !group.orderByOrder }}>
                    <span class="flex flex-1 flex-col gap-0.5"><span class="text-[15px]">{language.mobileProfile.orderByOrder}</span><span class="text-[12px] text-(--mc-text2)">{language.mobileProfile.orderHint}</span></span>
                    <span class="relative h-[26px] w-[44px] shrink-0 rounded-full" style="background: {group.orderByOrder ? 'var(--mc-accent)' : 'var(--mc-line)'};"><span class="absolute top-[3px] h-5 w-5 rounded-full bg-white shadow" style="left: {group.orderByOrder ? '21px' : '3px'};"></span></span>
                </button>
                {#if group.characters.length > 0}
                    <span class="px-2 text-[13px] text-(--mc-text2)">{language.mobileProfile.removeMemberHint}</span>
                {/if}
            </div>
        {:else if page.kind === 'appearance'}
            <ProfileAppearance />
        {:else if page.kind === 'toggles'}
            <div class="risu-mc-legacy pt-2"><Toggles bind:chara={DBState.db.characters[session.getCharacterIndex()]} /></div>
        {:else if page.kind === 'debug'}
            <div class="risu-mc-legacy flex flex-col pt-2"><DevTool /></div>
        {:else if page.kind === 'legacy'}
            <div class="risu-mc-legacy flex flex-col pt-2">
                {#key page.section}
                    <CharConfig />
                {/key}
            </div>
        {/if}
    </div>
</section>

<style>
    .risu-mc-group > :global(li + li) {
        border-top: 1px solid var(--mc-line);
    }
</style>
