<script lang="ts">
    import { ArrowLeft, MenuIcon, SquarePenIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import { v4 } from "uuid";

    import { DBState } from 'src/ts/stores.svelte';
    import { MobileGUIStack, MobileSearch, ReloadGUIPointer, selectedCharID, SettingsMenuIndex, MobileSideBar } from "src/ts/stores.svelte";
    import { getCharImage } from "src/ts/characters";
    import { changeChatTo } from "src/ts/globalApi.svelte";
    import { findCharacterbyId } from "src/ts/util";
    import { haptic } from "src/ts/gui/haptics";

    // Comfortable ~44px touch target for header nav actions (Apple HIG / WCAG AAA).
    const navButton = "flex items-center justify-center h-11 w-11 -mx-1 shrink-0 rounded-full text-textcolor hover:bg-selected active:bg-selected transition-colors"

    let currentChar = $derived(DBState.db.characters[$selectedCharID])
    let currentChatName = $derived(currentChar?.chats?.[currentChar.chatPage]?.name ?? '')

    function newChat(){
        const cha = currentChar
        if(!cha) return
        haptic(6)
        const len = cha.chats.length
        let chats = cha.chats
        chats.unshift({
            message:[], note:'', name:`New Chat ${len + 1}`, localLore:[], fmIndex: -1, id: v4()
        })
        if(cha.type === 'group'){
            cha.characters.map((c) => {
                chats[0].message.push({
                    saying: c,
                    role: 'char',
                    data: findCharacterbyId(c).firstMessage
                })
            })
        }
        cha.chats = chats
        changeChatTo(0)
        MobileSideBar.set(0)
        $ReloadGUIPointer += 1
    }
</script>
<div class="w-full px-4 h-16 border-b border-b-darkborderc bg-darkbg flex justify-start items-center gap-2" style="height: calc(4rem + var(--safe-top)); padding-top: var(--safe-top); padding-left: calc(1rem + var(--safe-left)); padding-right: calc(1rem + var(--safe-right));">
    {#if $selectedCharID !== -1 && $MobileSideBar > 0}
        <button class={navButton} aria-label={language.goback} onclick={() => {
            MobileSideBar.set(0)
        }}>
            <ArrowLeft />
        </button>
        <span class="font-bold text-lg w-2/3 truncate">{language.menu}</span>
    {:else if $selectedCharID !== -1}
        <button class={navButton} aria-label={language.goback} onclick={() => {
            selectedCharID.set(-1)
        }}>
            <ArrowLeft />
        </button>
        <!-- Character identity: avatar + name + current chat, tap opens character config -->
        <button class="flex items-center gap-2.5 flex-1 min-w-0 rounded-lg px-1 py-1 -my-1 active:bg-selected transition-colors text-left" onclick={() => {
            MobileSideBar.set(2)
        }}>
            {#await getCharImage(currentChar?.image, 'css') then css}
                {#if css}
                    <div class="h-9 w-9 min-w-9 rounded-full shadow-sm" style={css}></div>
                {:else}
                    <div class="h-9 w-9 min-w-9 rounded-full bg-selected"></div>
                {/if}
            {/await}
            <span class="flex flex-col min-w-0">
                <span class="font-bold text-base leading-tight truncate">{currentChar?.name}</span>
                {#if currentChatName}
                    <span class="text-xs text-textcolor2 leading-tight truncate">{currentChatName}</span>
                {/if}
            </span>
        </button>
        <div class="flex justify-end shrink-0">
            <button class={navButton} aria-label={language.newChat} onclick={newChat}>
                <SquarePenIcon size={22} />
            </button>
            <button class={navButton} aria-label={language.menu} onclick={() => {
                MobileSideBar.set(1)
            }}>
                <MenuIcon />
            </button>
        </div>
    {:else if $MobileGUIStack === 2 && $SettingsMenuIndex > -1}
        <button class={navButton} aria-label={language.goback} onclick={() => {
            SettingsMenuIndex.set(-1)
        }}>
            <ArrowLeft />
        </button>
        <span class="font-bold text-lg">Risuai</span>
    {:else if $MobileGUIStack === 1}
        <div class="flex items-stretch w-2xl max-w-full">
            <input placeholder={language.search + '...'} bind:value={$MobileSearch} class="peer focus:border-textcolor transition-colors outline-hidden text-textcolor p-2 min-w-0 border bg-transparent rounded-md input-text text-xl grow mx-4 border-darkborderc resize-none overflow-y-hidden overflow-x-hidden max-w-full">
        </div>
    {:else}
        <span class="font-bold text-lg">Risuai</span>

    {/if}
</div>
