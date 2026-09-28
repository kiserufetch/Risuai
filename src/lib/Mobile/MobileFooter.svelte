<script lang="ts">

  import { SettingsIcon, LayoutGridIcon, MessagesSquareIcon, Volume2Icon, Braces, ActivityIcon, BookIcon, SmileIcon, UserIcon } from "@lucide/svelte";
  import { language } from "src/lang";
  import { haptic } from "src/ts/gui/haptics";
  import { CharConfigSubMenu, MobileGUIStack, MobileSideBar, selectedCharID } from "src/ts/stores.svelte";

  const tabs = [
      { id: 0, icon: LayoutGridIcon, label: () => language.mobileCatalog.title },
      { id: 1, icon: MessagesSquareIcon, label: () => language.mobileDialogs.title },
      { id: 2, icon: SettingsIcon, label: () => language.settings },
  ]

  function switchTab(tab: number){
      haptic(4)
      MobileGUIStack.set(tab)
  }
</script>
{#if $selectedCharID === -1}
    <!-- Floating tab capsule (mockup "Мобильные диалоги", variant B). The active tab
         widens and shows its label; screens reserve room for it at their bottom. -->
    <nav
        aria-label={language.mobileDialogs.sections}
        class="risu-mc-screen risu-mc-tabbar fixed z-30 flex h-16 items-center gap-1 rounded-full border p-1.5"
        style="left: calc(24px + var(--safe-left, 0px)); right: calc(24px + var(--safe-right, 0px)); bottom: calc(16px + var(--safe-bottom, 0px)); background: color-mix(in oklab, var(--mc-surface) 82%, transparent); -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px); border-color: var(--mc-line); box-shadow: 0 10px 30px rgb(0 0 0 / 0.45);"
    >
        {#each tabs as tab (tab.id)}
            {@const active = $MobileGUIStack === tab.id}
            <button
                type="button"
                aria-label={tab.label()}
                aria-current={active ? 'page' : undefined}
                class="flex h-[52px] min-w-0 items-center justify-center gap-2 rounded-full transition-all active:scale-95"
                style={active ? 'flex: 1.6; background: var(--mc-accent); color: var(--mc-on-accent);' : 'flex: 1; color: var(--mc-text2);'}
                onclick={() => switchTab(tab.id)}
            >
                <tab.icon size={22} />
                {#if active}
                    <span class="truncate text-[14px] font-semibold">{tab.label()}</span>
                {/if}
            </button>
        {/each}
    </nav>
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