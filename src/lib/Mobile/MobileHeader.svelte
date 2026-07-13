<script lang="ts">
    import { ArrowLeft, MenuIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { MobileGUIStack, MobileSearch, selectedCharID, SettingsMenuIndex, MobileSideBar } from "src/ts/stores.svelte";

    // Comfortable ~44px touch target for header nav actions (Apple HIG / WCAG AAA).
    const navButton = "flex items-center justify-center h-11 w-11 -mx-1 shrink-0 rounded-md text-textcolor hover:bg-selected active:bg-selected transition-colors"
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
        <span class="font-bold text-lg w-2/3 truncate">{DBState.db.characters[$selectedCharID].name}</span>
        <div class="flex-1 flex justify-end">
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