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

<div class="w-full flex-1 overflow-y-auto bg-bgcolor relative">
    {#if $selectedCharID !== -1}
        <ChatScreen />
        {#if $MobileSideBar > 0}
            <!-- In-chat menu as an overlay panel: the conversation stays visible
                 behind it instead of being swapped out (ChatGPT-style drawer). -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="absolute inset-0 z-40 bg-black/50 risu-mobile-drawer-backdrop" onclick={() => {
                MobileSideBar.set(0)
            }}></div>
            <div class="absolute inset-y-0 right-0 z-40 w-[88%] max-w-sm bg-bgcolor border-l border-darkborderc flex flex-col risu-mobile-drawer">
                {#if !$isLite}
                    <div class="w-full px-2 text-textcolor2 border-b border-b-darkborderc bg-darkbg flex justify-start items-stretch gap-1 shrink-0">
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
                <div class="flex-1 overflow-y-auto overscroll-contain">
                    <div class="w-full flex flex-col p-2 mt-2 h-full">
                        {#if $MobileSideBar === 1}
                            <SideChatList bind:chara={DBState.db.characters[$selectedCharID]} />
                        {:else if $MobileSideBar === 2}
                            <CharConfig />
                        {:else if $MobileSideBar === 3}
                            <DevTool />
                        {/if}
                    </div>
                </div>
            </div>
        {/if}
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

<style>
    .risu-mobile-drawer {
        box-shadow: -8px 0 24px rgba(0, 0, 0, 0.35);
        animation: risu-drawer-in 0.22s ease-out;
    }
    .risu-mobile-drawer-backdrop {
        animation: risu-drawer-fade 0.22s ease-out;
    }
    @keyframes risu-drawer-in {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
    }
    @keyframes risu-drawer-fade {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @media (prefers-reduced-motion: reduce) {
        .risu-mobile-drawer,
        .risu-mobile-drawer-backdrop { animation: none; }
    }
</style>
