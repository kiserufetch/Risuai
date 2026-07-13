<script lang="ts">
    import { MobileGUIStack, MobileSideBar, OpenSpicyChatStore, selectedCharID } from "src/ts/stores.svelte";
    import Settings from "../Setting/Settings.svelte";
    import RealmMain from "../UI/Realm/RealmMain.svelte";
    import SpicyChatMain from "../UI/SpicyChat/SpicyChatMain.svelte";
    import MobileCharacters from "./MobileCharacters.svelte";
    import ChatScreen from "../ChatScreens/ChatScreen.svelte";
    import CharConfig from "../SideBars/CharConfig.svelte";
    import { WrenchIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import SideChatList from "../SideBars/SideChatList.svelte";
    import DevTool from "../SideBars/DevTool.svelte";
    import { isLite } from "src/ts/lite";
    
    import { DBState } from 'src/ts/stores.svelte';
</script>

{#if $MobileSideBar > 0 && !$isLite}
<div class="w-full px-2 text-textcolor2 border-b border-b-darkborderc bg-darkbg flex justify-start items-stretch gap-1">
    <button class="flex-1 flex justify-center items-center py-2.5 border-r border-r-darkborderc active:bg-selected transition-colors" class:text-textcolor={$MobileSideBar === 1} onclick={() => {
        $MobileSideBar = 1
    }}>
        {language.Chat}
    </button>
    <button class="flex-1 flex justify-center items-center py-2.5 border-r border-r-darkborderc active:bg-selected transition-colors" class:text-textcolor={$MobileSideBar === 2} onclick={() => {
        $MobileSideBar = 2
    }}>
        {language.character}
    </button>
    <button class="flex justify-center items-center px-5 py-2.5 active:bg-selected transition-colors" class:text-textcolor={$MobileSideBar === 3} onclick={() => {
        $MobileSideBar = 3
    }}>
        <WrenchIcon size={18} />
    </button>
</div>
{/if}
<div class="w-full flex-1 overflow-y-auto bg-bgcolor relative">
    {#if $MobileSideBar > 0}
        <div class="w-full flex flex-col p-2 mt-2 h-full">
            {#if $MobileSideBar === 1}
                <SideChatList bind:chara={DBState.db.characters[$selectedCharID]} />
            {:else if $MobileSideBar === 2}
                <CharConfig />
            {:else if $MobileSideBar === 3}
                <DevTool />
            {/if}
        </div>
    {:else if $selectedCharID !== -1}
        <ChatScreen />
    {:else if $MobileGUIStack === 0}
        {#if $OpenSpicyChatStore}
            <SpicyChatMain />
        {:else}
            <RealmMain />
        {/if}
    {:else if $MobileGUIStack === 1}
        <MobileCharacters />
    {:else if $MobileGUIStack === 2}
        <Settings />
    {/if}
</div>