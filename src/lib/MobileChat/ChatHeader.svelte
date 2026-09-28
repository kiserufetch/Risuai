<script lang="ts">
    import { ArrowLeftIcon, MenuIcon, SquarePenIcon } from '@lucide/svelte'
    import { language } from 'src/lang'
    import { getCharImage } from 'src/ts/characters'
    import { MobileSideBar, selectedCharID } from 'src/ts/stores.svelte'
    import * as session from 'src/ts/chatCore/session.svelte'
    import { createNewChat } from 'src/ts/chatCore/newChat'
    import { generationStatus } from 'src/ts/chatCore/generationStatus.svelte'
    import McIconButton from './McIconButton.svelte'

    // Glass header over the feed (spec §4.2).

    let { height = $bindable(0) }: { height?: number } = $props()

    let char = $derived(session.getCharacter())
    let chatName = $derived(session.getChat()?.name ?? '')
    let typing = $derived(generationStatus.running && generationStatus.charIndex === session.getCharacterIndex())
</script>

<header
    bind:clientHeight={height}
    class="risu-mc-header absolute inset-x-0 top-0 z-20 border-b"
    style="background: var(--mc-glass); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); border-color: color-mix(in oklab, var(--mc-line) 60%, transparent); padding-top: var(--safe-top, 0px); padding-left: var(--safe-left, 0px); padding-right: var(--safe-right, 0px);"
>
    <div class="flex h-14 items-center gap-1 px-1.5">
        <McIconButton label={language.goback} class="text-(--mc-text)" onclick={() => selectedCharID.set(-1)}>
            <ArrowLeftIcon size={22} />
        </McIconButton>
        <button type="button" class="flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 text-left active:opacity-70" onclick={() => MobileSideBar.set(2)}>
            {#await getCharImage(char?.image ?? '', 'css')}
                <span class="h-9 w-9 shrink-0 rounded-full" style="background: var(--mc-group);"></span>
            {:then css}
                <span class="h-9 w-9 shrink-0 rounded-full bg-cover bg-center" style="{css || 'background: var(--mc-group);'}"></span>
            {/await}
            <span class="flex min-w-0 flex-col">
                <span class="truncate text-[16px] font-semibold leading-tight" style="color: var(--mc-text);">{char?.name || 'Unnamed'}</span>
                {#if typing}
                    <span class="truncate text-[13px] leading-tight" style="color: var(--mc-accent);">{language.mobileChat.typing}</span>
                {:else if chatName}
                    <span class="truncate text-[13px] leading-tight text-(--mc-text2)">{chatName}</span>
                {/if}
            </span>
        </button>
        <McIconButton label={language.newChat} class="text-(--mc-text)" onclick={createNewChat}>
            <SquarePenIcon size={21} />
        </McIconButton>
        <McIconButton label={language.menu} class="text-(--mc-text)" onclick={() => MobileSideBar.set(1)}>
            <MenuIcon size={22} />
        </McIconButton>
    </div>
</header>
