<script lang="ts">

  import { SettingsIcon, GlobeIcon, MessageSquareIcon, Volume2Icon, Braces, ActivityIcon, BookIcon, SmileIcon, UserIcon } from "@lucide/svelte";
  import { language } from "src/lang";
  import { haptic } from "src/ts/gui/haptics";
  import { CharConfigSubMenu, MobileGUIStack, MobileSideBar, selectedCharID } from "src/ts/stores.svelte";

  function switchTab(tab: number){
      haptic(4)
      MobileGUIStack.set(tab)
  }
</script>
{#if $selectedCharID === -1}

    <div class="w-full py-2 border-t border-t-darkborderc bg-darkbg flex items-stretch justify-center gap-2 text-textcolor2" style="padding-bottom: calc(0.5rem + var(--safe-bottom)); padding-left: calc(0.5rem + var(--safe-left)); padding-right: calc(0.5rem + var(--safe-right));">
        <button class="flex justify-center items-center flex-col gap-1 w-20 py-1 rounded-lg active:bg-selected active:scale-95 transition-all" class:text-textcolor={$MobileGUIStack === 0} onclick={() => switchTab(0)}>
            <GlobeIcon size={24} />
            <span class="text-xs">RisuRealm</span>
        </button>
        <button class="flex justify-center items-center flex-col gap-1 w-20 py-1 rounded-lg active:bg-selected active:scale-95 transition-all" class:text-textcolor={$MobileGUIStack === 1} onclick={() => switchTab(1)}>
            <MessageSquareIcon size={24} />
            <span class="text-xs truncate max-w-full">{language.character}</span>
        </button>
        <button class="flex justify-center items-center flex-col gap-1 w-20 py-1 rounded-lg active:bg-selected active:scale-95 transition-all" class:text-textcolor={$MobileGUIStack === 2} onclick={() => switchTab(2)}>
            <SettingsIcon size={24} />
            <span class="text-xs truncate max-w-full">{language.settings}</span>
        </button>
    </div>

{/if}

{#if $selectedCharID !== -1 && $MobileSideBar === 2}
    <div class="w-full py-2 border-t border-t-darkborderc bg-darkbg flex items-stretch justify-between gap-0.5 text-textcolor2" style="padding-bottom: calc(0.5rem + var(--safe-bottom)); padding-left: calc(0.25rem + var(--safe-left)); padding-right: calc(0.25rem + var(--safe-right));">
        <button class="flex flex-1 min-w-0 justify-center items-center flex-col gap-1 py-1 rounded-md active:bg-selected transition-colors" class:text-textcolor={$CharConfigSubMenu === 0} onclick={() => {
            CharConfigSubMenu.set(0)
        }}>
            <UserIcon size={22} />
            <span class="text-xs leading-tight truncate max-w-full w-full text-center">{language.basicInfo}</span>
        </button>
        <button class="flex flex-1 min-w-0 justify-center items-center flex-col gap-1 py-1 rounded-md active:bg-selected transition-colors" class:text-textcolor={$CharConfigSubMenu === 1} onclick={() => {
            CharConfigSubMenu.set(1)
        }}>
            <SmileIcon size={22} />
            <span class="text-xs leading-tight truncate max-w-full w-full text-center">{language.characterDisplay}</span>
        </button>
        <button class="flex flex-1 min-w-0 justify-center items-center flex-col gap-1 py-1 rounded-md active:bg-selected transition-colors" class:text-textcolor={$CharConfigSubMenu === 3} onclick={() => {
            CharConfigSubMenu.set(3)
        }}>
            <BookIcon size={22} />
            <span class="text-xs leading-tight truncate max-w-full w-full text-center">{language.loreBook}</span>
        </button>
        <button class="flex flex-1 min-w-0 justify-center items-center flex-col gap-1 py-1 rounded-md active:bg-selected transition-colors" class:text-textcolor={$CharConfigSubMenu === 5} onclick={() => {
            CharConfigSubMenu.set(5)
        }}>
            <Volume2Icon size={22} />
            <span class="text-xs leading-tight truncate max-w-full w-full text-center">TTS</span>
        </button>
        <button class="flex flex-1 min-w-0 justify-center items-center flex-col gap-1 py-1 rounded-md active:bg-selected transition-colors" class:text-textcolor={$CharConfigSubMenu === 4} onclick={() => {
            CharConfigSubMenu.set(4)
        }}>
            <Braces size={22} />
            <span class="text-xs leading-tight truncate max-w-full w-full text-center">{language.scripts}</span>
        </button>
        <button class="flex flex-1 min-w-0 justify-center items-center flex-col gap-1 py-1 rounded-md active:bg-selected transition-colors" class:text-textcolor={$CharConfigSubMenu === 2} onclick={() => {
            CharConfigSubMenu.set(2)
        }}>
            <ActivityIcon size={22} />
            <span class="text-xs leading-tight truncate max-w-full w-full text-center">{language.advanced}</span>
        </button>
    </div>
{/if}